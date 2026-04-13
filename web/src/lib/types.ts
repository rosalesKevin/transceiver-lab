export type MessageFormat = 'cot' | 'json' | 'vmf' | 'raw' | 'unknown'
export type SessionMode = 'send' | 'receive'
export type SendMode = 'oneshot' | 'periodic'
export type SessionState = 'idle' | 'running' | 'paused' | 'stopped'

export interface Template {
  id: string
  name: string
  format: MessageFormat
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface SessionConfig {
  id?: string
  name: string
  mode: SessionMode
  multicastAddr: string
  port: number
  interfaceName: string
  ttl: number
  loopback: boolean
  format: MessageFormat
  content: string
  sendMode: SendMode
  intervalMs: number
  dynamicFields: boolean
}

export interface SessionStatus {
  id: string
  name: string
  state: SessionState
  mode: SessionMode
  sent: number
  received: number
  bytesSent: number
  bytesRecv: number
  startedAt?: string
  lastTx?: string
  lastRx?: string
  error?: string
}

export interface MessageRecord {
  id: string
  sessionId: string
  direction: 'tx' | 'rx'
  timestamp: string
  sourceAddr: string
  destAddr: string
  format: MessageFormat
  content: string
  rawHex: string
  sizeBytes: number
}

export interface NetworkInterface {
  name: string
  addrs: string[]
  flags: string
  isUp: boolean
  isLoopback: boolean
}

export interface HistoryResult {
  total: number
  page: number
  pageSize: number
  records: MessageRecord[]
}

export interface WsRxMessage {
  type: 'rx_message'
  sessionId: string
  timestamp: string
  source: string
  format: MessageFormat
  raw: string
  rawHex: string
  content: string
  sizeBytes: number
}

export interface WsSessionStatus {
  type: 'session_status'
  status: SessionStatus
}
