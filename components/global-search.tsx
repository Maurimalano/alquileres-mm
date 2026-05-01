'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Building2, Users, DoorOpen, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SearchResult {
  type: 'inquilino' | 'propiedad' | 'unidad' | 'contrato'
  id: string
  label: string
  href: string
}

const typeIcon = {
  inquilino: Users,
  propiedad: Building2,
  unidad:    DoorOpen,
  contrato:  FileText,
}

const typeLabel = {
  inquilino: 'Inquilino',
  propiedad: 'Propiedad',
  unidad:    'Unidad',
  contrato:  'Contrato activo',
}

export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const { results } = await res.json()
      setResults(results ?? [])
      setOpen(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(result: SearchResult) {
    setQuery('')
    setOpen(false)
    router.push(result.href)
  }

  // Agrupar por tipo para mostrar separadores
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})
  const order: SearchResult['type'][] = ['inquilino', 'propiedad', 'unidad', 'contrato']

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar inquilinos, propiedades..."
          className="pl-8 h-8 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full min-w-[300px] rounded-md border bg-popover shadow-md z-50 overflow-hidden">
          {order.map((type) => {
            const group = grouped[type]
            if (!group?.length) return null
            const Icon = typeIcon[type]
            return (
              <div key={type}>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/50 border-b">
                  {typeLabel[type]}
                </div>
                {group.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left transition-colors"
                    onClick={() => handleSelect(r)}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{r.label}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {open && loading && (
        <div className="absolute top-full mt-1 w-full rounded-md border bg-popover shadow-md z-50 px-3 py-2 text-sm text-muted-foreground">
          Buscando...
        </div>
      )}

      {open && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-1 w-full rounded-md border bg-popover shadow-md z-50 px-3 py-2 text-sm text-muted-foreground">
          Sin resultados para &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}
