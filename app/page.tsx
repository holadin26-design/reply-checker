'use client'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function Home() {
  const supabase = createSupabaseBrowserClient()

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📡</div>
        <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Reply Radar</h1>
        <p style={{ color: '#666', marginBottom: 32 }}>
          Track replies across all your cold outreach inboxes. Powered by AI.
        </p>
        <button
          onClick={signIn}
          style={{
            background: '#111', color: '#fff', border: 'none', padding: '12px 28px',
            borderRadius: 8, fontSize: 15, cursor: 'pointer', fontWeight: 500,
          }}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
