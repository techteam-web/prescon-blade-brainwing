import { useEffect, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { RegisterScreen } from './RegisterScreen';
import { OtpScreen } from './OtpScreen';
import { AuthShell } from './AuthShell';

// Blocks the whole app behind phone verification. Nothing under this component
// mounts until a Supabase session exists — the heavy stuff further down (Marzipano
// tours, the map, the render gallery) never starts loading for an unverified visitor.
//
// Two steps only: REGISTER (name + phone → OTP sent) and VERIFY (OTP → session).
// A live Supabase session is treated as proof of a verified phone — phone auth has
// no other way to reach a session — so on mount we just ask Supabase what it knows
// and skip straight past both screens if a session already exists.
export function AuthGate({ children }) {
  const [status, setStatus] = useState('loading'); // loading | register | verify | authenticated
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const profileSyncedFor = useRef(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setStatus(data.session ? 'authenticated' : 'register');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        setStatus('register');
        profileSyncedFor.current = null;
        return;
      }
      if (session) setStatus('authenticated');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Upserts the profile row exactly once per session, the moment we have one —
  // covers a fresh verification and a returning visitor's restored session alike.
  useEffect(() => {
    if (status !== 'authenticated') return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user || cancelled) return;
      if (profileSyncedFor.current === user.id) return;
      profileSyncedFor.current = user.id;

      await supabase.from('profiles').upsert(
        {
          id: user.id,
          full_name: name || user.user_metadata?.full_name || null,
          phone: user.phone || phone || null,
        },
        { onConflict: 'id' },
      );
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (!isSupabaseConfigured) {
    return (
      <div className="fixed inset-0 z-[300] grid place-items-center bg-blade-black screen-inset-bare">
        <AuthShell>
          <p className="text-center text-[0.85rem] text-blade-cream/70">
            Supabase isn't configured yet. Copy <code>.env.example</code> to{' '}
            <code>.env</code>, fill in <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
          </p>
        </AuthShell>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-[300] bg-blade-black" aria-hidden="true" />
    );
  }

  if (status === 'authenticated') return children;

  return (
    <div className="fixed inset-0 z-[300] grid place-items-center bg-blade-black screen-inset-bare">
      <AuthShell>
        {status === 'verify' ? (
          <OtpScreen
            phone={phone}
            onVerified={() => setStatus('authenticated')}
            onEditNumber={() => setStatus('register')}
          />
        ) : (
          <RegisterScreen
            onSent={(submittedName, e164Phone) => {
              setName(submittedName);
              setPhone(e164Phone);
              setStatus('verify');
            }}
          />
        )}
      </AuthShell>
    </div>
  );
}
