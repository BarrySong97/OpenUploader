import { createTRPCProxyClient } from '@trpc/client'
import { ipcLink } from 'trpc-electron/renderer'
import type { AppRouter } from '../../../main/trpc/router'

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [ipcLink()]
})
