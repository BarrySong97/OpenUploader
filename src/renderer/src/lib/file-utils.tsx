import {
  IconFolder,
  IconFile,
  IconFileText,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconFileZip
} from '@tabler/icons-react'
import type { FileItem } from './types'

export function getFileIcon(file: FileItem, size: 'small' | 'large' = 'small') {
  const iconSize = size === 'small' ? 20 : 48

  if (file.type === 'folder') {
    return <IconFolder size={iconSize} className="text-blue-500" />
  }

  const mimeType = file.mimeType || ''
  if (mimeType.startsWith('image/'))
    return <IconPhoto size={iconSize} className="text-green-500" />
  if (mimeType.startsWith('video/'))
    return <IconVideo size={iconSize} className="text-purple-500" />
  if (mimeType.startsWith('audio/'))
    return <IconMusic size={iconSize} className="text-pink-500" />
  if (mimeType.includes('pdf'))
    return <IconFile size={iconSize} className="text-red-500" />
  if (mimeType.includes('zip') || mimeType.includes('compressed'))
    return <IconFileZip size={iconSize} className="text-yellow-500" />
  if (mimeType.includes('text'))
    return <IconFileText size={iconSize} className="text-gray-500" />

  return <IconFile size={iconSize} className="text-gray-500" />
}
