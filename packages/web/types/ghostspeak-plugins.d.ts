/**
 * Type declarations for plugins without bundled types
 */

declare module '@ghostspeak/plugin-gateway-ghost' {
  import type { Plugin } from '@elizaos/core'
  export const aiGatewayPlugin: Plugin
}

declare module '@elizaos/plugin-sql' {
  import type { Plugin } from '@elizaos/core'
  const sqlPlugin: Plugin
  export default sqlPlugin
}

declare module '@elizaos/plugin-mcp' {
  import type { Plugin } from '@elizaos/core'
  const mcpPlugin: Plugin
  export default mcpPlugin
}
