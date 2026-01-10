import { publicProcedure, router } from '../trpc'
import { providerSchema } from '../../../shared/schema/provider'
import { testConnection, getProviderStats } from '../../services/provider-service'

export const providerRouter = router({
  testConnection: publicProcedure.input(providerSchema).query(async ({ input }) => {
    return testConnection(input)
  }),

  getStats: publicProcedure.input(providerSchema).query(async ({ input }) => {
    return getProviderStats(input)
  })
})
