import nacl from 'tweetnacl'
import bs58 from 'bs58'

/**
 * Verify a Solana wallet signature
 *
 * @param message The plain text message that was signed
 * @param signature The base58 encoded signature
 * @param publicKey The base58 encoded public key (wallet address)
 * @returns boolean indicating if the signature is valid
 */
export function verifyWalletSignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message)
    const signatureBytes = bs58.decode(signature)
    const publicKeyBytes = bs58.decode(publicKey)

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}
