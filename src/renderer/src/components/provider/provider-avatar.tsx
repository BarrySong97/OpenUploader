import { IconBrandAws, IconCloud, IconDatabase } from '@tabler/icons-react'
import type { ProviderType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ProviderAvatarProps {
  type: ProviderType
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const providerConfig = {
  aliyun: {
    name: 'Aliyun OSS',
    color: 'bg-orange-500',
    icon: IconCloud
  },
  aws: {
    name: 'AWS S3',
    color: 'bg-yellow-600',
    icon: IconBrandAws
  },
  tencent: {
    name: 'Tencent COS',
    color: 'bg-blue-500',
    icon: IconCloud
  },
  qiniu: {
    name: 'Qiniu Kodo',
    color: 'bg-green-500',
    icon: IconDatabase
  }
}

const sizeConfig = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-16'
}

const iconSizeConfig = {
  sm: 16,
  md: 24,
  lg: 32
}

export function ProviderAvatar({ type, size = 'md', className }: ProviderAvatarProps) {
  const config = providerConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full text-white',
        config.color,
        sizeConfig[size],
        className
      )}
    >
      <Icon size={iconSizeConfig[size]} />
    </div>
  )
}
