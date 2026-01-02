import { address } from '@solana/addresses'
import { getProgramDerivedAddress } from '@solana/addresses'
import bs58 from 'bs58'

const PROGRAM_ID = address('4wHjA2a5YC4twZb4NQpwZpixo5FgxxzuJUrCG7UnF9pB')
const SIGNER = address('JQ4xZgWno1tmWkKFgER5XSrXpWzwmsU9ov7Vf8CsBkk')
const AGENT_ID = 'e8abdbe1875540dd8ff67e8b31d9365e'

async function main() {
  const encoder = new TextEncoder()
  const signerBytes = bs58.decode(SIGNER)
  
  const [pda, bump] = await getProgramDerivedAddress({
    programAddress: PROGRAM_ID,
    seeds: [
      encoder.encode('agent'),
      signerBytes,
      encoder.encode(AGENT_ID)
    ]
  })
  console.log('Agent PDA:', pda)
  console.log('Bump:', bump)
}

main().catch(console.error)
