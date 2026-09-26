// Supabase Edge Function — target of Authentication → Hooks → "Send SMS hook".
//
// Supabase generates and owns the OTP; this function's only job is delivery.
// In SMS_MODE=mock it never calls a real SMS provider — it just prints the
// phone + code to this function's logs so you can read it during local/dev
// testing without any Twilio/MSG91 account or cost. Flip SMS_MODE to "live"
// (and set MSG91_AUTHKEY / MSG91_TEMPLATE_ID) once you're ready for real SMS.
//
// Deploy:
//   npx supabase login
//   npx supabase link --project-ref <your-project-ref>
//   npx supabase functions deploy send-sms-hook --no-verify-jwt
//   npx supabase secrets set SMS_MODE=mock SUPABASE_HOOK_SECRET=<from dashboard>
//
// Then in the Supabase dashboard: Authentication → Hooks → "Send SMS hook" →
// enable, type HTTPS, point it at this function's URL, and copy the secret
// it generates into SUPABASE_HOOK_SECRET above.
//
// Watch codes with: npx supabase functions logs send-sms-hook

import { Webhook } from 'npm:standardwebhooks@1.1.1';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), { status: 405 });
  }

  const secret = Deno.env.get('SUPABASE_HOOK_SECRET');
  if (!secret) {
    return new Response(JSON.stringify({ error: 'SUPABASE_HOOK_SECRET is not configured' }), { status: 500 });
  }

  const raw = await req.text();

  let payload;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(raw, Object.fromEntries(req.headers));
  } catch {
    return new Response(JSON.stringify({ error: 'invalid signature' }), { status: 401 });
  }

  const phone = payload?.user?.phone || payload?.sms?.phone;
  const otp = payload?.sms?.otp;

  if (!phone || !otp) {
    return new Response(JSON.stringify({ error: 'missing phone or otp in hook payload' }), { status: 400 });
  }

  const mode = Deno.env.get('SMS_MODE') || 'mock';

  if (mode === 'mock') {
    console.log(`[send-sms-hook mock] phone=${phone} otp=${otp}`);
    return new Response(JSON.stringify({}), { status: 200 });
  }

  const authkey = Deno.env.get('MSG91_AUTHKEY');
  const templateId = Deno.env.get('MSG91_TEMPLATE_ID');
  if (!authkey || !templateId) {
    return new Response(JSON.stringify({ error: 'MSG91 is not configured' }), { status: 500 });
  }

  const mobile = phone.replace(/^\+/, '');

  const msgRes = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey },
    body: JSON.stringify({
      template_id: templateId,
      short_url: '0',
      recipients: [{ mobiles: mobile, OTP: otp }],
    }),
  });

  if (!msgRes.ok) {
    const detail = await msgRes.text().catch(() => '');
    return new Response(JSON.stringify({ error: 'MSG91 delivery failed', detail }), { status: 502 });
  }

  return new Response(JSON.stringify({}), { status: 200 });
});
