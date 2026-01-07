/**
 * API Key helpers for Convex.
 *
 * Requirements:
 * - Do not store plaintext API keys.
 * - Store only SHA-256 hashed keys + a short prefix for display.
 * - Generate keys using cryptographically secure randomness.
 */

import nacl from 'tweetnacl'

export const API_KEY_LIVE_PREFIX = 'gs_live_' as const
export const API_KEY_RANDOM_LENGTH = 40 as const

const BASE62_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function assertSecureRandomAvailable(): void {
  const hasWebCrypto =
    typeof globalThis !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!(globalThis as any).crypto &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (globalThis as any).crypto.getRandomValues === 'function'

  // tweetnacl falls back to webcrypto in most runtimes; keep it as a secondary path.
  const hasNacl = typeof nacl?.randomBytes === 'function'

  if (!hasWebCrypto && !hasNacl) {
    throw new Error('Secure random generation is not available in this runtime')
  }
}

function secureRandomBytes(length: number): Uint8Array {
  // Prefer Web Crypto when present.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cryptoAny = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined
  if (cryptoAny?.getRandomValues) {
    const out = new Uint8Array(length)
    cryptoAny.getRandomValues(out)
    return out
  }

  // Fallback to tweetnacl (internally uses webcrypto/node crypto when available)
  if (typeof nacl?.randomBytes === 'function') {
    return nacl.randomBytes(length)
  }

  throw new Error('Secure random generation is not available in this runtime')
}

/**
 * Generate a base62 string using rejection sampling to avoid modulo bias.
 */
function randomBase62String(length: number): string {
  assertSecureRandomAvailable()

  const out: string[] = []
  // Largest multiple of 62 less than 256.
  const max = 62 * 4 // 248

  while (out.length < length) {
    const bytes = secureRandomBytes(Math.max(32, length))
    for (let i = 0; i < bytes.length && out.length < length; i++) {
      const b = bytes[i]
      if (b >= max) continue
      out.push(BASE62_ALPHABET[b % 62])
    }
  }

  return out.join('')
}

function bytesToHex(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0')
  }
  return out
}

