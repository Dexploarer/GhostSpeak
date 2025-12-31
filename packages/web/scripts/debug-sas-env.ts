#!/usr/bin/env bun
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

const convexUrl = 'https://enduring-porpoise-79.convex.cloud'
const client = new ConvexHttpClient(convexUrl)

console.log('🔍 Checking SAS environment variables in Convex...\n')

const result = await client.action(api.debugSasEnv.checkSasEnvironment, {})

console.log('Result:')
console.log(JSON.stringify(result, null, 2))

process.exit(0)
