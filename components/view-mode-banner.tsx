'use client'

import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useViewMode } from '@/components/view-mode-context'

export function ViewModeBanner() {
  const { isAdminView, toggleViewMode } = useViewMode()
  if (!isAdminView) return null

  return (
    <div className="flex items-center justify-between bg-amber-500 px-4 py-2 text-sm text-white">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" />
        <span className="font-medium">Modo Administración activo</span>
        <span className="hidden opacity-80 sm:inline">— Estás viendo la app como un administrador</span>
      </div>
      <Button
        size="sm"
        onClick={toggleViewMode}
        className="h-7 border-white/40 bg-transparent text-xs text-white hover:bg-white/20 hover:text-white"
        variant="outline"
      >
        Volver a Propietario
      </Button>
    </div>
  )
}
