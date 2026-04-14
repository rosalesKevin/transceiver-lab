import { useEffect, useState } from 'react'
import { Card, CardHeader, CardBody, SectionLabel } from '../components/Card'
import { Button } from '../components/Button'
import { StateBadge, FormatBadge } from '../components/Badge'
import { Field } from '../components/Field'
import { useSessionStore } from '../stores/sessionStore'
import { useTemplateStore } from '../stores/templateStore'
import { useSendForm } from '../stores/formStore'
import { api } from '../lib/api'
import type { MessageFormat, NetworkInterface, SessionStatus } from '../lib/types'

const FORMAT_LABELS: Record<string, string> = { cot:'CoT', json:'JSON', vmf:'VMF', raw:'Custom' }

const fmtAccentLeft: Record<string, string> = {
  cot: 'border-l-blue/60', json: 'border-l-amber/60', vmf: 'border-l-red/60', raw: 'border-l-purple/60',
}

function fmtBytes(b: number): string {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

export default function SendPage() {
  const { sessions, fetch: fetchSessions, upsert, remove } = useSessionStore()
  const { templates, fetch: fetchTemplates } = useTemplateStore()
  const form = useSendForm()
  const [ifaces, setIfaces] = useState<NetworkInterface[]>([])
  const [status, setStatus] = useState('')
  const [error, setError]   = useState('')

  const sendSessions = sessions.filter((s) => s.mode === 'send')

  useEffect(() => {
    fetchSessions(); fetchTemplates()
    api.network.interfaces().then(setIfaces).catch(() => {})
  }, [])

  const portNum     = parseInt(form.port)     || 6969
  const ttlNum      = parseInt(form.ttl)      || 32
  const intervalNum = parseInt(form.intervalMs) || 1000

  const handleOneShot = async () => {
    setError(''); setStatus('')
    try {
      const r = await api.network.send({
        multicastAddr: form.mcastAddr,
        port: portNum,
        interfaceName: form.iface,
        ttl: ttlNum,
        loopback: form.loopback,
        format: form.format,
        content: form.content,
      })
      setStatus(`Sent ${r.sent} bytes → ${r.dest}:${r.port}`)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Send failed') }
  }

  const handleStartSession = async () => {
    setError(''); setStatus('')
    try {
      const sess = await api.sessions.create({
        name: form.name,
        mode: 'send',
        multicastAddr: form.mcastAddr,
        port: portNum,
        interfaceName: form.iface,
        ttl: ttlNum,
        loopback: form.loopback,
        format: form.format,
        content: form.content,
        sendMode: form.sendMode,
        intervalMs: intervalNum,
        dynamicFields: form.dynFields,
      })
      const started = await api.sessions.start(sess.id)
      upsert(started)
      setStatus(`Session "${started.name}" started`)
      form.setField('name', (() => {
        const m = form.name.match(/^(.*?)(\d+)$/)
        return m ? m[1] + (+m[2] + 1) : form.name + ' 2'
      })())
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to start') }
  }

  const handleStop   = async (s: SessionStatus) => { upsert(await api.sessions.stop(s.id)) }
  const handlePause  = async (s: SessionStatus) => { upsert(await api.sessions.pause(s.id)) }
  const handleResume = async (s: SessionStatus) => {
    try { upsert(await api.sessions.resume(s.id)) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Resume failed') }
  }
  const handleDelete = async (s: SessionStatus) => { await api.sessions.delete(s.id); remove(s.id) }

  return (
    <div className="p-5 space-y-4">
      <h1 className="font-mono font-semibold text-xs tracking-[0.25em] uppercase text-t1">
        <span className="text-amber mr-2">&gt;</span>Send
      </h1>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 border border-red/30 bg-red/4 font-mono text-xs text-red">
          <span className="text-2xs">✕</span> {error}
        </div>
      )}
      {status && (
        <div className="flex items-center gap-2 px-3 py-2 border border-green/30 bg-green/4 font-mono text-xs text-green">
          <span className="text-2xs">✓</span> {status}
        </div>
      )}

      {/* Active transmissions */}
      {sendSessions.length > 0 && (
        <Card accent="amber">
          <CardHeader>
            <SectionLabel>Active Transmissions</SectionLabel>
            <span className="font-mono text-2xs text-t3">
              {sendSessions.filter(s => s.state === 'running').length} live · {sendSessions.length} total
            </span>
          </CardHeader>
          <div className="divide-y divide-b1/40">
            {sendSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-raised/30 transition-colors">
                <div className="w-24 shrink-0"><StateBadge state={s.state} /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-t1 truncate">{s.name}</div>
                  <div className="font-mono text-2xs text-t3">{s.id.slice(0, 8)}</div>
                </div>
                <div className="hidden sm:flex items-center gap-5 shrink-0">
                  <div className="text-right">
                    <div className="font-mono text-xs tabular-nums text-amber">{s.sent?.toLocaleString() ?? 0}</div>
                    <div className="font-mono text-2xs text-t3 uppercase">pkts</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs tabular-nums text-t2">{fmtBytes(s.bytesSent ?? 0)}</div>
                    <div className="font-mono text-2xs text-t3 uppercase">bytes</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.state === 'running' && <>
                    <Button size="xs" variant="amber"  onClick={() => handlePause(s)}>⏸ Pause</Button>
                    <Button size="xs" variant="danger" onClick={() => handleStop(s)}>■ Stop</Button>
                  </>}
                  {s.state === 'paused' && <>
                    <Button size="xs" variant="primary" onClick={() => handleResume(s)}>▶ Resume</Button>
                    <Button size="xs" variant="danger"  onClick={() => handleStop(s)}>■ Stop</Button>
                  </>}
                  {(s.state === 'stopped' || s.state === 'idle') &&
                    <Button size="xs" variant="ghost" onClick={() => handleDelete(s)}>✕ Remove</Button>
                  }
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Message editor */}
        <div className="flex flex-col">
          <Card className={`flex flex-col flex-1 border-l-2 ${fmtAccentLeft[form.format] ?? 'border-l-b1'}`}>
            <CardHeader>
              <SectionLabel>Payload</SectionLabel>
              <div className="flex items-center gap-0.5">
                {(['cot','json','vmf','raw'] as MessageFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => form.setFormat(f)}
                    className={`px-2 py-0.5 font-mono font-medium text-2xs tracking-widest uppercase transition-all border ${
                      form.format === f
                        ? 'text-amber border-amber/50 bg-amber/8'
                        : 'text-t3 border-b1 hover:text-t2 hover:border-b2'
                    }`}
                  >
                    {FORMAT_LABELS[f]}
                  </button>
                ))}
              </div>
            </CardHeader>

            {form.format === 'raw' && (
              <div className="px-4 py-1 border-b border-b1 bg-purple/4">
                <span className="font-mono text-2xs text-purple tracking-wide">
                  {'CUSTOM MODE — verbatim. Tokens: {{timestamp}} {{seq}} {{uuid}}'}
                </span>
              </div>
            )}

            {templates.filter(t => t.format === form.format).length > 0 && (
              <div className="px-4 py-2 border-b border-b1">
                <select
                  className="w-full bg-black text-t2 font-mono text-2xs border border-b1 px-2 py-1 outline-none focus:border-amber transition-colors cursor-pointer"
                  onChange={(e) => {
                    const t = templates.find(x => x.id === e.target.value)
                    if (t) { form.setField('format', t.format); form.setContent(t.content) }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Load template…</option>
                  {templates.filter(t => t.format === form.format).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <textarea
              className="code-area flex-1 border-0 border-t-0"
              rows={14}
              value={form.content}
              onChange={(e) => form.setContent(e.target.value)}
              spellCheck={false}
              placeholder={form.format === 'raw' ? 'Enter any content to transmit…' : undefined}
            />

            <div className="px-4 py-2 border-t border-b1 flex items-center justify-between bg-dark/50">
              <label className="flex items-center gap-2 cursor-pointer group" onClick={() => form.setField('dynFields', !form.dynFields)}>
                <div className={`w-7 h-3.5 border transition-all duration-200 cursor-pointer relative ${form.dynFields ? 'bg-amber/20 border-amber/50' : 'bg-b1 border-b1'}`}>
                  <div className={`absolute top-0.5 w-2.5 h-2.5 transition-all duration-200 ${form.dynFields ? 'left-[14px] bg-amber' : 'left-0.5 bg-t3'}`} />
                </div>
                <span className="font-mono font-medium text-2xs tracking-widest uppercase text-t3 group-hover:text-t2 transition-colors">
                  Dynamic Fields
                </span>
              </label>
              <span className="font-mono text-2xs text-t3">{form.content.length} chars</span>
            </div>
          </Card>
        </div>

        {/* Config + controls */}
        <div className="space-y-3">
          <Card>
            <CardHeader><SectionLabel>Network Target</SectionLabel></CardHeader>
            <CardBody className="space-y-3">
              <Field label="Session Name">
                <input className="field-input" value={form.name} onChange={e => form.setField('name', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Multicast Address">
                  <input className="field-input" value={form.mcastAddr} onChange={e => form.setField('mcastAddr', e.target.value)} />
                </Field>
                <Field label="Port">
                  <input
                    className="field-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.port}
                    onChange={e => form.setField('port', e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </Field>
              </div>
              <Field label="Interface">
                <select className="field-select" value={form.iface} onChange={e => form.setField('iface', e.target.value)}>
                  <option value="">Auto-detect</option>
                  {ifaces.filter(i => i.isUp).map(i => (
                    <option key={i.name} value={i.name}>{i.name}{i.addrs[0] ? ` · ${i.addrs[0].split('/')[0]}` : ''}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="TTL">
                  <input
                    className="field-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.ttl}
                    onChange={e => form.setField('ttl', e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </Field>
                <Field label="Loopback">
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={form.loopback} onChange={e => form.setField('loopback', e.target.checked)} className="accent-amber w-3 h-3" />
                    <span className="font-mono text-2xs text-t2">Enable</span>
                  </label>
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><SectionLabel>Transmission Mode</SectionLabel></CardHeader>
            <CardBody className="space-y-3">
              <div className="flex gap-0.5">
                {(['oneshot', 'periodic'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => form.setField('sendMode', m)}
                    className={`flex-1 py-1.5 font-mono font-medium text-2xs tracking-widest uppercase border transition-all ${
                      form.sendMode === m
                        ? 'text-amber border-amber/50 bg-amber/8'
                        : 'text-t3 border-b1 hover:border-b2 hover:text-t2'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              {form.sendMode === 'periodic' && (
                <Field label="Interval (ms)" hint="Min 100ms">
                  <input
                    className="field-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.intervalMs}
                    onChange={e => form.setField('intervalMs', e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </Field>
              )}
            </CardBody>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleOneShot}>▶ One-Shot</Button>
            <Button variant="primary" onClick={handleStartSession}>
              {form.sendMode === 'periodic' ? '⟳ Start Periodic' : '▶ Start Session'}
            </Button>
          </div>
          <p className="font-mono text-2xs text-t3 leading-relaxed">
            Multiple sessions can run simultaneously to different groups · ports · interfaces.
          </p>
        </div>
      </div>
    </div>
  )
}
