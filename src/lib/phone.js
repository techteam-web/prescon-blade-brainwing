// India-first E.164 normalisation. Accepts "9876543210", "09876543210",
// "+91 98765 43210", "91-9876543210" — anything with 10+ digits — and returns
// "+91XXXXXXXXXX". Returns null for anything that can't be made valid.
export function toE164(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return null;

  let national = digits;
  if (national.startsWith('91') && national.length === 12) {
    national = national.slice(2);
  } else if (national.startsWith('0') && national.length === 11) {
    national = national.slice(1);
  }

  if (national.length !== 10 || !/^[6-9]/.test(national)) return null;
  return `+91${national}`;
}

export function formatForDisplay(e164) {
  if (!e164 || !e164.startsWith('+91')) return e164 || '';
  const n = e164.slice(3);
  return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
}
