interface StatusCardProps {
  value: string | number
  label: string
}

export function StatusCard({ value, label }: StatusCardProps) {
  return (
    <div className="rounded-md border border-border bg-card p-6">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}
