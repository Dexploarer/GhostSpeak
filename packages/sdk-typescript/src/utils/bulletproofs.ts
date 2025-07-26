/**
 * Bulletproofs Implementation for Range Proofs
 * 
 * Implements bulletproofs for proving that encrypted values are within a valid range
 * without revealing the actual values. Used for Token-2022 confidential transfers.
 * 
 * Based on the Bulletproofs paper: https://eprint.iacr.org/2017/1066.pdf
 * Optimized for Solana's requirements (0 <= amount < 2^64)
 */

import { ed25519 } from '@noble/curves/ed25519'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToNumberLE, numberToBytesBE, bytesToHex } from '@noble/curves/abstract/utils'

// Polyfill for crypto if not available
const crypto = globalThis.crypto || {
  getRandomValues: <T extends Uint8Array>(array: T): T => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }
}

// Generator points for Pedersen commitments
const G = ed25519.ExtendedPoint.BASE

// Generate H as hash-to-curve of G
function generateH(): typeof ed25519.ExtendedPoint.BASE {
  const gBytes = G.toRawBytes()
  let hash = sha256(gBytes)
  
  // Hash until we get a valid point
  while (true) {
    try {
      // Try to decode as a point
      return ed25519.ExtendedPoint.fromHex(bytesToHex(hash))
    } catch {
      // If not valid, hash again
      hash = sha256(hash)
    }
  }
}

const H = generateH() as typeof ed25519.ExtendedPoint.BASE

// Constants for bulletproofs
const RANGE_BITS = 64 // Prove values in range [0, 2^64)

/**
 * Inner product argument proof
 */
interface InnerProductProof {
  L: Uint8Array[]  // Left commitments
  R: Uint8Array[]  // Right commitments
  a: bigint        // Final scalar a
  b: bigint        // Final scalar b
}

/**
 * Bulletproof for range [0, 2^n)
 */
export interface Bulletproof {
  A: Uint8Array      // Commitment to aL, aR
  S: Uint8Array      // Commitment to sL, sR
  T1: Uint8Array     // Commitment to t1
  T2: Uint8Array     // Commitment to t2
  taux: bigint       // Blinding factor for t
  mu: bigint         // Blinding factor for inner product
  tx: bigint         // Value of t(x)
  innerProduct: InnerProductProof
}

/**
 * Transcript for Fiat-Shamir transform
 */
class ProofTranscript {
  private state: Uint8Array = new Uint8Array(32)

  constructor(label: string) {
    this.append('bulletproof', label)
  }

  append(label: string, data: string | Uint8Array): void {
    const labelBytes = new TextEncoder().encode(label)
    const dataBytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    
    const combined = new Uint8Array(this.state.length + labelBytes.length + dataBytes.length + 8)
    combined.set(this.state, 0)
    combined.set(numberToBytesBE(BigInt(labelBytes.length), 4), this.state.length)
    combined.set(labelBytes, this.state.length + 4)
    combined.set(numberToBytesBE(BigInt(dataBytes.length), 4), this.state.length + 4 + labelBytes.length)
    combined.set(dataBytes, this.state.length + 8 + labelBytes.length)
    
    this.state = sha256(combined)
  }

  challenge(label: string): bigint {
    this.append('challenge', label)
    return bytesToNumberLE(this.state) % ed25519.CURVE.n
  }
}

/**
 * Vector operations for bulletproofs
 */
class VectorOps {
  static add(a: bigint[], b: bigint[]): bigint[] {
    if (a.length !== b.length) throw new Error('Vector length mismatch')
    return a.map((ai, i) => (ai + b[i]) % ed25519.CURVE.n)
  }

  static sub(a: bigint[], b: bigint[]): bigint[] {
    if (a.length !== b.length) throw new Error('Vector length mismatch')
    return a.map((ai, i) => (ai - b[i] + ed25519.CURVE.n) % ed25519.CURVE.n)
  }

  static mul(a: bigint[], b: bigint[]): bigint[] {
    if (a.length !== b.length) throw new Error('Vector length mismatch')
    return a.map((ai, i) => (ai * b[i]) % ed25519.CURVE.n)
  }

