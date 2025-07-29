import { describe, it, beforeAll } from 'vitest'
import { generateKeyPairSigner } from '@solana/signers'
import { 
  generateElGamalKeypair,
  encryptAmount,
  decryptAmount,
  createRangeProof,
  verifyRangeProof,
  aggregateElGamalCiphertexts,
  homomorphicAdd,
  batchEncrypt,
  batchDecrypt
} from '../src/utils/elgamal.js'
import { deriveEd25519Keypair } from '../src/utils/keypair.js'
import { generateBulletproof, verifyBulletproof } from '../src/utils/bulletproofs.js'
import { ZKProofBuilder } from '../src/utils/zk-proof-builder.js'

interface BenchmarkResult {
  operation: string
  iterations: number
  totalTime: number
  averageTime: number
  opsPerSecond: number
  minTime: number
  maxTime: number
}

class BenchmarkRunner {
  results: BenchmarkResult[] = []

  async run(
    name: string, 
    operation: () => Promise<void> | void, 
    iterations: number = 1000
  ): Promise<BenchmarkResult> {
    console.log(`\nBenchmarking: ${name}`)
    console.log(`Iterations: ${iterations}`)
    
    const times: number[] = []
    
    // Warmup
    for (let i = 0; i < 10; i++) {
      await operation()
    }
    
    // Actual benchmark
    const startTotal = performance.now()
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      await operation()
      const end = performance.now()
      times.push(end - start)
      
      if (i % 100 === 0 && i > 0) {
        process.stdout.write(`\r  Progress: ${i}/${iterations}`)
      }
    }
    
    const endTotal = performance.now()
    const totalTime = endTotal - startTotal
    
    const result: BenchmarkResult = {
      operation: name,
      iterations,
      totalTime,
      averageTime: totalTime / iterations,
      opsPerSecond: (iterations / totalTime) * 1000,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    }
    
    this.results.push(result)
    this.printResult(result)
    
