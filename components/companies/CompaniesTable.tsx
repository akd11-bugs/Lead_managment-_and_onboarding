'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DataTable, type Calculation } from '@/components/shared/DataTable'
import { SavedViewsMenu } from '@/components/leads/SavedViewsMenu'
import { getCompanyColumns, type CompanyRow } from '@/lib/tableColumns'

const DEFAULT_COLUMNS = ['name', 'industry', 'businessType', 'leadsCount', 'peopleCount', 'createdAt']

interface CompanyViewFilters {
  search: string
  columns?: string[]
  calculations?: Record<string, string>
}

export function CompaniesTable({ initialCompanies }: { initialCompanies: CompanyRow[] }) {
  const [search, setSearch] = useState('')
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS)
  const [calculations, setCalculations] = useState<Record<string, Calculation>>({})
  const allColumns = useMemo(() => getCompanyColumns(), [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return initialCompanies
    return initialCompanies.filter((c) => `${c.name} ${c.industry ?? ''}`.toLowerCase().includes(q))
  }, [initialCompanies, search])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or industry…" className="pl-9 h-9" />
        </div>
        <SavedViewsMenu<CompanyViewFilters>
          viewType="companies"
          filters={{ search, columns: visibleColumns, calculations }}
          onApply={(v) => {
            setSearch(v.search)
            if (v.columns?.length) setVisibleColumns(v.columns)
            if (v.calculations) setCalculations(v.calculations as Record<string, Calculation>)
          }}
        />
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {initialCompanies.length} companies
        </span>
      </div>

      <DataTable
        tableId="companies-table"
        rows={filtered}
        rowKey={(c) => c.id}
        rowHref={(c) => `/companies/${c.id}`}
        allColumns={allColumns}
        visibleColumnKeys={visibleColumns}
        calculations={calculations}
        onColumnsChange={setVisibleColumns}
        onCalculationsChange={setCalculations}
      />
    </div>
  )
}