  static scale(v: bigint[], s: bigint): bigint[] {
    const sMod = ((s % ed25519.CURVE.n) + ed25519.CURVE.n) % ed25519.CURVE.n
    return v.map(vi => (vi * sMod) % ed25519.CURVE.n)
  }

  static innerProduct(a: bigint[], b: bigint[]): bigint {
    if (a.length !== b.length) throw new Error('Vector length mismatch')
    return a.reduce((sum, ai, i) => (sum + ai * b[i]) % ed25519.CURVE.n, 0n)
  }

  static hadamard(a: bigint[], b: bigint[]): bigint[] {
    return this.mul(a, b)
  }

  static powers(x: bigint, n: number): bigint[] {
    const result: bigint[] = [1n]
    for (let i = 1; i < n; i++) {
      result.push((result[i - 1] * x) % ed25519.CURVE.n)
    }
    return result
  }
}

/**
 * Multi-exponentiation for efficiency
 */
function multiExp(points: typeof ed25519.ExtendedPoint.BASE[], scalars: bigint[]): typeof ed25519.ExtendedPoint.BASE {
  if (points.length !== scalars.length) throw new Error('Length mismatch')
  
  let result = ed25519.ExtendedPoint.ZERO
  for (let i = 0; i < points.length; i++) {
    const scalar = scalars[i]
    const point = points[i]
    if (scalar !== undefined && scalar !== 0n && point !== undefined) {
      const mult = point.multiply(scalar) as typeof ed25519.ExtendedPoint.BASE
      result = result.add(mult)
    }
  }
  return result
}

/**
 * Generate vector of random scalars
 */
function randomVector(n: number): bigint[] {
  const result: bigint[] = []
  for (let i = 0; i < n; i++) {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    result.push(bytesToNumberLE(bytes) % ed25519.CURVE.n)
  }
  return result
}

/**
 * Convert value to binary vector
 */
function toBinaryVector(value: bigint, bits: number): bigint[] {
  const result: bigint[] = []
  for (let i = 0; i < bits; i++) {
    result.push((value >> BigInt(i)) & 1n)
  }
  return result
}

/**
 * Generate bulletproof generators
 */
function generateGenerators(n: number): { g: typeof ed25519.ExtendedPoint.BASE[], h: typeof ed25519.ExtendedPoint.BASE[] } {
  const g: typeof ed25519.ExtendedPoint.BASE[] = []
  const h: typeof ed25519.ExtendedPoint.BASE[] = []
  
  // Hash-to-curve for each generator
  function hashToPoint(prefix: string, index: number): typeof ed25519.ExtendedPoint.BASE {
    const input = new Uint8Array([...new TextEncoder().encode(prefix), ...numberToBytesBE(BigInt(index), 4)])
    let hash = sha256(input)
    
    // Keep hashing until we get a valid point
    while (true) {
      try {
        return ed25519.ExtendedPoint.fromHex(bytesToHex(hash))
      } catch {
        hash = sha256(hash)
      }
    }
  }
  
  for (let i = 0; i < n; i++) {
    g.push(hashToPoint('bulletproof_g', i))
    h.push(hashToPoint('bulletproof_h', i))
  }
  
  return { g, h }
}

/**
 * Inner product argument
 */
