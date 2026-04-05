import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function classifyReply(email: {
  from_name: string
  from_email: string
  subject: string
  body: string
}): Promise<{ is_positive: boolean; reasoning: string }> {
  const prompt = `You are analyzing a reply to a cold outreach email.

From: ${email.from_name} <${email.from_email}>
Subject: ${email.subject}
Body:
${email.body}

Determine if this is a POSITIVE response. A positive response means the person has replied at all — even a "no thanks", an out-of-office, or a question counts. Only mark as NOT positive if the message is spam, automated bounce, or a delivery failure notification.

Respond in JSON only:
{
  "is_positive": true or false,
  "reasoning": "one sentence explanation"
}`

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 150,
  })

  const content = res.choices[0].message.content || '{}'
  return JSON.parse(content)
}
