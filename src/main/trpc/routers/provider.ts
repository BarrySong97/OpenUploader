import { publicProcedure, router } from '../trpc'
import { z } from 'zod'
import { addProviderFormSchema, providerSchema } from '../../../shared/schema/provider'
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
  moveObjectsInputSchema
} from '../../../shared/schema/trpc/provider'
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
  moveObjects
} from '../../services/provider-service'
import { providerRepository } from '../../db/provider-repository'

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
    return uploadFile(input)
  }),

  createFolder: publicProcedure.input(createFolderInputSchema).mutation(async ({ input }) => {
    return createFolder(input)
  }),

  getObjectUrl: publicProcedure.input(getObjectUrlInputSchema).query(async ({ input }) => {
    return getObjectUrl(input)
  }),

  deleteObject: publicProcedure.input(deleteObjectInputSchema).mutation(async ({ input }) => {
    return deleteObject(input)
  }),

  deleteObjects: publicProcedure.input(deleteObjectsInputSchema).mutation(async ({ input }) => {
    return deleteObjects(input)
  }),

  renameObject: publicProcedure.input(renameObjectInputSchema).mutation(async ({ input }) => {
    return renameObject(input)
  }),

  moveObject: publicProcedure.input(moveObjectInputSchema).mutation(async ({ input }) => {
    return moveObject(input)
  }),

  moveObjects: publicProcedure.input(moveObjectsInputSchema).mutation(async ({ input }) => {
    return moveObjects(input)
  })
})
