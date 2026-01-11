import { router } from './trpc'
import { providerRouter } from './routers/provider'
import { imageRouter } from './routers/image'

export const appRouter = router({
  provider: providerRouter,
  image: imageRouter
})

export type AppRouter = typeof appRouter
