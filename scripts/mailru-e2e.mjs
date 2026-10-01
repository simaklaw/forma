#!/usr/bin/env node

const baseUrl = (process.env.MAILRU_E2E_API_URL || '').replace(/\/$/, '');
const code = process.env.MAILRU_E2E_CODE || '';
const verifier = process.env.MAILRU_E2E_CODE_VERIFIER || '';
const redirectUri = process.env.MAILRU_E2E_REDIRECT_URI || 'fitpulse://oauth';

let apiUrl;
try {
  apiUrl = new URL(baseUrl);
} catch {
  console.error('MAILRU_E2E_API_URL must be a valid URL.');
  process.exit(2);
}
if (apiUrl.protocol !== 'https:') {
  console.error('MAILRU_E2E_API_URL must use HTTPS.');
  process.exit(2);
}

if (!baseUrl || !code || !verifier) {
  console.error('Set MAILRU_E2E_API_URL, MAILRU_E2E_CODE and MAILRU_E2E_CODE_VERIFIER.');
  process.exit(2);
}

const res = await fetch(baseUrl + '/api/v1/auth/oidc', {
  method: 'POST',
  redirect: 'error',
  headers: { 'content-type': 'application/json', accept: 'application/json' },
  body: JSON.stringify({
    provider: 'mailru',
    code,
    code_verifier: verifier,
    redirect_uri: redirectUri,
  }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok || typeof body.token !== 'string' || typeof body.user_id !== 'string') {
  console.error(JSON.stringify({ status: res.status, body }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  provider: body.provider,
  user_id: body.user_id,
  expires_at: body.expires_at,
}, null, 2));
