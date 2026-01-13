/**
 * Check and migrate Caisper endpoints
 */

import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

const OLD_ADDRESS = 'DwQDiEQzk5QAdYvA8aBcf9txLCUhV1MG5zzoDcDLnEqc'
const NEW_ADDRESS = process.env.CAISPER_WALLET_ADDRESS!

async function main() {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

    console.log('Checking endpoints...')
    console.log('')

    // Check old wallet endpoints
    const oldEndpoints = await convex.query(api.observation.listEndpoints, {
        agentAddress: OLD_ADDRESS
    })
    console.log(`Old wallet (${OLD_ADDRESS.slice(0, 8)}...): ${oldEndpoints?.length || 0} endpoints`)
    if (oldEndpoints && oldEndpoints.length > 0) {
        oldEndpoints.forEach((ep: any) => console.log('  -', ep.endpoint))
    }

    // Check new wallet endpoints
    const newEndpoints = await convex.query(api.observation.listEndpoints, {
        agentAddress: NEW_ADDRESS
    })
    console.log('')
    console.log(`New wallet (${NEW_ADDRESS.slice(0, 8)}...): ${newEndpoints?.length || 0} endpoints`)

    if (oldEndpoints && oldEndpoints.length > 0 && (!newEndpoints || newEndpoints.length === 0)) {
        console.log('')
        console.log('⚠️  Endpoints need to be migrated or recreated for new wallet')
        console.log('   The endpoints are associated with the old compromised wallet')
    }
}

main()
