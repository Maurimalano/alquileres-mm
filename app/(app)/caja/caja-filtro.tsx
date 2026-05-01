'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props { current: string }

export function CajaFiltro({ current }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="periodo" className="text-sm">Período:</Label>
      <Input
        id="periodo"
        type="month"
        value={current}
        onChange={(e) => router.push(`${pathname}?periodo=${e.target.value}`)}
        className="w-40 h-8"
      />
    </div>
  )
}
