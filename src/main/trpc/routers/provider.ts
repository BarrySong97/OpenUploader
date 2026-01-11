import { z } from 'zod'
import { publicProcedure, router } from '../trpc'
import { providerSchema } from '../../../shared/schema/provider'
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

const listObjectsInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  prefix: z.string().optional(),
  cursor: z.string().optional(),
  maxKeys: z.number().optional()
})

const uploadFileInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  key: z.string(),
  content: z.string(),
  contentType: z.string().optional()
})

const createFolderInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  path: z.string()
})

const getObjectUrlInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  key: z.string(),
  expiresIn: z.number().optional()
})

const deleteObjectInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  key: z.string(),
  isFolder: z.boolean().optional()
})

const deleteObjectsInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  keys: z.array(z.string())
})

const renameObjectInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  sourceKey: z.string(),
  newName: z.string()
})

const moveObjectInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  sourceKey: z.string(),
  destinationPrefix: z.string()
})

const moveObjectsInputSchema = z.object({
  provider: providerSchema,
  bucket: z.string(),
  sourceKeys: z.array(z.string()),
  destinationPrefix: z.string()
})

export const providerRouter = router({
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
