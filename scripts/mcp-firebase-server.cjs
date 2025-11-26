const admin = require('firebase-admin')
let McpServer
let StdioServerTransport
try {
  ({ McpServer } = require('@modelcontextprotocol/sdk/server/mcp'))
  ({ StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio'))
} catch (_) {}

async function main() {
  if (!McpServer || !StdioServerTransport) {
    const mcp = await import('@modelcontextprotocol/sdk/server/mcp.js')
    const stdio = await import('@modelcontextprotocol/sdk/server/stdio.js')
    McpServer = mcp.McpServer
    StdioServerTransport = stdio.StdioServerTransport
  }
  const projectId = process.env.FIREBASE_PROJECT_ID
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId })
  }
  const db = admin.firestore()

  const server = new McpServer({ name: 'firebase-mcp', version: '1.0.0' })

  server.registerTool(
    'list_collections',
    {
      title: 'List Firestore Collections',
      description: 'List top-level Firestore collection names',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: {
        type: 'object',
        properties: { collections: { type: 'array', items: { type: 'string' } } }
      }
    },
    async () => {
      const cols = await db.listCollections()
      const names = cols.map(c => c.id)
      const output = { collections: names }
      return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output }
    }
  )

  server.registerTool(
    'get_document',
    {
      title: 'Get Firestore Document',
      description: 'Fetch a document by full path, e.g., collection/docId',
      inputSchema: {
        type: 'object',
        required: ['path'],
        properties: { path: { type: 'string' } }
      },
      outputSchema: { type: 'object' }
    },
    async ({ path }) => {
      const ref = db.doc(path)
      const snap = await ref.get()
      const data = snap.exists ? { id: ref.id, path, data: snap.data() } : null
      const text = JSON.stringify(data)
      return { content: [{ type: 'text', text }], structuredContent: data }
    }
  )

  server.registerTool(
    'query_equal',
    {
      title: 'Query Firestore Equal',
      description: 'Query a collection with field == value',
      inputSchema: {
        type: 'object',
        required: ['collection', 'field', 'value'],
        properties: {
          collection: { type: 'string' },
          field: { type: 'string' },
          value: { type: ['string', 'number', 'boolean'] }
        }
      },
      outputSchema: {
        type: 'object',
        properties: { documents: { type: 'array', items: { type: 'object' } } }
      }
    },
    async ({ collection, field, value }) => {
      const querySnap = await db.collection(collection).where(field, '==', value).limit(50).get()
      const documents = querySnap.docs.map(d => ({ id: d.id, data: d.data() }))
      const output = { documents }
      return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output }
    }
  )

  server.registerTool(
    'create_document',
    {
      title: 'Create Firestore Document',
      description: 'Create a document in a collection, optional custom id',
      inputSchema: {
        type: 'object',
        required: ['collection', 'data'],
        properties: {
          collection: { type: 'string' },
          id: { type: 'string' },
          data: { type: 'object' }
        }
      },
      outputSchema: { type: 'object' }
    },
    async ({ collection, id, data }) => {
      if (id && typeof id === 'string' && id.length > 0) {
        const ref = db.collection(collection).doc(id)
        await ref.set(data)
        const output = { id: ref.id, path: `${collection}/${ref.id}`, data }
        return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output }
      }
      const ref = await db.collection(collection).add(data)
      const output = { id: ref.id, path: `${collection}/${ref.id}`, data }
      return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output }
    }
  )

  server.registerTool(
    'update_document',
    {
      title: 'Update Firestore Document',
      description: 'Update a document by path, merge fields',
      inputSchema: {
        type: 'object',
        required: ['path', 'data'],
        properties: {
          path: { type: 'string' },
          data: { type: 'object' }
        }
      },
      outputSchema: { type: 'object' }
    },
    async ({ path, data }) => {
      const ref = db.doc(path)
      await ref.set(data, { merge: true })
      const output = { id: ref.id, path, data }
      return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output }
    }
  )

  server.registerTool(
    'delete_document',
    {
      title: 'Delete Firestore Document',
      description: 'Delete a document by path',
      inputSchema: {
        type: 'object',
        required: ['path'],
        properties: { path: { type: 'string' } }
      },
      outputSchema: { type: 'object' }
    },
    async ({ path }) => {
      const ref = db.doc(path)
      await ref.delete()
      const output = { deleted: true, path }
      return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output }
    }
  )

  server.registerTool(
    'query_advanced',
    {
      title: 'Advanced Firestore Query',
      description: 'Query with where filters, orderBy and limit',
      inputSchema: {
        type: 'object',
        required: ['collection'],
        properties: {
          collection: { type: 'string' },
          where: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'op', 'value'],
              properties: {
                field: { type: 'string' },
                op: { type: 'string' },
                value: { type: ['string', 'number', 'boolean', 'object', 'array', 'null'] }
              }
            }
          },
          orderBy: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field'],
              properties: {
                field: { type: 'string' },
                direction: { type: 'string' }
              }
            }
          },
          limit: { type: 'number' }
        }
      },
      outputSchema: {
        type: 'object',
        properties: { documents: { type: 'array', items: { type: 'object' } } }
      }
    },
    async ({ collection, where = [], orderBy = [], limit }) => {
      let q = db.collection(collection)
      if (Array.isArray(where)) {
        for (const w of where) {
          if (w && typeof w.field === 'string' && typeof w.op === 'string') {
            q = q.where(w.field, w.op, w.value)
          }
        }
      }
      if (Array.isArray(orderBy)) {
        for (const ob of orderBy) {
          if (ob && typeof ob.field === 'string') {
            const dir = typeof ob.direction === 'string' ? ob.direction : undefined
            q = dir ? q.orderBy(ob.field, dir) : q.orderBy(ob.field)
          }
        }
      }
      if (typeof limit === 'number' && isFinite(limit) && limit > 0) {
        q = q.limit(limit)
      }
      const snap = await q.get()
      const documents = snap.docs.map(d => ({ id: d.id, data: d.data() }))
      const output = { documents }
      return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output }
    }
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(err => {
  const msg = typeof err?.message === 'string' ? err.message : String(err)
  process.stderr.write(`MCP Firebase server error: ${msg}\n`)
  process.exit(1)
})
