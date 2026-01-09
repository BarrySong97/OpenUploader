import { Link } from '@tanstack/react-router'
import { IconArrowRight, IconFiles, IconDatabase } from '@tabler/icons-react'
import type { Provider } from '@/lib/types'
import { ProviderAvatar } from './provider-avatar'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ProviderCardProps {
  provider: Provider
}

export function ProviderCard({ provider }: ProviderCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <ProviderAvatar type={provider.type} size="md" />
            <div>
              <CardTitle>{provider.name}</CardTitle>
              <CardDescription className="mt-1">
                {provider.bucket} · {provider.region}
              </CardDescription>
            </div>
          </div>
          <Badge variant={provider.connected ? 'default' : 'secondary'}>
            {provider.connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconFiles size={16} />
              <span>{provider.stats.files} files</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconDatabase size={16} />
              <span>{provider.stats.storage}</span>
            </div>
          </div>
          <Link to="/provider/$providerId" params={{ providerId: provider.id }}>
            <Button variant="ghost" size="default">
              Open
              <IconArrowRight size={16} className="ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
