import { useEffect, useState } from 'react'
import { Card, CardHeader, CardBody, SectionLabel } from '../components/Card'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { api } from '../lib/api'

const DEFAULTS: Record<string, string> = {
  defaultMcastAddr:  '239.2.3.1',
  defaultPort:       '6969',
  defaultTTL:        '32',
  defaultFormat:     'cot',
  historyMaxRecords: '10000',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULTS)
  const [status, setStatus] = useState('')
  const [error, setError]   = useState('')

  useEffect(() => {
    api.settings.get().then(s => setSettings({ ...DEFAULTS, ...s })).catch(() => {})
  }, [])

  const handleSave = async () => {
    setError(''); setStatus('')
    try { await api.settings.update(settings); setStatus('Settings saved.') }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed') }
  }

  const set = (k: string, v: string) => setSettings(p => ({ ...p, [k]: v }))

  return (
    <div className="p-5 space-y-4 max-w-xl">
      <h1 className="font-mono font-semibold text-xs tracking-[0.25em] uppercase text-t1">
        <span className="text-amber mr-2">&gt;</span>Settings
      </h1>

      {status && <div className="flex items-center gap-2 px-3 py-2 border border-green/30 bg-green/4 font-mono text-xs text-green">✓ {status}</div>}
      {error  && <div className="flex items-center gap-2 px-3 py-2 border border-red/30  bg-red/4  font-mono text-xs text-red">✕ {error}</div>}

      <Card accent="amber">
        <CardHeader><SectionLabel>Network Defaults</SectionLabel></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Default Multicast Address">
              <input className="field-input" value={settings.defaultMcastAddr} onChange={e => set('defaultMcastAddr', e.target.value)} />
            </Field>
            <Field label="Default Port">
              <input className="field-input" type="number" value={settings.defaultPort} onChange={e => set('defaultPort', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Default TTL">
              <input className="field-input" type="number" min={1} max={255} value={settings.defaultTTL} onChange={e => set('defaultTTL', e.target.value)} />
            </Field>
            <Field label="Default Format">
              <select className="field-select" value={settings.defaultFormat} onChange={e => set('defaultFormat', e.target.value)}>
                <option value="cot">CoT (Cursor on Target)</option>
                <option value="json">JSON</option>
                <option value="vmf">VMF (Binary)</option>
                <option value="raw">Custom (Raw)</option>
              </select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><SectionLabel>History</SectionLabel></CardHeader>
        <CardBody>
          <Field label="Max Records" hint="Older records auto-purge when limit is reached">
            <input className="field-input" type="number" value={settings.historyMaxRecords} onChange={e => set('historyMaxRecords', e.target.value)} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><SectionLabel>System Info</SectionLabel></CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {[
              ['App',       'Transceiver Lab v1.0.0'],
              ['Transport', 'UDP Multicast IPv4'],
              ['Modes',     'ASM / SSM'],
              ['Formats',   'CoT 2.0 · JSON · VMF · Raw'],
              ['Database',  'SQLite (local)'],
              ['API',       'REST + WebSocket'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-2">
                <span className="font-mono font-medium text-2xs tracking-[0.15em] uppercase text-t3 w-20 shrink-0">{k}</span>
                <span className="font-mono text-xs text-t2">{v}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Button variant="primary" onClick={handleSave}>✓ Save Settings</Button>
    </div>
  )
}
