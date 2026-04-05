'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'

export default function Dashboard() {
  const supabase = createSupabaseBrowserClient()
  const [user, setUser] = useState<any>(null)
  const [mailboxes, setMailboxes] = useState<any[]>([])
  const [replies, setReplies] = useState<any[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  
  // Add Mailbox Form State
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({ email_address: '', password: '', imap_host: 'imap.gmail.com', imap_port: 993 })
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }
    setUser(user)

    const { data: accs } = await supabase.from('mailboxes').select('*').eq('user_id', user.id)
    setMailboxes(accs || [])

    const { data: reps } = await supabase
      .from('replies')
      .select('*, mailboxes(email_address)')
      .eq('user_id', user.id)
      .eq('is_positive', true)
      .order('received_at', { ascending: false })
      .limit(50)
    setReplies(reps || [])
  }

  const handleAddMailbox = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    setAddError(null)

    try {
      const res = await fetch('/api/mailboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add mailbox')
      
      setShowAddForm(false)
      setFormData({ email_address: '', password: '', imap_host: 'imap.gmail.com', imap_port: 993 })
      await loadData()
    } catch (err: any) {
      setAddError(err.message)
    } finally {
      setIsAdding(false)
    }
  }

  const runScan = async () => {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch('/api/scan', { method: 'POST' })
      const data = await res.json()
      setScanResult(`Scanned ${data.scanned} inbox${data.scanned !== 1 ? 'es' : ''}. Found ${data.new_positive_replies} new repl${data.new_positive_replies !== 1 ? 'ies' : 'y'}.`)
      await loadData()
    } catch {
      setScanResult('Scan failed. Check your console.')
    }
    setScanning(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>📡</span>
          <span style={{ fontSize: 20, fontWeight: 600 }}>Reply Radar</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#888' }}>{user?.email}</span>
          <button onClick={signOut} style={ghostBtn}>Sign out</button>
        </div>
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Connected Inboxes</h2>
          <button onClick={() => setShowAddForm(!showAddForm)} style={primaryBtn}>
            {showAddForm ? 'Cancel' : '+ Add Mailbox'}
          </button>
        </div>
        
        {showAddForm && (
          <form onSubmit={handleAddMailbox} style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12, fontWeight: 600 }}>Add IMAP Inbox</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <input required type="email" placeholder="Email Address" style={input} value={formData.email_address} onChange={e => setFormData({...formData, email_address: e.target.value})} />
              <input required type="password" placeholder="App Password" style={input} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              <input required type="text" placeholder="IMAP Host (e.g. imap.gmail.com)" style={input} value={formData.imap_host} onChange={e => setFormData({...formData, imap_host: e.target.value})} />
              <input required type="number" placeholder="IMAP Port" style={input} value={formData.imap_port} onChange={e => setFormData({...formData, imap_port: parseInt(e.target.value)})} />
            </div>
            {addError && <div style={{ color: 'red', fontSize: 12, marginBottom: 12 }}>{addError}</div>}
            <button disabled={isAdding} type="submit" style={primaryBtn}>
              {isAdding ? 'Connecting...' : 'Connect Mailbox'}
            </button>
          </form>
        )}

        {mailboxes.length === 0 ? (
          <p style={{ color: '#888', fontSize: 14 }}>No inboxes connected yet. Add a mailbox to start scanning.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mailboxes.map((acc) => (
              <div key={acc.id} style={inboxRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={avatar}>{acc.email_address[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{acc.email_address}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {acc.last_scanned_at
                        ? `Last scanned ${formatDistanceToNow(new Date(acc.last_scanned_at))} ago`
                        : 'Never scanned'}
                    </div>
                  </div>
                </div>
                <div style={badge}>Connected</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, margin: '24px 0' }}>
        <button
          onClick={runScan}
          disabled={scanning || mailboxes.length === 0}
          style={{ ...primaryBtn, opacity: (scanning || mailboxes.length === 0) ? 0.5 : 1, padding: '10px 24px' }}
        >
          {scanning ? 'Scanning...' : '⟳ Scan Now'}
        </button>
        {scanResult && <span style={{ fontSize: 14, color: '#444' }}>{scanResult}</span>}
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Positive Replies {replies.length > 0 && <span style={countBadge}>{replies.length}</span>}
        </h2>
        {replies.length === 0 ? (
          <p style={{ color: '#888', fontSize: 14 }}>No replies detected yet. Run a scan to check your inboxes.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {replies.map((r) => (
              <div key={r.id} style={replyCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{r.from_name || r.from_email}</div>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{r.from_email}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{r.subject}</div>
                    <div style={{ fontSize: 13, color: '#555' }}>{r.snippet}</div>
                    {r.ai_reasoning && (
                      <div style={{ fontSize: 12, color: '#888', marginTop: 6, fontStyle: 'italic' }}>
                        AI: {r.ai_reasoning}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#aaa' }}>
                      {r.received_at ? formatDistanceToNow(new Date(r.received_at), { addSuffix: true }) : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                      {r.mailboxes?.email_address}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const card: any = { background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }
const replyCard: any = { border: '1px solid #f0f0f0', borderRadius: 8, padding: '14px 16px', background: '#fafafa' }
const inboxRow: any = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }
const avatar: any = { width: 32, height: 32, borderRadius: '50%', background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600 }
const badge: any = { background: '#e8f5e9', color: '#2e7d32', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }
const countBadge: any = { background: '#111', color: '#fff', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, marginLeft: 8 }
const primaryBtn: any = { background: '#111', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: 500 }
const ghostBtn: any = { background: 'transparent', color: '#555', border: '1px solid #ddd', padding: '6px 14px', borderRadius: 7, fontSize: 13, cursor: 'pointer' }
const input: any = { width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14 }
