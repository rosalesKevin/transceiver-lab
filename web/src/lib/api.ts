import type {
  Template,
  SessionConfig,
  SessionStatus,
  NetworkInterface,
  HistoryResult,
} from './types'

const BASE = '/api/v1'

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return undefined as T
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data as T
}

// Templates
export const api = {
  templates: {
    list: () => request<Template[]>('GET', '/templates'),
    get: (id: string) => request<Template>('GET', `/templates/${id}`),
    create: (t: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => request<Template>('POST', '/templates', t),
    update: (id: string, t: Partial<Template>) => request<Template>('PUT', `/templates/${id}`, t),
    delete: (id: string) => request<void>('DELETE', `/templates/${id}`),
  },

  sessions: {
    list: () => request<SessionStatus[]>('GET', '/sessions'),
    create: (cfg: SessionConfig) => request<SessionStatus>('POST', '/sessions', cfg),
    get: (id: string) => request<SessionStatus>('GET', `/sessions/${id}`),
    start: (id: string) => request<SessionStatus>('POST', `/sessions/${id}/start`),
    pause: (id: string) => request<SessionStatus>('POST', `/sessions/${id}/pause`),
    resume: (id: string) => request<SessionStatus>('POST', `/sessions/${id}/resume`),
    stop: (id: string) => request<SessionStatus>('POST', `/sessions/${id}/stop`),
    delete: (id: string) => request<void>('DELETE', `/sessions/${id}`),
  },

  network: {
    interfaces: () => request<NetworkInterface[]>('GET', '/network/interfaces'),
    send: (payload: {
      multicastAddr: string
      port: number
      interfaceName: string
      ttl: number
      loopback: boolean
      format: string
      content: string
    }) => request<{ sent: number; dest: string; port: number; timestamp: string }>('POST', '/send', payload),
  },

  history: {
    query: (params: Record<string, string | number>) => {
      const qs = new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== '' && v !== undefined)
          .map(([k, v]) => [k, String(v)])
      ).toString()
      return request<HistoryResult>('GET', `/history${qs ? '?' + qs : ''}`)
    },
    exportURL: () => BASE + '/history/export',
    clear: () => request<void>('DELETE', '/history'),
  },

  settings: {
    get: () => request<Record<string, string>>('GET', '/settings'),
    update: (settings: Record<string, string>) => request<void>('PUT', '/settings', settings),
  },
}
