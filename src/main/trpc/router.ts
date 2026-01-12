import { router } from './trpc'
import { providerRouter } from './routers/provider'
import { imageRouter } from './routers/image'
import { settingsRouter } from './routers/settings'

export const appRouter = router({
  provider: providerRouter,
  image: imageRouter,
  settings: settingsRouter
})

export type AppRouter = typeof appRouter
