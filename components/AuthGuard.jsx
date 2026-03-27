'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '../lib/supabase';

const MINT = '#90EE82';

export default function AuthGuard({ children }) {
  const router  = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const db = createBrowserClient();
    db.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login');
      } else {
        setReady(true);
      }
    });
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 20, height: 20, border: `2px solid #90EE8233`, borderTopColor: MINT, borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return children;
}
