import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { formatForDisplay } from '../../lib/phone';
import { EnterPortal } from '../../components/Primitives';
import { Control } from '../../components/Primitives';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export function OtpScreen({ phone, onVerified, onEditNumber }) {
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const inputs = useRef([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const focusAt = (i) => inputs.current[i]?.focus();

  const setDigitAt = (i, value) => {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const handleChange = (i, raw) => {
    const value = raw.replace(/\D/g, '');
    if (!value) {
      setDigitAt(i, '');
      return;
    }
    // Handles both a single keystroke and a full code pasted into one box.
    const chars = value.split('');
    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((c, offset) => {
        if (i + offset < CODE_LENGTH) next[i + offset] = c;
      });
      return next;
    });
    const landing = Math.min(i + chars.length, CODE_LENGTH - 1);
    focusAt(landing);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      focusAt(i - 1);
    }
    if (e.key === 'ArrowLeft' && i > 0) focusAt(i - 1);
    if (e.key === 'ArrowRight' && i < CODE_LENGTH - 1) focusAt(i + 1);
  };

  const code = digits.join('');

  const verify = async (e) => {
    e?.preventDefault();
    if (loading || code.length !== CODE_LENGTH) return;

    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    setLoading(false);

    if (err) {
      setError(
        /expired/i.test(err.message)
          ? 'This code has expired. Request a new one below.'
          : 'That code is incorrect. Check it and try again.',
      );
      setDigits(Array(CODE_LENGTH).fill(''));
      focusAt(0);
      return;
    }

    onVerified();
  };

  const resend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({ phone });
    setResending(false);

    if (err) {
      setError('Could not resend the code. Please try again shortly.');
      return;
    }
    setDigits(Array(CODE_LENGTH).fill(''));
    focusAt(0);
    setResendCooldown(RESEND_COOLDOWN);
  };

  return (
    <form onSubmit={verify} className="flex w-full flex-col items-stretch gap-[1.8em]">
      <div className="flex flex-col items-center gap-[0.4em] text-center">
        <h1 className="text-[1.1rem]">Verify your number</h1>
        <p className="text-[0.85rem] text-blade-cream/60">
          Enter the code sent to {formatForDisplay(phone)}
        </p>
      </div>

      <div className="flex justify-center gap-[0.6em]" onPaste={(e) => {
        e.preventDefault();
        handleChange(0, e.clipboardData.getData('text'));
      }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={CODE_LENGTH}
            disabled={loading}
            aria-label={`Digit ${i + 1}`}
            className="h-[2.6em] w-[1.7em] border-0 border-b border-blade-ink bg-transparent text-center text-[1.3rem] text-blade-cream outline-none focus:border-blade-copper"
          />
        ))}
      </div>

      {error ? (
        <span className="text-center text-[0.8rem] text-blade-rose" role="alert">
          {error}
        </span>
      ) : null}

      <div className="mt-[0.2em] flex justify-center">
        <EnterPortal onClick={verify} disabled={loading || code.length !== CODE_LENGTH}>
          {loading ? 'VERIFYING…' : 'VERIFY'}
        </EnterPortal>
      </div>

      <div className="flex flex-col items-center gap-[1.2em]">
        <Control onClick={resend} disabled={resendCooldown > 0 || resending}>
          {resending
            ? 'RESENDING…'
            : resendCooldown > 0
              ? `RESEND CODE (${resendCooldown}s)`
              : 'RESEND CODE'}
        </Control>
        <button
          type="button"
          onClick={onEditNumber}
          className="text-[0.78rem] text-blade-cream/50 underline decoration-blade-ink underline-offset-4 hover:text-blade-cream/80"
        >
          Change phone number
        </button>
      </div>
    </form>
  );
}
