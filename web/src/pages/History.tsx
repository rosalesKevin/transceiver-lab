import { useEffect, useState } from 'react'
import { Card, CardHeader, CardBody, SectionLabel } from '../components/Card'
import { Button } from '../components/Button'
import { FormatBadge } from '../components/Badge'
import { api } from '../lib/api'
import type { HistoryResult, MessageRecord } from '../lib/types'

export default function HistoryPage() {
  const [result, setResult]         = useState<HistoryResult | null>(null)
  const [selected, setSelected]     = useState<MessageRecord | null>(null)
  const [page, setPage]             = useState(1)
  const [filterDir, setFilterDir]   = useState('')
  const [filterFmt, setFilterFmt]   = useState('')
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const load = async (p = page) => {
    setLoading(true); setError('')
    try {
      const res = await api.history.query({
        page: p, pageSize: 50,
        ...(filterDir && { direction: filterDir }),
        ...(filterFmt && { format: filterFmt }),
        ...(search    && { search }),
      })
      setResult(res)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Load failed') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(1); setPage(1) }, [filterDir, filterFmt, search])

  const handleClear = async () => {
    if (!confirm('Delete all history? This cannot be undone.')) return
    await api.history.clear()
    setResult(null); setSelected(null)
  }

  const totalPages = result ? Math.ceil(result.total / result.pageSize) : 0

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="font-mono font-semibold text-xs tracking-[0.25em] uppercase text-t1">
          <span className="text-amber mr-2">&gt;</span>History
        </h1>
        <div className="flex gap-2">
          <a
            href={api.history.exportURL()}
            download="mmt-history.json"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 font-mono font-medium text-2xs tracking-widest uppercase text-t2 border border-b1 hover:text-t1 hover:border-b2 transition-all"
          >
            ↓ Export
          </a>
          <Button variant="danger" onClick={handleClear}>✕ Clear All</Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 border border-red/30 bg-red/4 font-mono text-xs text-red">✕ {error}</div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          className="bg-black text-t1 font-mono text-xs border border-b1 px-3 py-1.5 outline-none focus:border-amber transition-colors placeholder:text-t3 w-48"
          placeholder="Search content…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {[
          { value: filterDir, onChange: setFilterDir, options: [['','TX + RX'],['tx','TX only'],['rx','RX only']] },
          { value: filterFmt, onChange: setFilterFmt, options: [['','All formats'],['cot','CoT'],['json','JSON'],['vmf','VMF'],['raw','Custom']] },
        ].map((sel, i) => (
          <select
            key={i}
            className="bg-black text-t2 font-mono text-xs border border-b1 px-2 py-1.5 outline-none cursor-pointer"
            value={sel.value}
            onChange={e => sel.onChange(e.target.value)}
          >
            {sel.options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <Button size="sm" variant="outline" onClick={() => load(page)}>↺ Refresh</Button>
        {result && (
          <span className="font-mono text-2xs text-t3 ml-auto tabular-nums">
            {result.total.toLocaleString()} records
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Table */}
        <Card>
          <div className="overflow-y-auto max-h-[520px]">
            {loading ? (
              <div className="px-4 py-8 text-center font-mono text-2xs text-t3 tracking-widest uppercase">Loading…</div>
            ) : !result || result.records.length === 0 ? (
              <div className="px-4 py-8 text-center font-mono text-2xs text-t3 tracking-widest uppercase">No records</div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-surface">
                  <tr className="border-b border-b1">
                    {['Time','Dir','Fmt','Addr','B'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-mono font-medium text-2xs tracking-[0.15em] uppercase text-t3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-b1/35">
                  {result.records.map(r => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={`cursor-pointer transition-colors hover:bg-raised/30 ${selected?.id === r.id ? 'bg-raised/50' : ''}`}
                    >
                      <td className="px-3 py-2 font-mono text-2xs text-t3 tabular-nums">
                        {new Date(r.timestamp).toLocaleTimeString([], {hour12:false})}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`font-mono text-2xs font-medium tracking-widest ${r.direction === 'tx' ? 'text-amber' : 'text-purple'}`}>
                          {r.direction.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-3 py-2"><FormatBadge format={r.format} /></td>
                      <td className="px-3 py-2 font-mono text-2xs text-t2 max-w-[90px] truncate">
                        {r.direction === 'tx' ? r.destAddr : r.sourceAddr}
                      </td>
                      <td className="px-3 py-2 font-mono text-2xs text-t3 tabular-nums">{r.sizeBytes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-b1">
              <Button size="xs" variant="outline" disabled={page<=1} onClick={() => { setPage(page-1); load(page-1) }}>‹ Prev</Button>
              <span className="font-mono text-2xs text-t3">Page {page} / {totalPages}</span>
              <Button size="xs" variant="outline" disabled={page>=totalPages} onClick={() => { setPage(page+1); load(page+1) }}>Next ›</Button>
            </div>
          )}
        </Card>

        {/* Detail */}
        <Card>
          {selected ? (
            <>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionLabel>Packet Detail</SectionLabel>
                  <FormatBadge format={selected.format} />
                  <span className={`font-mono text-2xs font-medium tracking-widest ${selected.direction === 'tx' ? 'text-amber' : 'text-purple'}`}>
                    {selected.direction.toUpperCase()}
                  </span>
                </div>
                <button onClick={() => setSelected(null)} className="font-mono text-xs text-t3 hover:text-t1 transition-colors">✕</button>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="grid grid-cols-2 gap-2 font-mono text-2xs">
                  {[
                    ['Time',  new Date(selected.timestamp).toISOString()],
                    ['Src',   selected.sourceAddr || '—'],
                    ['Dst',   selected.destAddr   || '—'],
                    ['Size',  `${selected.sizeBytes} bytes`],
                  ].map(([k,v]) => (
                    <div key={k}>
                      <div className="text-t3 tracking-widest uppercase mb-0.5">{k}</div>
                      <div className="text-t2 truncate">{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="font-mono font-medium text-2xs tracking-[0.15em] uppercase text-t3 mb-1">Content</div>
                  <pre className="bg-black border border-b1 p-3 text-xs font-mono text-t1 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
                    {selected.content}
                  </pre>
                </div>
                <div>
                  <div className="font-mono font-medium text-2xs tracking-[0.15em] uppercase text-t3 mb-1">Hex Dump</div>
                  <pre className="bg-black border border-b1 p-2 text-2xs font-mono text-t3 overflow-x-auto max-h-24 overflow-y-auto leading-relaxed">
                    {selected.rawHex.match(/.{1,2}/g)?.join(' ')}
                  </pre>
                </div>
              </CardBody>
            </>
          ) : (
            <div className="flex items-center justify-center h-full px-4 py-16">
              <div className="font-mono text-2xs text-t3 tracking-widest uppercase text-center">
                Select a record to inspect
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
