import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { trpc } from '@renderer/lib/trpc'
import { useNavigationStore } from '@renderer/stores/navigation-store'
import { BucketBrowser } from '@renderer/components/provider/bucket-browser'
import { PageLayout } from '@/components/layout/page-layout'

export const Route = createFileRoute('/providers/$providerId/$bucketName/')({
  component: ProviderBucket
})

function ProviderBucket() {
  const { providerId, bucketName } = Route.useParams()
  const { data: provider, isLoading } = trpc.provider.getById.useQuery({ id: providerId })
  const { setProvider, setBucket, reset } = useNavigationStore()

  useEffect(() => {
    if (!provider) return

    setProvider({
      id: provider.id,
      name: provider.name
    })
    setBucket(bucketName)
    return () => {
      reset()
    }
  }, [provider, bucketName, setProvider, setBucket, reset])

  if (isLoading) {
    return <PageLayout>Loading...</PageLayout>
  }

  if (!provider) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-muted-foreground">Provider not found</p>
          <Link to="/">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return <BucketBrowser provider={provider} bucket={bucketName} />
}
