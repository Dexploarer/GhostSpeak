import fs from 'fs'
import path from 'path'

// Define the root directory for docs
const DOCS_ROOT = path.join(process.cwd(), '../../docs')
const LOCAL_DOCS = path.join(process.cwd(), 'docs')

export const fileMap: Record<string, string> = {
  '': 'ARCHITECTURE.md',
  'quickstart': 'QUICKSTART_GUIDE.md',
  'deployment': 'DEPLOYMENT.md',
  'architecture': 'ARCHITECTURE.md',
  'x402-protocol': 'X402_PAYMENT_FLOW.md',
  'privacy': 'AGENT_COMMUNICATION_ENHANCEMENTS.md', 
  'sdk': 'API.md',
  'api': 'X402_AGENT_DISCOVERY_API.md',
  'examples': 'X402_API_EXAMPLES.md',
  'network-readiness': 'NETWORK_READINESS_REPORT.md',
  'security': 'SECURITY.md',
}

export async function getDocBySlug(slug: string[]) {
  const slugPath = slug.join('/')
  const fileName = fileMap[slugPath] || (slugPath ? `${slugPath.toUpperCase().replace('-', '_')}.md` : 'ARCHITECTURE.md')
  
  // Potential locations for the documentation files
  const searchPaths = [
    path.join(process.cwd(), '../../docs', fileName),
    path.join(process.cwd(), 'docs', fileName),
    path.join(process.cwd(), '../../docs', `${slugPath}.md`),
    path.join(process.cwd(), 'docs', `${slugPath}.md`),
    path.join(process.cwd(), '../../docs', `${slugPath.replace('-', '_')}.md`),
    path.join(process.cwd(), 'docs', `${slugPath.replace('-', '_')}.md`),
  ]

  let source = ''
  let foundPath = ''

  for (const p of searchPaths) {
    if (fs.existsSync(p) && fs.lstatSync(p).isFile()) {
      source = fs.readFileSync(p, 'utf8')
      foundPath = p
      break
    }
  }

  if (!source) {
    console.error(`Doc not found for slug: ${slugPath}. Searched in:`, searchPaths)
    return null
  }

  // Extract title from the markdown content
  let title = ''
  const titleMatch = source.match(/^#\s+(.+)$/m)
  if (titleMatch) {
    title = titleMatch[1]
  } else {
    // Fallback title from slug
    title = slugPath.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return {
    source,
    title,
    path: foundPath,
  }
}
