                error: 'mailru_no_id_token',
                message:
                  'Token endpoint did not return id_token. Enable OIDC scopes for the Mail.ru app.',
              },
              400,
            );
          }
        }
        if (!idToken || idToken.length < 20 || idToken.length > 8192) {
          return c.json({ error: 'invalid_id_token' }, 400);
        }
        const claims = await verifyIdToken(provider, idToken, oidcConfig);
        const subject = claimsToAuthSubject(provider, claims);
        const { user_id, created } = await registerUser.register(subject);
        const token = signJwt(jwtSecret, user_id);
        const expiresAt = new Date(
          Date.now() + JWT_TTL_SECONDS * 1000,
        ).toISOString();
        return c.json({
          user_id,
          created,
          token,
          expires_at: expiresAt,
          auth_subject: subject,
          provider,
        });
      } catch (e) {
        const err = e as { name?: string; code?: string; message?: string };
        if (err?.name === 'OidcError' && typeof err.code === 'string') {
          const status =
            err.code === 'provider_not_configured'
              ? 503
              : err.code === 'expired'
                ? 401
                : err.code === 'jwks_unavailable'
                  ? 502
                  : err.code === 'invalid_code_verifier'
                    ? 400
                    : 401;
          return c.json(
            { error: err.code, message: err.message ?? err.code },
            status,
          );
        }
        throw e;
      }
    });
  }

  if (jwtSecret) {
    app.use('/api/v1/sync/*', async (c, next) => {
      const header = c.req.header('authorization') ?? '';
      if (!header.startsWith('Bearer ')) {
        return c.json({ error: 'unauthorized' }, 401);
      }
      const subject = verifyJwt(jwtSecret, header.slice('Bearer '.length));
      if (!subject) {
        return c.json({ error: 'unauthorized' }, 401);