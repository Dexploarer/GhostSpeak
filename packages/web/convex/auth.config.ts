/**
 * Convex Authentication Configuration
 *
 * This file configures Convex to validate JWTs from Crossmint.
 * Crossmint issues JWT tokens when users authenticate, and Convex
 * uses this configuration to verify those tokens.
 *
 * See: https://docs.convex.dev/auth
 */

export default {
  providers: [
    {
      // Crossmint acts as an OIDC provider
      domain: 'https://staging.crossmint.com',
      applicationID: 'convex',
    },
  ],
}