function innerProductArgument(
  transcript: ProofTranscript,
  g: typeof ed25519.ExtendedPoint.BASE[],
  h: typeof ed25519.ExtendedPoint.BASE[],
  u: typeof ed25519.ExtendedPoint.BASE,
  P: typeof ed25519.ExtendedPoint.BASE,
  a: bigint[],
  b: bigint[]
): InnerProductProof {
  const n = a.length
  if (n !== b.length || n !== g.length || n !== h.length) {
    throw new Error('Vector length mismatch')
  }

  const L: Uint8Array[] = []
  const R: Uint8Array[] = []
  
  let aVec: bigint[] = [...a]
  let bVec: bigint[] = [...b]
  let gVec: typeof ed25519.ExtendedPoint.BASE[] = [...g]
  let hVec: typeof ed25519.ExtendedPoint.BASE[] = [...h]
  
  while (aVec.length > 1) {
    const nPrime = aVec.length / 2
    
    const aL = aVec.slice(0, nPrime)
    const aR = aVec.slice(nPrime)
    const bL = bVec.slice(0, nPrime)
    const bR = bVec.slice(nPrime)
    const gL = gVec.slice(0, nPrime)
    const gR = gVec.slice(nPrime)
    const hL = hVec.slice(0, nPrime)
    const hR = hVec.slice(nPrime)
    
    const cL = VectorOps.innerProduct(aL, bR)
    const cR = VectorOps.innerProduct(aR, bL)
    
    const LPoints: typeof ed25519.ExtendedPoint.BASE[] = [...gR, ...hL, u]
    const LScalars: bigint[] = [...aL, ...bR, cL]
    const LPoint = multiExp(LPoints, LScalars)
    
    const RPoints: typeof ed25519.ExtendedPoint.BASE[] = [...gL, ...hR, u]
    const RScalars: bigint[] = [...aR, ...bL, cR]
    const RPoint = multiExp(RPoints, RScalars)
    
    L.push(LPoint.toRawBytes())
    R.push(RPoint.toRawBytes())
    
    transcript.append('L', LPoint.toRawBytes())
    transcript.append('R', RPoint.toRawBytes())
    const x = transcript.challenge('x')
    const xInv = modInverse(x, ed25519.CURVE.n)
    
    aVec = VectorOps.add(VectorOps.scale(aL, x), VectorOps.scale(aR, xInv))
    bVec = VectorOps.add(VectorOps.scale(bL, xInv), VectorOps.scale(bR, x))
    
    gVec = []
    hVec = []
    for (let i = 0; i < nPrime; i++) {
      const gLi = gL[i] as typeof ed25519.ExtendedPoint.BASE
      const gRi = gR[i] as typeof ed25519.ExtendedPoint.BASE
      const hLi = hL[i] as typeof ed25519.ExtendedPoint.BASE
      const hRi = hR[i] as typeof ed25519.ExtendedPoint.BASE
      gVec.push(gLi.multiply(xInv).add(gRi.multiply(x)))
      hVec.push(hLi.multiply(x).add(hRi.multiply(xInv)))
    }
  }
  
  return { L, R, a: aVec[0], b: bVec[0] }
}

/**
 * Modular multiplicative inverse
 */
function modInverse(a: bigint, m: bigint): bigint {
  const egcd = (a: bigint, b: bigint): [bigint, bigint, bigint] => {
    if (a === 0n) return [b, 0n, 1n]
    const [g, x1, y1] = egcd(b % a, a)
    return [g, y1 - (b / a) * x1, x1]
  }
  
  const [g, x] = egcd(a % m, m)
  if (g !== 1n) throw new Error('Modular inverse does not exist')
  return (x % m + m) % m
}

/**
 * Generate a bulletproof for a value in range [0, 2^64)
 */
