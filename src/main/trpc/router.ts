import { router } from './trpc'
import { providerRouter } from './routers/provider'

export const appRouter = router({
  provider: providerRouter
})

export type AppRouter = typeof appRouter
