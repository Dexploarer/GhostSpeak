import { defineApp } from 'convex/server'
import rag from '@convex-dev/rag/convex.config'
import workflow from '@convex-dev/workflow/convex.config'

const app = defineApp()
app.use(rag)
app.use(workflow)

export default app
