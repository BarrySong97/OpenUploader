import { router } from './trpc'
import { providerRouter } from './routers/provider'
import { imageRouter } from './routers/image'
import { presetRouter } from './routers/preset'

export const appRouter = router({
  provider: providerRouter,
  image: imageRouter,
  preset: presetRouter
})

export type AppRouter = typeof appRouter
