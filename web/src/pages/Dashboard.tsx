import { useEffect, useState } from 'react'
import { Card, CardHeader, CardBody, SectionLabel } from '../components/Card'
import { StateBadge, FormatBadge } from '../components/Badge'
import { Button } from '../components/Button'
import { useSessionStore } from '../stores/sessionStore'
import { api } from '../lib/api'
import type { NetworkInterface, SessionStatus } from '../lib/types'

function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className="bg-surface border border-b1 border-l-2 p-3 space-y-0.5" style={{ borderLeftColor: color }}>
      <div className="font-mono font-medium text-2xs tracking-[0.18em] uppercase text-t3">{label}</div>
      <div className="font-mono font-semibold text-xl tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="font-mono text-2xs text-t3">{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const { sessions, fetch, upsert, remove } = useSessionStore()
  const [ifaces, setIfaces] = useState<NetworkInterface[]>([])

  useEffect(() => {
    fetch()
    api.network.interfaces().then(setIfaces).catch(() => {})
  }, [])

  const totalSent  = sessions.reduce((a, s) => a + (s.sent ?? 0), 0)
  const totalRecv  = sessions.reduce((a, s) => a + (s.received ?? 0), 0)
  const totalBytes = sessions.reduce((a, s) => a + (s.bytesSent ?? 0) + (s.bytesRecv ?? 0), 0)
  const running    = sessions.filter((s) => s.state === 'running').length

  const handleStop   = async (s: SessionStatus) => { upsert(await api.sessions.stop(s.id)) }
  const handleDelete = async (s: SessionStatus) => { await api.sessions.delete(s.id); remove(s.id) }

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="font-mono font-semibold text-xs tracking-[0.25em] uppercase text-t1">
          <span className="text-amber mr-2">&gt;</span>Dashboard
        </h1>
        <button onClick={() => fetch()} className="font-mono text-2xs text-t3 hover:text-amber tracking-widest uppercase transition-colors">
          ↺ Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Running"    value={running}                     color="#00ff87" sub={running > 0 ? 'transmitting' : 'no active'} />
        <StatCard label="Sessions"   value={sessions.length}             color="#ffb000" />
        <StatCard label="TX Count"   value={totalSent.toLocaleString()}  color="#ffb000" />
        <StatCard label="RX Count"   value={totalRecv.toLocaleString()}  color="#a07af0" sub={fmtBytes(totalBytes)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Sessions */}
        <Card>
          <CardHeader>
            <SectionLabel>Sessions</SectionLabel>
            <span className="font-mono text-2xs text-t3">{sessions.length} total</span>
          </CardHeader>
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="font-mono text-2xs text-t3 tracking-widest uppercase">No sessions — create one on Send or Receive</div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-72">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-b1">
                    {['Name', 'Mode', 'State', 'TX/RX', ''].map(h => (
                      <th key={h} className="px-4 py-2 text-left font-mono font-medium text-2xs tracking-[0.15em] uppercase text-t3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id} className="border-b border-b1/40 hover:bg-raised/40 transition-colors">
                      <td className="px-4 py-2">
                        <div className="font-mono text-xs text-t1">{s.name}</div>
                        <div className="font-mono text-2xs text-t3">{s.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-4 py-2 font-mono text-2xs text-t2 uppercase">{s.mode}</td>
                      <td className="px-4 py-2"><StateBadge state={s.state} /></td>
                      <td className="px-4 py-2 font-mono text-xs tabular-nums text-t2">
                        {(s.mode === 'send' ? s.sent : s.received)?.toLocaleString() ?? 0}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {s.state === 'running' && (
                            <Button size="xs" variant="danger" onClick={() => handleStop(s)}>■ Stop</Button>
                          )}
                          {(s.state === 'stopped' || s.state === 'idle') && (
                            <Button size="xs" variant="ghost" onClick={() => handleDelete(s)}>✕</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Network interfaces */}
        <Card>
          <CardHeader>
            <SectionLabel>Network Interfaces</SectionLabel>
            <span className="font-mono text-2xs text-t3">{ifaces.filter(i => i.isUp).length} up</span>
          </CardHeader>
          {ifaces.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <div className="font-mono text-2xs text-t3 tracking-widest uppercase">Loading interfaces…</div>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-72">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-b1">
                    {['Interface', 'Address', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2 text-left font-mono font-medium text-2xs tracking-[0.15em] uppercase text-t3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ifaces.map((iface) => (
                    <tr key={iface.name} className="border-b border-b1/40 hover:bg-raised/40 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs text-t1">{iface.name}</td>
                      <td className="px-4 py-2 font-mono text-2xs text-t2 max-w-[140px] truncate">
                        {iface.addrs[0] ?? '—'}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1.5 font-mono text-2xs tracking-widest uppercase ${iface.isUp ? 'text-green' : 'text-t3'}`}>
                          <span className={iface.isUp ? 'running-dot' : 'idle-dot'} style={{ width: 5, height: 5 }} />
                          {iface.isUp ? 'UP' : 'DOWN'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function fmtBytes(b: number): string {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
