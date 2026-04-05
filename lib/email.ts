import nodemailer from 'nodemailer'

export async function sendNotificationEmail(to: string, replies: any[]) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.NOTIFICATION_FROM_EMAIL,
      pass: process.env.NOTIFICATION_EMAIL_PASSWORD,
    },
  })

  const replyList = replies
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${r.from_name || ''} &lt;${r.from_email}&gt;</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${r.subject}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${r.gmail_address}</td>
      </tr>`
    )
    .join('')

  await transporter.sendMail({
    from: process.env.NOTIFICATION_FROM_EMAIL,
    to,
    subject: `[Reply Radar] ${replies.length} new reply${replies.length > 1 ? 's' : ''} detected`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#111;">New replies detected</h2>
        <p style="color:#555;">Reply Radar found ${replies.length} new reply${replies.length > 1 ? 's' : ''} across your inboxes.</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px 12px;text-align:left;">From</th>
              <th style="padding:8px 12px;text-align:left;">Subject</th>
              <th style="padding:8px 12px;text-align:left;">Inbox</th>
            </tr>
          </thead>
          <tbody>${replyList}</tbody>
        </table>
        <p style="margin-top:24px;"><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View in dashboard</a></p>
      </div>
    `,
  })
}
