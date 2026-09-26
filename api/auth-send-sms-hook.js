// Vercel serverless function — the target of Supabase's "Send SMS" Auth Hook.
//
// Supabase generates and owns the OTP; this endpoint's only job is delivery. When a
// visitor requests a code, Supabase Auth POSTs the phone number and the OTP here
// (signed with the hook's webhook secret) instead of sending SMS itself, and this
// function forwards it to MSG91.
//
// Wiring (production only — do this after creating the Supabase project):
//   1. MSG91 dashboard: create a DLT-approved OTP template with a `##OTP##` (or
//      similar) variable, note the authkey and template id.
//   2. Supabase dashboard → Authentication → Hooks → "Send SMS hook" → HTTP hook,
//      pointing at https://<your-domain>/api/auth-send-sms-hook. Supabase generates
//      the hook secret (starts with `v1,whsec_...`) — copy it.
//   3. Set these as server-side env vars in Vercel (never VITE_-prefixed, never
//      shipped to the browser): SUPABASE_HOOK_SECRET, MSG91_AUTHKEY,
//      MSG91_TEMPLATE_ID, MSG91_SENDER_ID.
//   4. In development, skip all of this — configure a test phone number with a
//      fixed OTP under Authentication → Providers → Phone in Supabase instead.
//      Supabase never calls this hook for a configured test number.

import { Webhook } from 'standardwebhooks';

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const secret = process.env.SUPABASE_HOOK_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'SUPABASE_HOOK_SECRET is not configured' });
    return;
  }

  const raw = await readRawBody(req);

  let payload;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(raw, req.headers);
  } catch {
    res.status(401).json({ error: 'invalid signature' });
    return;
  }

  const phone = payload?.user?.phone || payload?.sms?.phone;
  const otp = payload?.sms?.otp;

  if (!phone || !otp) {
    res.status(400).json({ error: 'missing phone or otp in hook payload' });
    return;
  }

  const authkey = process.env.MSG91_AUTHKEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authkey || !templateId) {
    res.status(500).json({ error: 'MSG91 is not configured' });
    return;
  }

  const mobile = phone.replace(/^\+/, '');

  const msgRes = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authkey,
    },
    body: JSON.stringify({
      template_id: templateId,
      short_url: '0',
      recipients: [{ mobiles: mobile, OTP: otp }],
    }),
  });

  if (!msgRes.ok) {
    const detail = await msgRes.text().catch(() => '');
    res.status(502).json({ error: 'MSG91 delivery failed', detail });
    return;
  }

  res.status(200).json({});
}
