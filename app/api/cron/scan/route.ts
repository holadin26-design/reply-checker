import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase'
import { fetchReplies } from '@/lib/imap'
import { classifyReply } from '@/lib/openai'
import { sendNotificationEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  // Validate Vercel Cron Secret to ensure only Vercel can trigger this route
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createSupabaseAdminClient()

  // Fetch all connected mailboxes across all users
  const { data: accounts } = await admin
    .from('mailboxes')
    .select('*')

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ message: 'No accounts to scan' })
  }

  // Create a map to group new replies by user_id to send one email per user
  const userReplies: Record<string, any[]> = {}
  
  // Fetch profiles early to prepare for notifications
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, notification_email')
    
  const profileMap = new Map((profiles || []).map(p => [p.id, p]))

  let totalScanned = 0
  let totalNewReplies = 0

  // Iterate over every connected inbox to scan for replies
  for (const account of accounts) {
    try {
      const messages = await fetchReplies(
        account.imap_host,
        account.imap_port,
        account.email_address,
        account.password,
        account.last_scanned_at
      )

      for (const msg of messages) {
        // Skip if already processed and stored in the database
        const { data: existing } = await admin
          .from('replies')
          .select('id')
          .eq('message_id', msg.message_id)
          .single()

        if (existing) continue

        // Use OpenAI to classify if the reply is positive
        const classification = await classifyReply({
          from_name: msg.from_name,
          from_email: msg.from_email,
          subject: msg.subject,
          body: msg.body,
        })

        const reply = {
          user_id: account.user_id,
          mailbox_id: account.id,
          ...msg,
          is_positive: classification.is_positive,
          ai_reasoning: classification.reasoning,
          notified: false,
        }

        await admin.from('replies').insert(reply)

        // Queue positive replies to send in notification email
        if (classification.is_positive) {
          totalNewReplies++
          if (!userReplies[account.user_id]) {
            userReplies[account.user_id] = []
          }
          userReplies[account.user_id].push({ ...reply, gmail_address: account.email_address })
        }
      }

      // Store the last scanned timestamp backward from current time
      await admin
        .from('mailboxes')
        .update({ last_scanned_at: new Date().toISOString() })
        .eq('id', account.id)

      totalScanned++
    } catch (err) {
      console.error(`Error scanning mailbox ${account.email_address}:`, err)
    }
  }

  // Bulk send notifications per user
  for (const [userId, newReplies] of Object.entries(userReplies)) {
    if (newReplies.length > 0) {
      const profile = profileMap.get(userId)
      if (profile?.notification_email) {
        try {
          await sendNotificationEmail(profile.notification_email, newReplies)
        } catch (err) {
          console.error(`Failed to send email to ${profile.notification_email}`, err)
        }
      }
    }
  }

  return NextResponse.json({
    scannedAccounts: totalScanned,
    newPositiveReplies: totalNewReplies,
  })
}
