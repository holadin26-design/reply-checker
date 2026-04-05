import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { fetchReplies } from '@/lib/imap'
import { classifyReply } from '@/lib/openai'
import { sendNotificationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createSupabaseAdminClient()

  // Fetch all connected mailboxes for this user
  const { data: accounts } = await admin
    .from('mailboxes')
    .select('*')
    .eq('user_id', user.id)

  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: 'No accounts connected' }, { status: 400 })
  }

  // Get user's notification email
  const { data: profile } = await admin
    .from('profiles')
    .select('notification_email')
    .eq('id', user.id)
    .single()

  const newReplies: any[] = []

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
        // Skip if already stored
        const { data: existing } = await admin
          .from('replies')
          .select('id')
          .eq('message_id', msg.message_id)
          .single()

        if (existing) continue

        // Classify with OpenAI
        const classification = await classifyReply({
          from_name: msg.from_name,
          from_email: msg.from_email,
          subject: msg.subject,
          body: msg.body,
        })

        const reply = {
          user_id: user.id,
          mailbox_id: account.id,
          ...msg,
          is_positive: classification.is_positive,
          ai_reasoning: classification.reasoning,
          notified: false,
        }

        await admin.from('replies').insert(reply)

        if (classification.is_positive) {
          newReplies.push({ ...reply, gmail_address: account.email_address })
        }
      }

      // Update last scanned timestamp
      await admin
        .from('mailboxes')
        .update({ last_scanned_at: new Date().toISOString() })
        .eq('id', account.id)

    } catch (err) {
      console.error(`Error scanning ${account.email_address}:`, err)
    }
  }

  // Send notification email if there are new positive replies
  if (newReplies.length > 0 && profile?.notification_email) {
    await sendNotificationEmail(profile.notification_email, newReplies)
  }

  return NextResponse.json({
    scanned: accounts.length,
    new_positive_replies: newReplies.length,
  })
}
