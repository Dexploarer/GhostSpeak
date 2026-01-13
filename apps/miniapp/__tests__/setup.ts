/**
 * Test setup file
 *
 * This file runs before all tests to set up the test environment.
 * It configures environment variables needed for the tests.
 *
 * NOTE: This is one of the ONLY files allowed to directly set process.env
 * because it runs before tests and configures the environment for lib/env.ts
 */

// Set up test environment variables BEFORE any modules are imported
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3334'
process.env.NEXT_PUBLIC_WEB_APP_URL = 'http://localhost:3333'
process.env.NEXT_PUBLIC_CONVEX_URL = 'https://lovely-cobra-639.convex.cloud'
process.env.NEXT_PUBLIC_SOLANA_RPC_URL = 'https://api.devnet.solana.com'
process.env.NEXT_PUBLIC_SOLANA_NETWORK = 'devnet'
process.env.NEXT_PUBLIC_GHOSTSPEAK_PROGRAM_ID = '4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB'
process.env.NEXT_PUBLIC_GHOST_TOKEN_ADDRESS = 'GHoSTgvU7Uw1hVJWj1V1W1q9F1q1q1q1q1q1q1q1q1q'
process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = 'boo_gs_bot'
process.env.NODE_ENV = 'test'
