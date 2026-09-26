import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { toE164 } from '../../lib/phone';
import { AuthField } from './AuthField';
import { EnterPortal } from '../../components/Primitives';

export function RegisterScreen({ onSent }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (loading) return;

    const trimmedName = name.trim();
    const e164 = toE164(phone);
    const nextErrors = {};
    if (trimmedName.length < 2) nextErrors.name = 'Enter your full name.';
    if (!e164) nextErrors.phone = 'Enter a valid 10-digit mobile number.';
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: e164,
      options: { data: { full_name: trimmedName }, shouldCreateUser: true },
    });
    setLoading(false);

    if (error) {
      setFormError(
        error.status === 429
          ? 'Too many attempts. Please wait a moment and try again.'
          : 'Could not send the code. Please check the number and try again.',
      );
      return;
    }

    onSent(trimmedName, e164);
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col items-stretch gap-[1.8em]">
      <div className="flex flex-col items-center gap-[0.4em] text-center">
        <h1 className="text-[1.1rem]">Enter The Blade</h1>
        <p className="text-[0.85rem] text-blade-cream/60">
          Verify your phone number to continue.
        </p>
      </div>

      <AuthField
        label="Full name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        disabled={loading}
      />

      <AuthField
        label="Mobile number"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="98765 43210"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={errors.phone}
        disabled={loading}
      />

      {formError ? (
        <span className="text-center text-[0.8rem] text-blade-rose" role="alert">
          {formError}
        </span>
      ) : null}

      <div className="mt-[0.4em] flex justify-center">
        <EnterPortal onClick={submit} disabled={loading}>
          {loading ? 'SENDING…' : 'SEND CODE'}
        </EnterPortal>
      </div>

      <p className="text-center text-[0.72rem] leading-relaxed text-blade-cream/40">
        We'll text a one-time code to verify this number. Standard SMS rates may apply.
      </p>
    </form>
  );
}
