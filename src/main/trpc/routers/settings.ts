import { router, publicProcedure } from '../trpc'
import { getDatabase } from '@main/db'
import { settings } from '@main/db/schema'
import { eq } from 'drizzle-orm'
import { updateImageCompressionInputSchema } from '@shared/schema/trpc/settings'

export const settingsRouter = router({
  get: publicProcedure.query(async () => {
    const db = getDatabase()
    const result = await db.select().from(settings).where(eq(settings.id, 'default')).limit(1)
    return result[0] || null
  }),

  updateImageCompression: publicProcedure
    .input(updateImageCompressionInputSchema)
    .mutation(async ({ input }) => {
      const db = getDatabase()
      const existing = await db.select().from(settings).where(eq(settings.id, 'default')).limit(1)

      if (existing.length > 0) {
        await db.update(settings)
          .set({
            imageCompression: input,
            updatedAt: new Date()
          })
          .where(eq(settings.id, 'default'))
      } else {
        await db.insert(settings).values({
          id: 'default',
          imageCompression: input
        })
      }

      return { success: true }
    })
})
