import Fastify from 'fastify'
import { sheetsRoutes } from './routes/sheets'
import { itemsRoutes } from './routes/items'
import { staticRoutes } from './routes/static'
import { downloadRoutes } from './routes/download'

const server = Fastify({ logger: true })

server.get('/api/health', async () => ({ ok: true }))

await server.register(sheetsRoutes)
await server.register(itemsRoutes)
await server.register(staticRoutes)
await server.register(downloadRoutes)

await server.listen({ port: 3001, host: '127.0.0.1' })