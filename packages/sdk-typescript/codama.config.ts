import { defineConfig } from '@codama/core'
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor'
import { renderJavaScriptVisitor } from '@codama/renderers-js'
import path from 'path'
import { readFileSync } from 'fs'

// Load the IDL file
const idlPath = path.join('..', '..', 'target', 'idl', 'ghostspeak_marketplace.json')
const idl = JSON.parse(readFileSync(idlPath, 'utf8'))

export default defineConfig({
  root: rootNodeFromAnchor(idl),
  visitors: [
    renderJavaScriptVisitor({
      outDir: path.join('src', 'generated'),
      useSharedPrograms: true,
      useSharedTypes: true,
      useSharedAccounts: true,
      useSharedInstructions: true,
      useSharedErrors: true,
      renderPdas: true,
      renderConstants: true,
      renderEvents: true,
      renderTypes: true,
      renderAccounts: true,
      renderInstructions: true,
      renderPrograms: true,
      renderErrors: true,
      moduleBoundary: 'program'
    })
  ]
})