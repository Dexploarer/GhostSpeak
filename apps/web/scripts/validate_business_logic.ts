
import { spawn } from 'child_process'

const BASE_URL = 'http://localhost:3333'

async function request(method: string, path: string, headers: Record<string, string> = {}, body?: any) {
    try {
        const res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: body ? JSON.stringify(body) : undefined
        })
        return {
            status: res.status,
            headers: res.headers,
            data: await res.json().catch(() => ({}))
        }
    } catch (e) {
        return { status: 599, error: e }
    }
}

async function runValidation() {
    console.log('🔄 Starting Business Logic Validation...\n')

    const results: any[] = []

    // 1. Validate Public Endpoint (Discovery)
    console.log('1️⃣  Validating Public Endpoint (Discovery)...')
    const discRes = await request('GET', '/api/v1/discovery')
    if (discRes.status === 200) {
        console.log('✅ Public endpoint accessible (200 OK)')
    } else {
        console.log(`❌ Public endpoint failed: ${discRes.status}`)
    }
    results.push({ name: 'Public Access', status: discRes.status === 200 ? 'PASS' : 'FAIL' })

    // 2. Validate Rate Limiting (Free Tier)
    console.log('\n2️⃣  Validating Rate Limiting (Free Tier ~10 reqs)...')
    let limited = false
    for (let i = 0; i < 15; i++) {
        const res = await request('GET', '/api/v1/discovery')
        if (res.status === 429) {
            console.log(`✅ Rate limit triggered at request #${i + 1} (429 Too Many Requests)`)
            limited = true
            break
        }
    }
    if (!limited) console.log('❌ Rate limit NOT triggered (Failed)')
    results.push({ name: 'Rate Limiting', status: limited ? 'PASS' : 'FAIL' })

    // Wait for rate limit to potentially reset (or just move to next test with different IP/header if possible? No, IP based)
    // We can't easily reset, so we'll test other endpoints that share the bucket?
    // Actually rate limits are per-request path? No, `rate:${walletAddress}`. 
    // Code: `const key = \`rate:${walletAddress}\``
    // If we don't send wallet address, it uses IP. So all my requests are rate limited now.
    // I can simulate different users by sending `x-wallet-address` header!

    // 3. Validate Paid Endpoint (Register) - No Payment
    console.log('\n3️⃣  Validating Paid Endpoint (Register) - No Payment...')
    const regRes = await request('POST', '/api/v1/agent/register', {
        'x-wallet-address': 'user_2' // New user to bypass IP rate limit
    }, { agentAddress: '11111111111111111111111111111111' })

    if (regRes.status === 402) {
        console.log('✅ Payment Required enforced (402 Payment Required)')
    } else {
        console.log(`❌ Payment check failed: ${regRes.status}`)
    }
    results.push({ name: 'x402 Enforcement', status: regRes.status === 402 ? 'PASS' : 'FAIL' })

    // 4. Validate Paid Endpoint - With Fake Payment
    console.log('\n4️⃣  Validating Paid Endpoint - With Payment Signature...')
    const paidRes = await request('POST', '/api/v1/agent/register', {
        'x-wallet-address': 'user_3',
        'X-Payment-Signature': 'fake_signature_for_testing_123'
    }, {
        agentAddress: '11111111111111111111111111111111' // Invalid length/format check might hit next
    })

    // We expect 400 (Invalid Solana address format) or 200.
    // The middleware only checks signature presence.
    // The route handler checks address format.
    if (paidRes.status === 400 || paidRes.status === 200) {
        console.log(`✅ Payment accepted, proceeded to logic (Status: ${paidRes.status})`)
    } else if (paidRes.status === 402) {
        console.log('❌ Payment signature ignored (Still 402)')
    } else {
        console.log(`❓ Unexpected status: ${paidRes.status}`)
    }
    results.push({ name: 'x402 Payment Flow', status: (paidRes.status === 400 || paidRes.status === 200) ? 'PASS' : 'FAIL' })

    // 5. Validate Admin Whitelist (Bypassing Rate Limit)
    console.log('\n5️⃣  Validating Admin Whitelist...')
    // Admin wallet from .env.local: FmK3v7JgujgrzaMYTJaKgkDRpZUMReMUSwV7E1CLvDRf
    const adminWallet = 'FmK3v7JgujgrzaMYTJaKgkDRpZUMReMUSwV7E1CLvDRf'
    let adminLimited = false
    for (let i = 0; i < 15; i++) {
        const res = await request('GET', '/api/v1/discovery', {
            'x-wallet-address': adminWallet
        })
        if (res.status === 429) {
            adminLimited = true
            break
        }
    }

    if (!adminLimited) {
        console.log('✅ Admin bypassed rate limits (15+ requests successful)')
    } else {
        console.log('❌ Admin was rate limited!')
    }
    results.push({ name: 'Admin Whitelist', status: !adminLimited ? 'PASS' : 'FAIL' })

    console.log('\n════════════════════════════════════════')
    console.log('       VALIDATION SUMMARY')
    console.log('════════════════════════════════════════')
    results.forEach(r => console.log(`${r.status === 'PASS' ? '✅' : '❌'} ${r.name}: ${r.status}`))
    console.log('════════════════════════════════════════')
}

runValidation()
