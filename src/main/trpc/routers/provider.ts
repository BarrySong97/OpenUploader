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
  createBucketInputSchema,
  deleteBucketInputSchema,
  listBucketsInputSchema,
  showSaveDialogInputSchema,
  showOpenDirectoryInputSchema,
  downloadToFileInputSchema,
  getPlainObjectUrlInputSchema,
  showInFolderInputSchema
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
  createBucket,
  deleteBucket,
  listBuckets,
  downloadToFile,
  getPlainObjectUrl
} from '@main/services/provider-service'
import { dialog, BrowserWindow, shell } from 'electron'
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

  update: publicProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return providerRepository.update(input.id, { name: input.name })
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

      if (provider.type !== 'supabase' && 'region' in provider && provider.region) {
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
  }),

  deleteBucket: publicProcedure.input(deleteBucketInputSchema).mutation(async ({ input }) => {
    const result = await deleteBucket(input)
    await providerRepository.updateLastOperationAt(input.provider.id)
    return result
  }),

  listBuckets: publicProcedure.input(listBucketsInputSchema).query(async ({ input }) => {
    return listBuckets(input)
  }),

  showSaveDialog: publicProcedure.input(showSaveDialogInputSchema).mutation(async ({ input }) => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    const result = await dialog.showSaveDialog(window ?? undefined, {
      defaultPath: input.defaultName,
      filters: [{ name: 'All Files', extensions: ['*'] }]
    })
    return { canceled: result.canceled, filePath: result.filePath || '' }
  }),

  showOpenDirectory: publicProcedure
    .input(showOpenDirectoryInputSchema)
    .mutation(async ({ input }) => {
      const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
      const result = await dialog.showOpenDialog(window ?? undefined, {
        title: input.title ?? 'Select folder',
        properties: ['openDirectory', 'createDirectory']
      })
      return { canceled: result.canceled, folderPath: result.filePaths[0] || '' }
    }),

  downloadToFile: publicProcedure.input(downloadToFileInputSchema).mutation(async ({ input }) => {
    return downloadToFile(input)
  }),

  getPlainObjectUrl: publicProcedure.input(getPlainObjectUrlInputSchema).query(({ input }) => {
    return getPlainObjectUrl(input)
  }),

  showInFolder: publicProcedure.input(showInFolderInputSchema).mutation(({ input }) => {
    shell.showItemInFolder(input.filePath)
    return { success: true }
  })
})
