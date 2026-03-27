'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '../../lib/supabase-browser';

const MINT = '#90EE82', BORDER = '#1e1e1c', CARD = '#0d0d0b';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const next         = searchParams.get('next') || '/lots';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const db = createBrowserSupabaseClient();
    const { error: authError } = await db.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Email or password incorrect. Please try again.');
      setLoading(false);
      return;
    }

    // Hard navigate so middleware re-evaluates with the new session cookie
    window.location.href = next;
  }

  const inputStyle = {
    width: '100%', padding: '11px 14px',
    background: '#111110', border: `1px solid ${BORDER}`,
    borderRadius: 8, color: '#e8e8e2', fontSize: 14,
    outline: 'none', transition: 'border-color .15s',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 26, color: MINT }}>Provnr</span>
          <p style={{ color: '#444', fontSize: 13, marginTop: 6 }}>Registro · Lot Management</p>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: '28px 28px' }}>
          <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 18, color: '#f0f0ea', marginBottom: 24 }}>Sign in</h1>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus placeholder="you@provnr.com" style={inputStyle}
                onFocus={e => e.target.style.borderColor = MINT} onBlur={e => e.target.style.borderColor = BORDER}/>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 7 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle}
                onFocus={e => e.target.style.borderColor = MINT} onBlur={e => e.target.style.borderColor = BORDER}/>
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,80,80,0.07)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 8, color: '#ff8080', fontSize: 12.5, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '11px', background: loading ? '#90EE8266' : MINT, color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading && <div style={{ width: 14, height: 14, border: '2px solid #00000033', borderTopColor: '#000', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#333', fontSize: 11, marginTop: 20 }}>registro.provnr.com · Internal use only</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
