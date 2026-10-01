import {
  buildMailruAuthorizeUrl,
  buildVkAuthorizeUrl,
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
  getOidcClientConfig,
  isOidcProviderConfigured,
  parseOAuthCallback,
  randomUrlSafe,
} from './oidcClient';

describe('oidcClient', () => {
  it('randomUrlSafe produces expected length/alphabet', () => {
    const s = randomUrlSafe(32);
    expect(s).toHaveLength(32);
    expect(s).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generateState and codeVerifier are distinct and long enough', () => {
    const a = generateState();
    const b = generateState();
    expect(a).not.toBe(b);
    expect(generateCodeVerifier().length).toBeGreaterThanOrEqual(43);
  });

  it('generateCodeChallenge is stable S256 base64url', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('parseOAuthCallback extracts code + state', () => {
    const r = parseOAuthCallback(
      'fitpulse://oauth?code=abc12345&state=xyz&device_id=dev1',
    );
    expect(r).toEqual({
      kind: 'code',
      code: 'abc12345',
      state: 'xyz',
      deviceId: 'dev1',
    });
  });

  it('parseOAuthCallback extracts id_token from hash', () => {
    const longJwt = `${'a'.repeat(20)}.${'b'.repeat(20)}.${'c'.repeat(20)}`;
    const r2 = parseOAuthCallback(
      `fitpulse://oauth#id_token=${longJwt}&state=s1`,
    );
    expect(r2).toEqual({
      kind: 'id_token',
      token: longJwt,
      state: 's1',
    });
    const short = parseOAuthCallback(
      'fitpulse://oauth#id_token=aaa.bbb.ccc&state=s1',
    );
    expect(short).toBeNull();
  });

  it('parseOAuthCallback rejects lookalike callback hosts and ports', () => {
    expect(parseOAuthCallback('fitpulse://oauth.evil?code=abc12345&state=xyz')).toBeNull();
    expect(parseOAuthCallback('fitpulse://oauth:443?code=abc12345&state=xyz')).toBeNull();
    expect(parseOAuthCallback('https://oauth?code=abc12345&state=xyz')).toBeNull();
  });

  it('parseOAuthCallback returns error', () => {
    const r = parseOAuthCallback(
      'fitpulse://oauth?error=access_denied&state=st',
    );
    expect(r).toEqual({ kind: 'error', error: 'access_denied', state: 'st' });
  });

  it('buildMailruAuthorizeUrl uses code + PKCE', () => {
    const url = buildMailruAuthorizeUrl('cid', 'mystate', 'challenge123');
    expect(url).toContain('oauth.mail.ru/login');
    expect(url).toContain('response_type=code');
    expect(url).toContain('code_challenge=challenge123');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('state=mystate');
    expect(url).toContain('client_id=cid');
  });

  it('buildVkAuthorizeUrl uses code + PKCE', async () => {
    const url = await buildVkAuthorizeUrl('99', 'st', 'challenge123');
    expect(url).toContain('id.vk.ru/authorize');
    expect(url).toContain('response_type=code');
    expect(url).toContain('code_challenge=challenge123');
    expect(url).toContain('code_challenge_method=S256');
    expect(url).toContain('state=st');
  });

  it('isOidcProviderConfigured respects missing ids', () => {
    expect(
      isOidcProviderConfigured('vk', {
        vkClientId: null,
        mailruClientId: 'x',
        syncApiUrl: null,
      }),
    ).toBe(false);
    expect(
      isOidcProviderConfigured('mailru', {
        vkClientId: null,
        mailruClientId: 'x',
        syncApiUrl: null,
      }),
    ).toBe(true);
  });

  it('getOidcClientConfig does not throw without env', () => {
    const c = getOidcClientConfig();
    expect(c).toHaveProperty('vkClientId');
    expect(c).toHaveProperty('mailruClientId');
    expect(c).toHaveProperty('syncApiUrl');
  });
});
