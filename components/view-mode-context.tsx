'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type ViewMode = 'propietario' | 'administracion'

interface ViewModeContextType {
  isAdminView: boolean
  toggleViewMode: () => void
}

const ViewModeContext = createContext<ViewModeContextType | null>(null)

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>('propietario')
  return (
    <ViewModeContext.Provider
      value={{
        isAdminView: mode === 'administracion',
        toggleViewMode: () => setMode(m => m === 'propietario' ? 'administracion' : 'propietario'),
      }}
    >
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext)
  if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider')
  return ctx
}
