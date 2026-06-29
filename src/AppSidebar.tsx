import { NavLink, useLocation } from 'react-router'
import { AlertCircle, Image, Library, Loader2 } from 'lucide-react'
import logo from '@/assets/logo.png'
import { cn } from '@/lib/utils'
import { useStore } from '@/hooks'

export function AppSidebar() {
  const { sheets } = useStore()
  const location = useLocation()
  const activeSheetId = location.pathname.match(/^\/sheets\/([^/]+)/)?.[1]

  return (
    <aside className="m-3 flex w-56 shrink-0 flex-col overflow-hidden rounded-md border border-border bg-card">
      <NavLink to="/library" className="flex h-14 items-center gap-2 border-b border-border px-4">
        <img
          src={logo}
          className="size-7 rounded-md object-cover"
          alt="BlockPixel Studio logo"
        />
        <span className="text-sm font-semibold tracking-tight">
          BlockPixel Studio
        </span>
      </NavLink>

      <nav className="flex flex-col gap-0.5 border-b border-border p-3">
        <SidebarNavLink to="/library" label="Library" icon={Library} />
      </nav>

      <div className="flex min-h-0 flex-1 flex-col">
        <SidebarSectionLabel>Style Sheets</SidebarSectionLabel>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {sheets.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No style sheets yet.
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {sheets.map((sheet) => (
                <SidebarSheetItem
                  key={sheet.id}
                  sheet={sheet}
                  active={activeSheetId === sheet.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function SidebarNavLink({
  to,
  label,
  icon: Icon,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <NavLink to={to} className="block">
      {({ isActive }) => (
        <SidebarButtonRow
          label={label}
          icon={Icon}
          active={isActive}
        />
      )}
    </NavLink>
  )
}

function SidebarSheetItem({
  sheet,
  active,
}: {
  sheet: StyleSheet
  active: boolean
}) {
  const status = sheet.status
  const sublabel =
    status === 'generating'
      ? 'Generating…'
      : status === 'error'
        ? 'Failed'
        : `${sheet.items.length} item${sheet.items.length === 1 ? '' : 's'}`

  return (
    <NavLink to={`/sheets/${sheet.id}`} className="block">
      <span
        className={cn(
          'group flex items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors',
          active
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded bg-muted border">
          {status === 'generating' ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : status === 'error' ? (
            <AlertCircle className="size-4 text-destructive" />
          ) : sheet.referenceImageUrl ? (
            <img
              src={sheet.referenceImageUrl}
              alt={sheet.prompt}
              className="h-full w-full object-cover"
            />
          ) : (
            <Image className="size-4 text-muted-foreground" />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm leading-tight">{sheet.prompt}</span>
          <span
            className={cn(
              'truncate text-xs leading-tight',
              status === 'error'
                ? 'text-destructive'
                : status === 'generating'
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/70',
            )}
          >
            {sublabel}
          </span>
        </span>
      </span>
    </NavLink>
  )
}

function SidebarButtonRow({
  label,
  sublabel,
  active,
  icon,
}: {
  label: string
  sublabel?: string
  active: boolean
  icon?: React.ComponentType<{ className?: string }>
}) {
  const Icon = icon
  return (
    <span
      className={cn(
        'group relative flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm',
        active
          ? 'bg-muted text-foreground'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-foreground" />
      )}
      {Icon && <Icon className="size-4 shrink-0" />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{label}</span>
        {sublabel && (
          <span className="truncate text-xs text-muted-foreground">
            {sublabel}
          </span>
        )}
      </span>
    </span>
  )
}

function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-3 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  )
}