'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Building2, Home, Users, FileText, CreditCard, LogOut, DoorOpen,
  AlertTriangle, Receipt, Wallet, ArrowDownCircle, Upload,
  UserCog, Eye, EyeOff, Banknote,
} from 'lucide-react'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useViewMode } from '@/components/view-mode-context'
import type { Profile } from '@/types/database'

const navMain = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Propiedades', href: '/propiedades', icon: Building2 },
  { title: 'Unidades', href: '/unidades', icon: DoorOpen },
  { title: 'Inquilinos', href: '/inquilinos', icon: Users },
  { title: 'Contratos', href: '/contratos', icon: FileText },
]

const navGestion = [
  { title: 'Cobranza', href: '/pagos', icon: CreditCard },
  { title: 'Morosidad', href: '/morosidad', icon: AlertTriangle },
  { title: 'Recibos', href: '/recibos', icon: Receipt },
  { title: 'Gastos', href: '/gastos', icon: Banknote },
]

const navFinanzas = [
  { title: 'Caja', href: '/caja', icon: Wallet },
  { title: 'Retiros', href: '/retiros', icon: ArrowDownCircle, solodueno: true },
]

const navUtil = [
  { title: 'Importar datos', href: '/importar', icon: Upload },
  { title: 'Usuarios', href: '/usuarios', icon: UserCog, solodueno: true },
]

interface AppSidebarProps {
  profile: Profile | null
}

export function AppSidebar({ profile }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const isDueno = profile?.role === 'dueno'
  const { isAdminView, toggleViewMode } = useViewMode()
  const showDuenoItems = isDueno && !isAdminView
  const { isMobile, setOpenMobile } = useSidebar()

  function handleNavClick() {
    if (isMobile) setOpenMobile(false)
  }

  function NavGroup({ label, items }: { label: string; items: typeof navMain }) {
    const visible = items.filter((i) => !('solodueno' in i) || (i as any).solodueno === false || showDuenoItems)
    if (visible.length === 0) return null
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={pathname === item.href}>
                  <Link href={item.href} onClick={handleNavClick}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">AlquileresMM</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Administración" items={navMain} />
        <NavGroup label="Gestión" items={navGestion} />
        <NavGroup label="Finanzas" items={navFinanzas} />
        <NavGroup label="Herramientas" items={navUtil} />
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {profile?.full_name ?? profile?.email}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {isDueno ? (isAdminView ? 'Modo Administración' : 'Propietario') : 'Administración'}
            </p>
          </div>
        </div>
        <SidebarMenu>
          {isDueno && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={toggleViewMode}
                className={isAdminView ? 'text-amber-600 font-medium' : 'text-muted-foreground'}
              >
                {isAdminView ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span>{isAdminView ? 'Salir del modo admin' : 'Ver como administración'}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
