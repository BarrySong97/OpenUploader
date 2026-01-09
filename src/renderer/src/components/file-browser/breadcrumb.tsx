import { IconChevronRight, IconHome } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

interface BreadcrumbProps {
  path: string[]
  onNavigate: (index: number) => void
}

export function Breadcrumb({ path, onNavigate }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-6 py-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(-1)}
        className="h-8 px-2"
      >
        <IconHome size={16} />
      </Button>
      {path.length > 0 && (
        <>
          <IconChevronRight size={16} className="text-muted-foreground" />
          {path.map((segment, index) => (
            <div key={index} className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(index)}
                className="h-8 px-2 text-sm"
              >
                {segment}
              </Button>
              {index < path.length - 1 && (
                <IconChevronRight size={16} className="text-muted-foreground" />
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}
