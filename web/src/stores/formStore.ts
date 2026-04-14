import { create } from 'zustand'
import type { MessageFormat } from '../lib/types'

const DEFAULT_COT = `<?xml version="1.0" encoding="UTF-8"?>
<event version="2.0" uid="MMT-{{uuid}}" type="a-f-G-U-C"
      time="{{timestamp}}" start="{{timestamp}}" stale="{{timestamp}}" how="m-g">
  <point lat="37.7749" lon="-122.4194" hae="0" ce="10" le="10"/>
  <detail>
    <contact callsign="ALPHA-1"/>
    <remarks>MMT transmission</remarks>
  </detail>
</event>`

export const FORMAT_DEFAULTS: Record<MessageFormat, string> = {
  cot:     DEFAULT_COT,
  json:    '{\n  "header": {\n    "msgType": "POSITION_REPORT",\n    "senderId": "UNIT-ALPHA",\n    "timestamp": "{{timestamp}}"\n  },\n  "body": {\n    "latitude": 37.7749,\n    "longitude": -122.4194,\n    "seq": {{seq}}\n  }\n}',
  vmf:     '4d4d5400 0001 0000',
  raw:     '',
  unknown: '',
}

// ── Send form ──────────────────────────────────────────────────────────────

interface SendFormState {
  name: string
  format: MessageFormat
  content: string
  mcastAddr: string
  port: string
  iface: string
  ttl: string
  loopback: boolean
  sendMode: 'oneshot' | 'periodic'
  intervalMs: string
  dynFields: boolean
}

interface SendFormStore extends SendFormState {
  setField: <K extends keyof SendFormState>(k: K, v: SendFormState[K]) => void
  setFormat: (f: MessageFormat) => void
  setContent: (c: string) => void
}

export const useSendForm = create<SendFormStore>((set) => ({
  name:       'TX-1',
  format:     'cot',
  content:    DEFAULT_COT,
  mcastAddr:  '239.2.3.1',
  port:       '6969',
  iface:      '',
  ttl:        '32',
  loopback:   false,
  sendMode:   'periodic',
  intervalMs: '1000',
  dynFields:  true,

  setField:  (k, v)  => set({ [k]: v } as Partial<SendFormState>),
  setFormat: (f)     => set({ format: f, content: FORMAT_DEFAULTS[f] }),
  setContent:(c)     => set({ content: c }),
}))

// ── Receive form ───────────────────────────────────────────────────────────

interface ReceiveFormState {
  name:      string
  mcastAddr: string
  port:      string
  iface:     string
}

interface ReceiveFormStore extends ReceiveFormState {
  setField: <K extends keyof ReceiveFormState>(k: K, v: ReceiveFormState[K]) => void
}

export const useReceiveForm = create<ReceiveFormStore>((set) => ({
  name:      'RX-1',
  mcastAddr: '239.2.3.1',
  port:      '6969',
  iface:     '',

  setField: (k, v) => set({ [k]: v } as Partial<ReceiveFormState>),
}))
