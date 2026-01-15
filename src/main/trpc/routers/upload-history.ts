import { publicProcedure, router } from '../trpc'
import {
  listUploadsInputSchema,
  getStatsInputSchema,
  deleteRecordInputSchema,
  createRecordInputSchema,
  updateStatusInputSchema
} from '@shared/schema/trpc/upload-history'
import { uploadHistoryService } from '@main/services/upload-history-service'

export const uploadHistoryRouter = router({
  /**
   * List upload history with pagination and filtering
   */
  list: publicProcedure.input(listUploadsInputSchema).query(async ({ input }) => {
    return uploadHistoryService.listUploads(input)
  }),

  /**
   * Get upload statistics
   */
  getStats: publicProcedure.input(getStatsInputSchema).query(async ({ input }) => {
    return uploadHistoryService.getStats(input)
  }),

  /**
   * Create a new upload record
   */
  createRecord: publicProcedure.input(createRecordInputSchema).mutation(async ({ input }) => {
    return uploadHistoryService.createRecord(input)
  }),

  /**
   * Update upload status
   */
  updateStatus: publicProcedure.input(updateStatusInputSchema).mutation(async ({ input }) => {
    return uploadHistoryService.updateStatus(input.id, input.status, input.errorMessage)
  }),

  /**
   * Delete a record by ID
   */
  deleteRecord: publicProcedure.input(deleteRecordInputSchema).mutation(async ({ input }) => {
    const success = await uploadHistoryService.deleteRecord(input.id)
    return { success }
  })
})
