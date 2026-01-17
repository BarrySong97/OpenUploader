import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { IconDatabase, IconFolderOpen } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/settings/database')({
  component: DatabaseSettings
})

function DatabaseSettings() {
  const [dbPath, setDbPath] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadPath = async () => {
      try {
        setLoadError(null)
        const path = await window.api.getDatabasePath()
        if (isMounted) {
          setDbPath(path)
        }
      } catch (error) {
        console.error('Failed to load database path:', error)
        if (isMounted) {
          setLoadError('Failed to load database path')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadPath()

    return () => {
      isMounted = false
    }
  }, [])

  const handleOpenFolder = () => {
    if (!dbPath) return
    window.api.showInFolder(dbPath)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Database Storage</h2>
        <p className="mt-1 text-sm text-muted-foreground">View where local data is stored.</p>
      </div>

      <div className="rounded-md border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <IconDatabase size={22} className="text-muted-foreground" />
          <h3 className="text-lg font-medium">PGlite Database</h3>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading database path...</p>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Storage location</p>
              <button
                type="button"
                className="mt-1 w-full text-left text-sm text-primary hover:underline break-all"
                onClick={handleOpenFolder}
              >
                {dbPath}
              </button>
            </div>
            <Button variant="outline" onClick={handleOpenFolder} disabled={!dbPath}>
              <IconFolderOpen size={16} className="mr-2" />
              Open Folder
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
