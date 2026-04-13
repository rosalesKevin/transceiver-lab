import { useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardBody, SectionLabel } from '../components/Card'
import { Button } from '../components/Button'
import { FormatBadge, StateBadge } from '../components/Badge'
import { Field } from '../components/Field'
import { useSessionStore } from '../stores/sessionStore'
import { api } from '../lib/api'
import { onRxMessage } from '../lib/ws'
import type { NetworkInterface, SessionStatus, WsRxMessage } from '../lib/types'

export default function Receive() {
  const { sessions, upsert } = useSessionStore()
  const [ifaces, setIfaces] = useState<NetworkInterface[]>([])
  const [messages, setMessages] = useState<WsRxMessage[]>([])
  const [selected, setSelected] = useState<WsRxMessage | null>(null)
  const [filterFormat, setFilterFormat] = useState('')
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)

  const [name, setName]           = useState('RX-1')
  const [mcastAddr, setMcastAddr] = useState('239.2.3.1')
  const [port, setPort]           = useState(6969)
  const [iface, setIface]         = useState('')
  const [activeSession, setActiveSession] = useState<SessionStatus | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.network.interfaces().then(setIfaces).catch(() => {})
    const off = onRxMessage((msg) => {
      if (pausedRef.current) return
      setMessages((prev) => [msg, ...prev].slice(0, 500))
    })
    return () => { off() }
  }, [])

  useEffect(() => { pausedRef.current = paused }, [paused])

  useEffect(() => {
    if (!activeSession) return
    const updated = sessions.find(s => s.id === activeSession.id)
    if (updated) setActiveSession(updated)
  }, [sessions])

  const handleStart = async () => {
    setError('')
    try {
      const sess = await api.sessions.create({ name, mode:'receive', multicastAddr:mcastAddr, port, interfaceName:iface, ttl:32, loopback:false, format:'unknown', content:'', sendMode:'oneshot', intervalMs:1000, dynamicFields:false })
      const started = await api.sessions.start(sess.id)
      upsert(started); setActiveSession(started)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to start') }
  }

  const handleStop = async () => {
    if (!activeSession) return
    const s = await api.sessions.stop(activeSession.id)
    upsert(s); setActiveSession(s)
  }

  const filtered = filterFormat ? messages.filter(m => m.format === filterFormat) : messages
  const isRunning = activeSession?.state === 'running'

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="font-mono font-semibold text-xs tracking-[0.25em] uppercase text-t1">
          <span className="text-amber mr-2">&gt;</span>Receive
        </h1>
        {activeSession && (
          <div className="flex items-center gap-4">
            <StateBadge state={activeSession.state} />
            <span className="font-mono text-2xs text-t2 tabular-nums">
              <span className="text-t3 mr-1">RX</span>
              {activeSession.received?.toLocaleString() ?? 0}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 border border-red/30 bg-red/4 font-mono text-xs text-red">
          <span className="text-2xs">✕</span> {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Config */}
        <Card>
          <CardHeader><SectionLabel>Listener Config</SectionLabel></CardHeader>
          <CardBody className="space-y-3">
            <Field label="Session Name">
              <input className="field-input" value={name} onChange={e => setName(e.target.value)} disabled={isRunning} />
            </Field>
            <Field label="Multicast Group">
              <input className="field-input" value={mcastAddr} onChange={e => setMcastAddr(e.target.value)} disabled={isRunning} />
            </Field>
            <Field label="Port">
              <input className="field-input" type="number" value={port} onChange={e => setPort(+e.target.value)} disabled={isRunning} />
            </Field>
            <Field label="Interface">
              <select className="field-select" value={iface} onChange={e => setIface(e.target.value)} disabled={isRunning}>
                <option value="">Auto-detect</option>
                {ifaces.filter(i => i.isUp).map(i => (
                  <option key={i.name} value={i.name}>{i.name}</option>
                ))}
              </select>
            </Field>
            <div className="pt-1">
              {!isRunning ? (
                <Button variant="primary" onClick={handleStart} className="w-full justify-center">▶ Start Listening</Button>
              ) : (
                <Button variant="danger" onClick={handleStop} className="w-full justify-center">■ Stop</Button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Feed + detail */}
        <div className="col-span-2 space-y-4">
          <Card accent={isRunning ? 'green' : 'none'}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <SectionLabel>Live Feed</SectionLabel>
                {isRunning && <span className="running-dot" style={{width:5,height:5}} />}
                <span className="font-mono text-2xs text-t3">{filtered.length} msgs</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="bg-black text-t2 font-mono text-2xs border border-b1 px-2 py-1 outline-none"
                  value={filterFormat} onChange={e => setFilterFormat(e.target.value)}
                >
                  <option value="">All formats</option>
                  {['cot','json','vmf','raw','unknown'].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                </select>
                <Button size="xs" variant={paused ? 'amber' : 'outline'} onClick={() => setPaused(p => !p)}>
                  {paused ? '▶ Live' : '⏸ Pause'}
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setMessages([])}>Clear</Button>
              </div>
            </CardHeader>

            <div className="overflow-y-auto max-h-56 font-mono text-xs divide-y divide-b1/25">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <div className="font-mono text-2xs text-t3 tracking-widest uppercase">
                    {isRunning ? 'Waiting for packets…' : 'Start a listener to capture incoming messages'}
                  </div>
                  {isRunning && (
                    <div className="mt-2 flex justify-center gap-1">
                      {[0,1,2].map(i => (
                        <span key={i} className="inline-block w-1 h-1 bg-green animate-blink" style={{animationDelay:`${i*0.37}s`}} />
                      ))}
                    </div>
                  )}
                </div>
              ) : filtered.map((msg, i) => (
                <div
                  key={i}
                  onClick={() => setSelected(msg)}
                  className={`flex items-center gap-3 px-4 py-1.5 cursor-pointer transition-colors hover:bg-raised/30 ${selected === msg ? 'bg-raised/40' : ''}`}
                >
                  <span className="text-2xs text-t3 w-20 shrink-0 tabular-nums">
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour12:false})}
                  </span>
                  <FormatBadge format={msg.format} />
                  <span className="text-2xs text-t2 shrink-0 w-28 truncate">{msg.source}</span>
                  <span className="text-2xs text-t2 truncate flex-1">{msg.content.slice(0, 72)}</span>
                  <span className="text-2xs text-t3 shrink-0">{msg.sizeBytes}B</span>
                </div>
              ))}
            </div>
          </Card>

          {selected ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionLabel>Packet Detail</SectionLabel>
                  <FormatBadge format={selected.format} />
                  <span className="font-mono text-2xs text-t3">{selected.sizeBytes} bytes</span>
                </div>
                <button onClick={() => setSelected(null)} className="font-mono text-xs text-t3 hover:text-t1 transition-colors">✕</button>
              </CardHeader>
              <CardBody className="space-y-3">
                <div className="flex gap-6 font-mono text-2xs">
                  <span><span className="text-amber">SRC</span> <span className="text-t2">{selected.source}</span></span>
                  <span><span className="text-amber">TIME</span> <span className="text-t2">{new Date(selected.timestamp).toISOString()}</span></span>
                </div>
                <div>
                  <div className="font-mono font-medium text-2xs tracking-[0.15em] uppercase text-t3 mb-1">Content</div>
                  <pre className="bg-black border border-b1 p-3 text-xs font-mono text-t1 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all leading-relaxed">
                    {selected.content}
                  </pre>
                </div>
                <div>
                  <div className="font-mono font-medium text-2xs tracking-[0.15em] uppercase text-t3 mb-1">Hex Dump</div>
                  <pre className="bg-black border border-b1 p-2 text-2xs font-mono text-t3 overflow-x-auto max-h-20 overflow-y-auto">
                    {selected.rawHex.match(/.{1,2}/g)?.join(' ')}
                  </pre>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <div className="px-4 py-6 text-center font-mono text-2xs text-t3 tracking-widest uppercase">
                Select a packet to inspect
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
