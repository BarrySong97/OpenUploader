import { z } from 'zod'
import { publicProcedure, router } from '../trpc'
import {
  getAllPresets,
  getPresetById,
  createPreset,
  updatePreset,
  deletePreset
} from '@main/services/preset-service'
import { createPresetInputSchema, updatePresetInputSchema } from '@shared/schema/settings'

export const presetRouter = router({
  list: publicProcedure.query(async () => {
    return getAllPresets()
  }),

  get: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const preset = await getPresetById(input.id)
    if (!preset) {
      throw new Error(`Preset with id ${input.id} not found`)
    }
    return preset
  }),

  create: publicProcedure.input(createPresetInputSchema).mutation(async ({ input }) => {
    return createPreset(input)
  }),

  update: publicProcedure.input(updatePresetInputSchema).mutation(async ({ input }) => {
    return updatePreset(input)
  }),

  delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    await deletePreset(input.id)
    return { success: true }
  })
})
