import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

export async function fetchReplies(
  host: string,
  port: number,
  user: string,
  pass: string,
  lastScannedAt: string | null
) {
  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user, pass },
    logger: false 
  });

  await client.connect();
  const results = [];

  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Build search criteria
      const searchCriteria: any = {};
      if (lastScannedAt) {
        searchCriteria.since = new Date(lastScannedAt);
      } else {
        // Last 30 days if no last scan
        searchCriteria.since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }
      
      const messages = client.fetch(searchCriteria, { source: true, envelope: true, uid: true });
      
      for await (let msg of messages) {
        if (!msg.source) continue;
        const parsed = await simpleParser(msg.source);
        
        let fromEmail = '';
        let fromName = '';
        
        if (parsed.from && parsed.from.value && parsed.from.value.length > 0) {
          fromEmail = parsed.from.value[0].address || '';
          fromName = parsed.from.value[0].name || fromEmail;
        }

        results.push({
          message_id: parsed.messageId || String(msg.uid),
          thread_id: parsed.inReplyTo || '',
          from_name: fromName,
          from_email: fromEmail,
          subject: parsed.subject || '',
          snippet: parsed.text ? parsed.text.substring(0, 100) : '',
          body: parsed.text ? parsed.text.substring(0, 2000) : '',
          received_at: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return results;
}