// Minimal SHA-256 implementation (pure JS) used as a fallback when WebCrypto is unavailable.
// Adapted from the SHA-256 specification (FIPS 180-4) with a small footprint.
function sha256Fallback(bytes: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98,
    0x71374491,
    0xb5c0fbcf,
    0xe9b5dba5,
    0x3956c25b,
    0x59f111f1,
    0x923f82a4,
    0xab1c5ed5,
    0xd807aa98,
    0x12835b01,
    0x243185be,
    0x550c7dc3,
    0x72be5d74,
    0x80deb1fe,
    0x9bdc06a7,
    0xc19bf174,
    0xe49b69c1,
    0xefbe4786,
    0x0fc19dc6,
    0x240ca1cc,
    0x2de92c6f,
    0x4a7484aa,
    0x5cb0a9dc,
    0x76f988da,
    0x983e5152,
    0xa831c66d,
    0xb00327c8,
    0xbf597fc7,
    0xc6e00bf3,
    0xd5a79147,
    0x06ca6351,
    0x14292967,
    0x27b70a85,
    0x2e1b2138,
    0x4d2c6dfc,
    0x53380d13,
    0x650a7354,
    0x766a0abb,
    0x81c2c92e,
    0x92722c85,
    0xa2bfe8a1,
    0xa81a664b,
    0xc24b8b70,
    0xc76c51a3,
    0xd192e819,
    0xd6990624,
    0xf40e3585,
    0x106aa070,
    0x19a4c116,
    0x1e376c08,
    0x2748774c,
    0x34b0bcb5,
    0x391c0cb3,
    0x4ed8aa4a,
    0x5b9cca4f,
    0x682e6ff3,
    0x748f82ee,
    0x78a5636f,
    0x84c87814,
    0x8cc70208,
    0x90befffa,
    0xa4506ceb,
    0xbef9a3f7,
    0xc67178f2,
  ])

  let h0 = 0x6a09e667
  let h1 = 0xbb67ae85
  let h2 = 0x3c6ef372
  let h3 = 0xa54ff53a
  let h4 = 0x510e527f
  let h5 = 0x9b05688c
  let h6 = 0x1f83d9ab
  let h7 = 0x5be0cd19

  // Pre-processing (padding)
  const bitLen = bytes.length * 8
  const withOne = new Uint8Array(bytes.length + 1)
  withOne.set(bytes)
  withOne[bytes.length] = 0x80

  // Pad with zeros until message length ≡ 448 (mod 512)
  let paddedLen = withOne.length
  while ((paddedLen % 64) !== 56) paddedLen++

  const padded = new Uint8Array(paddedLen + 8)
  padded.set(withOne)

  // Append 64-bit big-endian length
  const view = new DataView(padded.buffer)
  // High 32 bits (we only support messages < 2^32 bits)
  view.setUint32(paddedLen, Math.floor(bitLen / 2 ** 32))
  view.setUint32(paddedLen + 4, bitLen >>> 0)

  const w = new Uint32Array(64)

  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n))
  const ch = (x: number, y: number, z: number) => (x & y) ^ (~x & z)
  const maj = (x: number, y: number, z: number) => (x & y) ^ (x & z) ^ (y & z)
  const s0 = (x: number) => rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3)
  const s1 = (x: number) => rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10)
  const S0 = (x: number) => rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22)
  const S1 = (x: number) => rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25)

  for (let offset = 0; offset < padded.length; offset += 64) {
    // Message schedule
    for (let i = 0; i < 16; i++) {
      w[i] =
        (padded[offset + i * 4] << 24) |
        (padded[offset + i * 4 + 1] << 16) |
        (padded[offset + i * 4 + 2] << 8) |
        padded[offset + i * 4 + 3]
    }
    for (let i = 16; i < 64; i++) {
      w[i] = (s1(w[i - 2]) + w[i - 7] + s0(w[i - 15]) + w[i - 16]) >>> 0
    }

    // Working variables
    let a = h0
    let b = h1
    let c = h2
    let d = h3
    let e = h4
    let f = h5
    let g = h6
    let h = h7

    for (let i = 0; i < 64; i++) {
      const t1 = (h + S1(e) + ch(e, f, g) + K[i] + w[i]) >>> 0
      const t2 = (S0(a) + maj(a, b, c)) >>> 0
      h = g
      g = f
      f = e
      e = (d + t1) >>> 0
      d = c
      c = b
      b = a
      a = (t1 + t2) >>> 0
    }

    h0 = (h0 + a) >>> 0
    h1 = (h1 + b) >>> 0
    h2 = (h2 + c) >>> 0
    h3 = (h3 + d) >>> 0
    h4 = (h4 + e) >>> 0
    h5 = (h5 + f) >>> 0
    h6 = (h6 + g) >>> 0
    h7 = (h7 + h) >>> 0
  }

  const hash = new Uint8Array(32)
  const outView = new DataView(hash.buffer)
  outView.setUint32(0, h0)
  outView.setUint32(4, h1)
  outView.setUint32(8, h2)
  outView.setUint32(12, h3)
  outView.setUint32(16, h4)
  outView.setUint32(20, h5)
  outView.setUint32(24, h6)
  outView.setUint32(28, h7)
  return hash
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)

  // Prefer WebCrypto digest when available.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cryptoAny = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined
  if (cryptoAny?.subtle?.digest) {
    const digest = await cryptoAny.subtle.digest('SHA-256', bytes)
    return bytesToHex(new Uint8Array(digest))
  }

  // Fallback to pure JS implementation.
  return bytesToHex(sha256Fallback(bytes))
}

export function generateApiKeyMaterial(): { apiKey: string; keyPrefix: string } {
  const randomPart = randomBase62String(API_KEY_RANDOM_LENGTH)
  const apiKey = `${API_KEY_LIVE_PREFIX}${randomPart}`

  // Store enough to visually identify the key (prefix + first 8 chars of random part).
  const keyPrefix = `${API_KEY_LIVE_PREFIX}${randomPart.slice(0, 8)}`

  return { apiKey, keyPrefix }
}