    return result
  }
  
  printResult(result: BenchmarkResult): void {
    console.log(`\n  ✓ Completed ${result.iterations} iterations`)
    console.log(`  Total time: ${result.totalTime.toFixed(2)}ms`)
    console.log(`  Average: ${result.averageTime.toFixed(3)}ms`)
    console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(0)}`)
    console.log(`  Min: ${result.minTime.toFixed(3)}ms`)
    console.log(`  Max: ${result.maxTime.toFixed(3)}ms`)
  }
  
  printSummary(): void {
    console.log('\n📊 BENCHMARK SUMMARY')
    console.log('='.repeat(80))
    console.log(`${'Operation'.padEnd(40)} | ${'Avg (ms)'.padEnd(10)} | ${'Ops/sec'.padEnd(10)} | ${'Min-Max (ms)'.padEnd(15)}`)
    console.log('-'.repeat(80))
    
    this.results.forEach(r => {
      console.log(
        `${r.operation.padEnd(40)} | ${r.averageTime.toFixed(3).padEnd(10)} | ${
          r.opsPerSecond.toFixed(0).padEnd(10)
        } | ${r.minTime.toFixed(2)}-${r.maxTime.toFixed(2)}`
      )
    })
  }
}

describe('Cryptographic Operations Benchmarks', () => {
  const runner = new BenchmarkRunner()
  let elGamalKeypair: ReturnType<typeof generateElGamalKeypair>
  let zkProofBuilder: ZKProofBuilder
  
  beforeAll(() => {
    elGamalKeypair = generateElGamalKeypair()
    zkProofBuilder = new ZKProofBuilder({
      programId: 'ZkE1GamaLProof111111111111111111111111111111',
      maxBits: 64
    })
  })
  
  it('should benchmark key generation operations', async () => {
    // Ed25519 keypair generation
    await runner.run('Ed25519 Keypair Generation', () => {
      deriveEd25519Keypair()
    })
    
    // ElGamal keypair generation
    await runner.run('ElGamal Keypair Generation', () => {
      generateElGamalKeypair()
    })
    
    // Solana keypair generation
    await runner.run('Solana Keypair Generation', async () => {
      await generateKeyPairSigner()
    })
  })
  
  it('should benchmark ElGamal encryption operations', async () => {
    const amounts = [100n, 1000n, 1000000n, 1000000000n]
    
    for (const amount of amounts) {
      await runner.run(`ElGamal Encrypt (${amount})`, () => {
        encryptAmount(amount, elGamalKeypair.publicKey)
      })
    }
    
    // Batch encryption
    const batchAmounts = Array(10).fill(0).map((_, i) => BigInt(i * 1000))
    await runner.run('ElGamal Batch Encrypt (10 values)', () => {
      batchEncrypt(batchAmounts, elGamalKeypair.publicKey)
    }, 100)
  })
  
  it('should benchmark ElGamal decryption operations', async () => {
    const amounts = [100n, 1000n, 1000000n]
    const ciphertexts = amounts.map(a => encryptAmount(a, elGamalKeypair.publicKey))
    
    for (let i = 0; i < ciphertexts.length; i++) {
      await runner.run(`ElGamal Decrypt (${amounts[i]})`, () => {
        decryptAmount(ciphertexts[i], elGamalKeypair.secretKey)
      })
    }
    
    // Batch decryption
    const batchCiphertexts = Array(10).fill(0).map((_, i) => 
      encryptAmount(BigInt(i * 1000), elGamalKeypair.publicKey)
    )
    await runner.run('ElGamal Batch Decrypt (10 values)', () => {
      batchDecrypt(batchCiphertexts, elGamalKeypair.secretKey)
    }, 100)
  })
  
  it('should benchmark homomorphic operations', async () => {
    const amount1 = 1000n
    const amount2 = 2000n
    const ciphertext1 = encryptAmount(amount1, elGamalKeypair.publicKey)
    const ciphertext2 = encryptAmount(amount2, elGamalKeypair.publicKey)
    
    await runner.run('Homomorphic Addition', () => {
      homomorphicAdd(ciphertext1, ciphertext2)
    })
    
    // Aggregate multiple ciphertexts
    const ciphertexts = Array(5).fill(0).map((_, i) => 
      encryptAmount(BigInt(i * 100), elGamalKeypair.publicKey)
    )
    await runner.run('Aggregate 5 Ciphertexts', () => {
      aggregateElGamalCiphertexts(ciphertexts)
    }, 100)
  })
  
  it('should benchmark range proof operations', async () => {
    const amounts = [100n, 10000n, 1000000n]
    
    for (const amount of amounts) {
      const ciphertext = encryptAmount(amount, elGamalKeypair.publicKey)
      
      // Range proof generation
      await runner.run(`Range Proof Generation (${amount})`, () => {
        createRangeProof(ciphertext, amount, elGamalKeypair.secretKey)
      }, 100)
      
      // Range proof verification
      const proof = createRangeProof(ciphertext, amount, elGamalKeypair.secretKey)
      await runner.run(`Range Proof Verification (${amount})`, () => {
        verifyRangeProof(proof, ciphertext, elGamalKeypair.publicKey)
      }, 100)
    }
  })
  
  it('should benchmark bulletproof operations', async () => {
    const values = [100n, 10000n]
    
    for (const value of values) {
      // Bulletproof generation
      await runner.run(`Bulletproof Generation (${value})`, () => {
        generateBulletproof(value, 64n)
      }, 50)
      
      // Bulletproof verification
      const bulletproof = generateBulletproof(value, 64n)
      await runner.run(`Bulletproof Verification (${value})`, () => {
        verifyBulletproof(bulletproof, 64n)
      }, 50)
    }
  })
  
  it('should benchmark ZK proof builder operations', async () => {
    const amount = 1000000n
    const ciphertext = encryptAmount(amount, elGamalKeypair.publicKey)
    
    // Build equality proof
    await runner.run('ZK Equality Proof Build', async () => {
      await zkProofBuilder.buildEqualityProof({
        ciphertext,
        amount,
        publicKey: elGamalKeypair.publicKey,
        secretKey: elGamalKeypair.secretKey
      })
    }, 50)
    
    // Build validity proof
    await runner.run('ZK Validity Proof Build', async () => {
      await zkProofBuilder.buildValidityProof({
        ciphertext,
        publicKey: elGamalKeypair.publicKey
      })
    }, 50)
    
    // Build range proof
    await runner.run('ZK Range Proof Build', async () => {
      await zkProofBuilder.buildRangeProof({
        ciphertext,
        amount,
        publicKey: elGamalKeypair.publicKey,
        secretKey: elGamalKeypair.secretKey,
        bitLength: 32
      })
    }, 50)
  })
  
  it('should print benchmark summary', () => {
    runner.printSummary()
    
    // Performance expectations
    console.log('\n📈 PERFORMANCE ANALYSIS')
    console.log('='.repeat(80))
    
    const keyGenOps = runner.results.filter(r => r.operation.includes('Generation'))
    const encryptOps = runner.results.filter(r => r.operation.includes('Encrypt'))
    const proofOps = runner.results.filter(r => r.operation.includes('Proof'))
    
    const avgKeyGen = keyGenOps.reduce((sum, r) => sum + r.opsPerSecond, 0) / keyGenOps.length
    const avgEncrypt = encryptOps.reduce((sum, r) => sum + r.opsPerSecond, 0) / encryptOps.length
    const avgProof = proofOps.reduce((sum, r) => sum + r.opsPerSecond, 0) / proofOps.length
    
    console.log(`Average Key Generation: ${avgKeyGen.toFixed(0)} ops/sec`)
    console.log(`Average Encryption: ${avgEncrypt.toFixed(0)} ops/sec`)
    console.log(`Average Proof Operations: ${avgProof.toFixed(0)} ops/sec`)
    
    // Performance recommendations
    console.log('\n💡 RECOMMENDATIONS')
    console.log('-'.repeat(80))
    
    if (avgKeyGen < 1000) {
      console.log('⚠️  Key generation is slow. Consider caching keypairs.')
    }
    
    if (avgEncrypt < 5000) {
      console.log('⚠️  Encryption performance could be improved. Consider batch operations.')
    }
    
    if (avgProof < 100) {
      console.log('⚠️  Proof generation is computationally intensive. Use sparingly.')
    }
    
    console.log('\n✅ Cryptographic benchmarks completed!')
  })
})