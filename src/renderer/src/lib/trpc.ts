import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@main/trpc/router'
import type { inferRouterOutputs } from '@trpc/server'

export const trpc = createTRPCReact<AppRouter>()

// Infer types from tRPC router outputs
type RouterOutputs = inferRouterOutputs<AppRouter>

// Provider type as returned by tRPC (with serialized dates)
export type TRPCProvider = NonNullable<RouterOutputs['provider']['getById']>
export type TRPCProviderList = RouterOutputs['provider']['list']
