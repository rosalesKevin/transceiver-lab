import type { WsRxMessage, WsSessionStatus } from './types'

type RxHandler = (msg: WsRxMessage) => void
type StatusHandler = (msg: WsSessionStatus) => void

class WsClient {
  private ws: WebSocket | null = null
  private url: string
  private handlers: Set<(data: unknown) => void> = new Set()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private shouldConnect = false

  constructor(path: string) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    this.url = `${proto}://${window.location.host}${path}`
  }

  connect() {
    this.shouldConnect = true
    this.open()
  }

  disconnect() {
    this.shouldConnect = false
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  on(handler: (data: unknown) => void) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  private open() {
    if (this.ws && this.ws.readyState < 2) return
    this.ws = new WebSocket(this.url)
    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this.handlers.forEach((h) => h(data))
      } catch {}
    }
    this.ws.onclose = () => {
      if (this.shouldConnect) {
        this.reconnectTimer = setTimeout(() => this.open(), 2000)
      }
    }
  }
}

export const rxWs = new WsClient('/ws/receive')
export const sessionWs = new WsClient('/ws/sessions')

export function onRxMessage(handler: RxHandler) {
  return rxWs.on((data) => {
    const msg = data as WsRxMessage
    if (msg.type === 'rx_message') handler(msg)
  })
}

export function onSessionStatus(handler: StatusHandler) {
  return sessionWs.on((data) => {
    const msg = data as WsSessionStatus
    if (msg.type === 'session_status') handler(msg)
  })
}
