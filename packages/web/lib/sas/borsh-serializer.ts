/**
 * Custom Borsh serialization for SAS attestation data
 *
 * This bypasses sas-lib@1.0.10's bug where type 25 (VecString) is incorrectly
 * mapped to CHAR_SCHEMA instead of Vec<String>.
 *
 * The on-chain Solana program expects:
 * - Type 25 = VecString (Vec<String>)
 * - Type 24 = VecChar (Vec<[u8; 4]>)
 *
 * But sas-lib@1.0.10 has them reversed in compactLayoutMapping.
 */

/**
 * Serialize a single string to Borsh format
 */
function serializeString(str: string): Uint8Array {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(str)
  const len = new Uint8Array(4)
  new DataView(len.buffer).setUint32(0, bytes.length, true) // little-endian
  return new Uint8Array([...len, ...bytes])
}

/**
 * Serialize Vec<String> to Borsh format
 */
function serializeVecString(strings: string[]): Uint8Array {
  const vecLen = new Uint8Array(4)
  new DataView(vecLen.buffer).setUint32(0, strings.length, true) // little-endian

  const serializedStrings = strings.map(serializeString)
  const totalLength = 4 + serializedStrings.reduce((sum, s) => sum + s.length, 0)

  const result = new Uint8Array(totalLength)
  result.set(vecLen, 0)

  let offset = 4
  for (const s of serializedStrings) {
    result.set(s, offset)
    offset += s.length
  }

  return result
}

/**
 * Serialize i64 to Borsh format
 */
function serializeI64(value: number): Uint8Array {
  const bytes = new Uint8Array(8)
  const view = new DataView(bytes.buffer)
  view.setBigInt64(0, BigInt(value), true) // little-endian
  return bytes
}

/**
 * Serialize boolean to Borsh format
 */
function serializeBool(value: boolean): Uint8Array {
  return new Uint8Array([value ? 1 : 0])
}

/**
 * Serialize AgentIdentityData according to the on-chain schema
 *
 * Layout: [12, 12, 12, 25, 10, 12, 12, 8, 8]
 * Fields:
 *   [0] agent: String (type 12)
 *   [1] did: String (type 12)
 *   [2] name: String (type 12)
 *   [3] capabilities: VecString (type 25)  <-- Custom serialization here!
 *   [4] x402Enabled: bool (type 10)
 *   [5] x402ServiceEndpoint: String (type 12)
 *   [6] owner: String (type 12)
 *   [7] registeredAt: i64 (type 8)
 *   [8] issuedAt: i64 (type 8)
 */
export function serializeAgentIdentityData(data: {
  agent: string
  did: string
  name: string
  capabilities: string[]
  x402Enabled: boolean
  x402ServiceEndpoint: string
  owner: string
  registeredAt: number
  issuedAt: number
}): Uint8Array {
  const parts: Uint8Array[] = [
    serializeString(data.agent),
    serializeString(data.did),
    serializeString(data.name),
    serializeVecString(data.capabilities), // Type 25 - VecString
    serializeBool(data.x402Enabled),
    serializeString(data.x402ServiceEndpoint),
    serializeString(data.owner),
    serializeI64(data.registeredAt),
    serializeI64(data.issuedAt),
  ]

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0)
  const result = new Uint8Array(totalLength)

  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }

  return result
}

/**
 * Deserialize a string from Borsh format
 */
function deserializeString(
  bytes: Uint8Array,
  offset: number
): { value: string; newOffset: number } {
  const len = new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true)
  const decoder = new TextDecoder()
  const value = decoder.decode(bytes.slice(offset + 4, offset + 4 + len))
  return { value, newOffset: offset + 4 + len }
}

/**
 * Deserialize Vec<String> from Borsh format
 */
function deserializeVecString(
  bytes: Uint8Array,
  offset: number
): { value: string[]; newOffset: number } {
  const vecLen = new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true)
  offset += 4

  const strings: string[] = []
  for (let i = 0; i < vecLen; i++) {
    const { value, newOffset } = deserializeString(bytes, offset)
    strings.push(value)
    offset = newOffset
  }

  return { value: strings, newOffset: offset }
}

/**
 * Deserialize i64 from Borsh format
 */
function deserializeI64(bytes: Uint8Array, offset: number): { value: bigint; newOffset: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset)
  const value = view.getBigInt64(offset, true)
  return { value, newOffset: offset + 8 }
}

/**
 * Deserialize boolean from Borsh format
 */
function deserializeBool(bytes: Uint8Array, offset: number): { value: boolean; newOffset: number } {
  return { value: bytes[offset] !== 0, newOffset: offset + 1 }
}

/**
 * Deserialize AgentIdentityData from bytes
 */
export function deserializeAgentIdentityData(bytes: Uint8Array): {
  agent: string
  did: string
  name: string
  capabilities: string[]
  x402Enabled: boolean
  x402ServiceEndpoint: string
  owner: string
  registeredAt: bigint
  issuedAt: bigint
} {
  let offset = 0

  const agent = deserializeString(bytes, offset)
  offset = agent.newOffset

  const did = deserializeString(bytes, offset)
  offset = did.newOffset

  const name = deserializeString(bytes, offset)
  offset = name.newOffset

  const capabilities = deserializeVecString(bytes, offset)
  offset = capabilities.newOffset

  const x402Enabled = deserializeBool(bytes, offset)
  offset = x402Enabled.newOffset

  const x402ServiceEndpoint = deserializeString(bytes, offset)
  offset = x402ServiceEndpoint.newOffset

  const owner = deserializeString(bytes, offset)
  offset = owner.newOffset

  const registeredAt = deserializeI64(bytes, offset)
  offset = registeredAt.newOffset

  const issuedAt = deserializeI64(bytes, offset)

  return {
    agent: agent.value,
    did: did.value,
    name: name.value,
    capabilities: capabilities.value,
    x402Enabled: x402Enabled.value,
    x402ServiceEndpoint: x402ServiceEndpoint.value,
    owner: owner.value,
    registeredAt: registeredAt.value,
    issuedAt: issuedAt.value,
  }
}
