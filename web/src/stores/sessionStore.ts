import { create } from 'zustand'
import type { SessionStatus } from '../lib/types'
import { api } from '../lib/api'

interface SessionStore {
  sessions: SessionStatus[]
  loading: boolean
  fetch: () => Promise<void>
  upsert: (s: SessionStatus) => void
  remove: (id: string) => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const sessions = await api.sessions.list()
      set({ sessions })
    } finally {
      set({ loading: false })
    }
  },

  upsert: (s) => {
    set((state) => {
      const idx = state.sessions.findIndex((x) => x.id === s.id)
      if (idx >= 0) {
        const next = [...state.sessions]
        next[idx] = s
        return { sessions: next }
      }
      return { sessions: [...state.sessions, s] }
    })
  },

  remove: (id) => {
    set((state) => ({ sessions: state.sessions.filter((x) => x.id !== id) }))
  },
}))
