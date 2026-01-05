
import bs58 from 'bs58'
import nacl from 'tweetnacl'

async function testAuth() {
  console.log('Testing auth flow...')

  // Simulate Keypair
  const keypair = nacl.sign.keyPair()
  const publicKey = bs58.encode(keypair.publicKey)
  console.log('Public Key:', publicKey)

  // Message
  const message = `Sign this message to authenticate with GhostSpeak.\n\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`
  const messageBytes = new TextEncoder().encode(message)
  console.log('Message:', message)

  // Sign
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey)
  const signatureEncoded = bs58.encode(signature)
  console.log('Signature:', signatureEncoded)

  // Verify (Backend Logic)
  try {
    const pkBytes = bs58.decode(publicKey)
    const sigBytes = bs58.decode(signatureEncoded)
    const msgBytes = new TextEncoder().encode(message)

    const isValid = nacl.sign.detached.verify(msgBytes, sigBytes, pkBytes)
    console.log('Is Valid:', isValid)

    if (!isValid) {
      console.error('Validation failed!')
    } else {
      console.log('Validation success!')
    }
  } catch (e) {
    console.error('Error during verification:', e)
  }
}

testAuth()