export function generateBulletproof(
  value: bigint,
  commitment: typeof ed25519.ExtendedPoint.BASE,
  blindingFactor: bigint
): Bulletproof {
  if (value < 0n || value >= (1n << BigInt(RANGE_BITS))) {
    throw new Error('Value out of range')
  }

  const transcript = new ProofTranscript('range_proof')
  const n = RANGE_BITS
  const generators = generateGenerators(n)
  const gVec = generators.g
  const hVec = generators.h
  
  // Commit to value
  transcript.append('commitment', commitment.toRawBytes())
  
  // Convert value to binary
  const aL = toBinaryVector(value, n)
  const aR = VectorOps.sub(aL, Array(n).fill(1n))
  
  // Blinding vectors
  const alpha = bytesToNumberLE(crypto.getRandomValues(new Uint8Array(32))) % ed25519.CURVE.n
  const sL = randomVector(n)
  const sR = randomVector(n)
  const rho = bytesToNumberLE(crypto.getRandomValues(new Uint8Array(32))) % ed25519.CURVE.n
  
  // Commitments
  const APoints: typeof ed25519.ExtendedPoint.BASE[] = [...gVec, ...hVec, H]
  const AScalars: bigint[] = [...aL, ...aR, alpha]
  const A = multiExp(APoints, AScalars)
  
  const SPoints: typeof ed25519.ExtendedPoint.BASE[] = [...gVec, ...hVec, H]
  const SScalars: bigint[] = [...sL, ...sR, rho]
  const S = multiExp(SPoints, SScalars)
  
  transcript.append('A', A.toRawBytes())
  transcript.append('S', S.toRawBytes())
  
  // Challenges
  const y = transcript.challenge('y')
  const z = transcript.challenge('z')
  
  // Compute t coefficients
  const yPowers = VectorOps.powers(y, n)
  const l0 = VectorOps.sub(aL, VectorOps.scale(Array(n).fill(1n), z))
  const l1 = sL
  const r0 = VectorOps.add(
    VectorOps.hadamard(yPowers, VectorOps.add(aR, VectorOps.scale(Array(n).fill(1n), z))),
    VectorOps.scale(Array(n).fill(1n), z * z)
  )
  const r1 = VectorOps.hadamard(yPowers, sR)
  
  const t0 = VectorOps.innerProduct(l0, r0)
  const t1_raw = VectorOps.innerProduct(VectorOps.add(l0, l1), VectorOps.add(r0, r1)) - t0
  const t1 = ((t1_raw % ed25519.CURVE.n) + ed25519.CURVE.n) % ed25519.CURVE.n
  const t2 = VectorOps.innerProduct(l1, r1)
  
  // Blinding factors for t
  const tau1 = bytesToNumberLE(crypto.getRandomValues(new Uint8Array(32))) % ed25519.CURVE.n
  const tau2 = bytesToNumberLE(crypto.getRandomValues(new Uint8Array(32))) % ed25519.CURVE.n
  
  // Commitments to t
  const T1 = G.multiply(t1).add(H.multiply(tau1))
  const T2 = G.multiply(t2).add(H.multiply(tau2))
  
  transcript.append('T1', T1.toRawBytes())
  transcript.append('T2', T2.toRawBytes())
  
  // Challenge x
  const x = transcript.challenge('x')
  
  // Compute final values
  const lVec = VectorOps.add(l0, VectorOps.scale(l1, x))
  const rVec = VectorOps.add(r0, VectorOps.scale(r1, x))
  const tx = (t0 + t1 * x + t2 * x * x) % ed25519.CURVE.n
  const taux = (tau1 * x + tau2 * x * x + z * z * blindingFactor) % ed25519.CURVE.n
  const mu = (alpha + rho * x) % ed25519.CURVE.n
  
  // Inner product argument
  transcript.append('tau_x', numberToBytesBE(taux, 32))
  transcript.append('mu', numberToBytesBE(mu, 32))
  transcript.append('t', numberToBytesBE(tx, 32))
  
  const hPrime = hVec.map((h, i) => {
    const yInv = modInverse(yPowers[i] ?? 1n, ed25519.CURVE.n)
    return h.multiply(yInv)
  })
  const PPoints: typeof ed25519.ExtendedPoint.BASE[] = [...gVec, ...hPrime, G, H]
  const PScalars: bigint[] = [...lVec, ...rVec, tx, mu]
  const P = multiExp(PPoints, PScalars)
  
  // Generate u point from challenge
  const uChallenge = transcript.challenge('u')
  const uBytes = numberToBytesBE(uChallenge, 32)
  let uHash = sha256(uBytes)
  
  // Hash until we get a valid point
  let u: typeof ed25519.ExtendedPoint.BASE
  while (true) {
    try {
      u = ed25519.ExtendedPoint.fromHex(bytesToHex(uHash))
      break
    } catch {
      uHash = sha256(uHash)
    }
  }
  const innerProduct = innerProductArgument(transcript, gVec, hPrime, u, P, lVec, rVec)
  
  return {
    A: A.toRawBytes(),
    S: S.toRawBytes(),
    T1: T1.toRawBytes(),
    T2: T2.toRawBytes(),
    taux,
    mu,
    tx,
    innerProduct
  }
}

