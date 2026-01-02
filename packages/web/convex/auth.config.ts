/**
 * Convex Authentication Configuration
 *
 * This file configures Convex to validate JWTs from Crossmint's OIDC provider.
 *
 * When a user authenticates via Crossmint:
 * 1. Crossmint issues a JWT token with `iss` (issuer) and `aud` (audience) claims
 * 2. Our frontend sends this JWT to Convex on every request
 * 3. Convex validates the JWT against this configuration
 * 4. If valid, the user identity is available via ctx.auth.getUserIdentity()
 *
 * IMPORTANT: The `domain` and `applicationID` must match the JWT's `iss` and `aud` claims.
 * To verify, decode a Crossmint JWT at https://jwt.io/ and check these values.
 *
 * See: https://docs.convex.dev/auth/advanced/custom-auth
 */

export default {
  providers: [
    {
      /**
       * Crossmint OIDC Provider
       *
       * domain: The issuer URL that Crossmint uses (JWT 'iss' claim)
       * applicationID: The audience for this app (JWT 'aud' claim)
       *
       * Note: Crossmint uses www.crossmint.com (not staging) for production
       */
      domain: 'https://www.crossmint.com',
      applicationID: 'convex',
    },
  ],
}
