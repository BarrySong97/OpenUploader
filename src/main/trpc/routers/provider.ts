import { publicProcedure, router } from '../trpc'
import { z } from 'zod'
import { addProviderFormSchema, providerSchema } from '@shared/schema/provider'
import {
  getProviderByIdInputSchema,
  deleteProviderInputSchema,
  listObjectsInputSchema,
  uploadFileInputSchema,
  createFolderInputSchema,
  getObjectUrlInputSchema,
  deleteObjectInputSchema,
  deleteObjectsInputSchema,
  renameObjectInputSchema,
  moveObjectInputSchema,
  moveObjectsInputSchema,
  createBucketInputSchema
} from '@shared/schema/trpc/provider'
import {
  testConnection,
  getProviderStats,
  listObjects,
  uploadFile,
  createFolder,
  getObjectUrl,
  deleteObject,
  deleteObjects,
  renameObject,
  moveObject,
  moveObjects,
  createBucket
} from '@main/services/provider-service'
import { providerRepository } from '@main/db/provider-repository'

export const providerRouter = router({
  // ============ Provider CRUD Operations ============
  list: publicProcedure.query(async () => {
    return providerRepository.findAll()
  }),

  getById: publicProcedure.input(getProviderByIdInputSchema).query(async ({ input }) => {
    return providerRepository.findById(input.id)
  }),

  create: publicProcedure
    .input(addProviderFormSchema.and(z.object({ id: z.string() })))
    .mutation(async ({ input }) => {
      return providerRepository.create(input)
    }),

  delete: publicProcedure.input(deleteProviderInputSchema).mutation(async ({ input }) => {
    return providerRepository.delete(input.id)
  }),

  // ============ Global Statistics ============
  getGlobalStats: publicProcedure.query(async () => {
    const providers = await providerRepository.findAll()
    const uniqueRegions = new Set<string>()
    let totalBuckets = 0

    for (const provider of providers) {
      try {
        const stats = await getProviderStats(provider)
        totalBuckets += stats.bucketCount
      } catch {
        // Skip providers that fail to connect
      }

      if (provider.type === 's3-compatible' && provider.region) {
        uniqueRegions.add(provider.region)
      }
    }

    return {
      providersCount: providers.length,
      bucketsCount: totalBuckets,
      regionsCount: uniqueRegions.size
    }
  }),

  // ============ Provider Operations ============
  testConnection: publicProcedure.input(providerSchema).query(async ({ input }) => {
    return testConnection(input)
  }),

  getStats: publicProcedure.input(providerSchema).query(async ({ input }) => {
    return getProviderStats(input)
  }),

  listObjects: publicProcedure.input(listObjectsInputSchema).query(async ({ input }) => {
    return listObjects(input)
  }),

  uploadFile: publicProcedure.input(uploadFileInputSchema).mutation(async ({ input }) => {
    const result = await uploadFile(input)
    await providerRepository.updateLastOperationAt(input.provider.id)
    return result
  }),

  createFolder: publicProcedure.input(createFolderInputSchema).mutation(async ({ input }) => {
    const result = await createFolder(input)
    await providerRepository.updateLastOperationAt(input.provider.id)
    return result
  }),

  getObjectUrl: publicProcedure.input(getObjectUrlInputSchema).query(async ({ input }) => {
    return getObjectUrl(input)
  }),

  deleteObject: publicProcedure.input(deleteObjectInputSchema).mutation(async ({ input }) => {
    const result = await deleteObject(input)
    await providerRepository.updateLastOperationAt(input.provider.id)
    return result
  }),

  deleteObjects: publicProcedure.input(deleteObjectsInputSchema).mutation(async ({ input }) => {
    const result = await deleteObjects(input)
    await providerRepository.updateLastOperationAt(input.provider.id)
    return result
  }),

  renameObject: publicProcedure.input(renameObjectInputSchema).mutation(async ({ input }) => {
    const result = await renameObject(input)
    await providerRepository.updateLastOperationAt(input.provider.id)
    return result
  }),

  moveObject: publicProcedure.input(moveObjectInputSchema).mutation(async ({ input }) => {
    const result = await moveObject(input)
    await providerRepository.updateLastOperationAt(input.provider.id)
    return result
  }),

  moveObjects: publicProcedure.input(moveObjectsInputSchema).mutation(async ({ input }) => {
    const result = await moveObjects(input)
    await providerRepository.updateLastOperationAt(input.provider.id)
    return result
  }),

  createBucket: publicProcedure.input(createBucketInputSchema).mutation(async ({ input }) => {
    const result = await createBucket(input)
    await providerRepository.updateLastOperationAt(input.provider.id)
    return result
  })
})