/**
 * Verify a bulletproof
 */
export function verifyBulletproof(
  proof: Bulletproof,
  commitment: typeof ed25519.ExtendedPoint.BASE
): boolean {
  try {
    const transcript = new ProofTranscript('range_proof')
    const n = RANGE_BITS
    const generators = generateGenerators(n)
  const gVec = generators.g
  const hVec = generators.h
    
    // Reconstruct transcript
    transcript.append('commitment', commitment.toRawBytes())
    transcript.append('A', proof.A)
    transcript.append('S', proof.S)
    
    const y = transcript.challenge('y')
    const z = transcript.challenge('z')
    
    transcript.append('T1', proof.T1)
    transcript.append('T2', proof.T2)
    
    const x = transcript.challenge('x')
    
    transcript.append('tau_x', numberToBytesBE(proof.taux, 32))
    transcript.append('mu', numberToBytesBE(proof.mu, 32))
    transcript.append('t', numberToBytesBE(proof.tx, 32))
    
    // Verify main equation
    const yPowers = VectorOps.powers(y, n)
    const delta = ((z - z * z) * yPowers.reduce((a, b) => (a + b) % ed25519.CURVE.n, 0n) - z * z * z * BigInt(n)) % ed25519.CURVE.n
    
    const lhs = G.multiply(proof.tx).add(H.multiply(proof.taux))
    const rhs = commitment.multiply(z * z)
      .add(G.multiply(delta))
      .add(ed25519.ExtendedPoint.fromHex(bytesToHex(proof.T1)).multiply(x))
      .add(ed25519.ExtendedPoint.fromHex(bytesToHex(proof.T2)).multiply(x * x))
    
    if (!lhs.equals(rhs)) return false
    
    // Verify inner product
    // Generate u point from challenge
  const uChallenge = transcript.challenge('u')
  const uBytes = numberToBytesBE(uChallenge, 32)
  let uHash = sha256(uBytes)
  
  // Hash until we get a valid point
  let u: typeof ed25519.ExtendedPoint.BASE
  while (true) {
    try {
      u = ed25519.ExtendedPoint.fromHex(bytesToHex(uHash))
      break
    } catch {
      uHash = sha256(uHash)
    }
  }
    const hPrime = hVec.map((h, i) => {
    const yInv = modInverse(yPowers[i] ?? 1n, ed25519.CURVE.n)
    return h.multiply(yInv)
  })
    
    // Compute P
    const P = ed25519.ExtendedPoint.fromHex(bytesToHex(proof.A))
      .add(ed25519.ExtendedPoint.fromHex(bytesToHex(proof.S)).multiply(x))
      .add(multiExp(gVec, VectorOps.scale(Array(n).fill(1n), (ed25519.CURVE.n - z) % ed25519.CURVE.n)))
      .add(multiExp(hPrime, VectorOps.add(
        VectorOps.scale(yPowers, z),
        VectorOps.scale(VectorOps.powers(y, n), z * z)
      )))
      .add(H.multiply((ed25519.CURVE.n - proof.mu) % ed25519.CURVE.n))
      .add(u.multiply(proof.tx))
    
    // Verify inner product proof
    let gCur = [...gVec]
    let hCur = [...hPrime]
    let PCur = P
    
    for (let i = 0; i < proof.innerProduct.L.length; i++) {
      const L = ed25519.ExtendedPoint.fromHex(bytesToHex(proof.innerProduct.L[i]))
      const R = ed25519.ExtendedPoint.fromHex(bytesToHex(proof.innerProduct.R[i]))
      
      transcript.append('L', proof.innerProduct.L[i])
      transcript.append('R', proof.innerProduct.R[i])
      const xi = transcript.challenge('x')
      const xiInv = modInverse(xi, ed25519.CURVE.n)
      
      PCur = L.multiply(xi * xi).add(PCur).add(R.multiply(xiInv * xiInv))
      
      const nPrime = gCur.length / 2
      const newG: typeof ed25519.ExtendedPoint.BASE[] = []
      const newH: typeof ed25519.ExtendedPoint.BASE[] = []
      
      for (let j = 0; j < nPrime; j++) {
        const gL = gCur[j]
        const gR = gCur[j + nPrime]
        const hL = hCur[j]
        const hR = hCur[j + nPrime]
        if (gL && gR) {
          newG.push(gL.multiply(xiInv).add(gR.multiply(xi)))
        }
        if (hL && hR) {
          newH.push(hL.multiply(xi).add(hR.multiply(xiInv)))
        }
      }
      
      gCur = newG
      hCur = newH
    }
    
    // Final verification
    const g0 = gCur[0]
    const h0 = hCur[0]
    if (!g0 || !h0) return false
    
    const expected = (g0 as typeof ed25519.ExtendedPoint.BASE).multiply(proof.innerProduct.a)
      .add((h0 as typeof ed25519.ExtendedPoint.BASE).multiply(proof.innerProduct.b))
      .add(u.multiply((proof.innerProduct.a * proof.innerProduct.b) % ed25519.CURVE.n))
    
    return PCur.equals(expected)
  } catch {
    return false
  }
}

/**
 * Serialize bulletproof to bytes
 */
export function serializeBulletproof(proof: Bulletproof): Uint8Array {
  const innerProductLength = proof.innerProduct.L.length
  const totalSize = 32 * 4 + 32 * 3 + 32 * 2 + 32 * 2 * innerProductLength
  
  const result = new Uint8Array(totalSize)
  let offset = 0
  
  // Fixed-size components
  result.set(proof.A, offset); offset += 32
  result.set(proof.S, offset); offset += 32
  result.set(proof.T1, offset); offset += 32
  result.set(proof.T2, offset); offset += 32
  
  // Scalars
  const tauxBytes = numberToBytesBE(proof.taux, 32)
  result.set(tauxBytes, offset); offset += 32
  
  const muBytes = numberToBytesBE(proof.mu, 32)
  result.set(muBytes, offset); offset += 32
  
  const txBytes = numberToBytesBE(proof.tx, 32)
  result.set(txBytes, offset); offset += 32
  
  // Inner product proof
  for (const L of proof.innerProduct.L) {
    result.set(L, offset); offset += 32
  }
  for (const R of proof.innerProduct.R) {
    result.set(R, offset); offset += 32
  }
  
  const aBytes = numberToBytesBE(proof.innerProduct.a, 32)
  result.set(aBytes, offset); offset += 32
  
  const bBytes = numberToBytesBE(proof.innerProduct.b, 32)
  result.set(bBytes, offset); offset += 32
  
  return result
}

/**
 * Deserialize bulletproof from bytes
 */
export function deserializeBulletproof(data: Uint8Array): Bulletproof {
  if (data.length < 224) { // Minimum size
    throw new Error('Invalid bulletproof data')
  }
  
  let offset = 0
  
  const A = data.slice(offset, offset + 32); offset += 32
  const S = data.slice(offset, offset + 32); offset += 32
  const T1 = data.slice(offset, offset + 32); offset += 32
  const T2 = data.slice(offset, offset + 32); offset += 32
  
  const taux = bytesToNumberLE(data.slice(offset, offset + 32)); offset += 32
  const mu = bytesToNumberLE(data.slice(offset, offset + 32)); offset += 32
  const tx = bytesToNumberLE(data.slice(offset, offset + 32)); offset += 32
  
  // Calculate inner product proof length
  const remaining = data.length - offset
  const innerProductRounds = (remaining - 64) / 64
  
  const L: Uint8Array[] = []
  const R: Uint8Array[] = []
  
  for (let i = 0; i < innerProductRounds; i++) {
    L.push(data.slice(offset, offset + 32)); offset += 32
  }
  for (let i = 0; i < innerProductRounds; i++) {
    R.push(data.slice(offset, offset + 32)); offset += 32
  }
  
  const a = bytesToNumberLE(data.slice(offset, offset + 32)); offset += 32
  const b = bytesToNumberLE(data.slice(offset, offset + 32)); offset += 32
  
  return {
    A, S, T1, T2, taux, mu, tx,
    innerProduct: { L, R, a, b }
  }
}