import { create } from 'zustand'
import type { Template } from '../lib/types'
import { api } from '../lib/api'

interface TemplateStore {
  templates: Template[]
  loading: boolean
  fetch: () => Promise<void>
  add: (t: Template) => void
  update: (t: Template) => void
  remove: (id: string) => void
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  templates: [],
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const templates = await api.templates.list()
      set({ templates })
    } finally {
      set({ loading: false })
    }
  },

  add: (t) => set((s) => ({ templates: [...s.templates, t] })),

  update: (t) =>
    set((s) => ({
      templates: s.templates.map((x) => (x.id === t.id ? t : x)),
    })),

  remove: (id) => set((s) => ({ templates: s.templates.filter((x) => x.id !== id) })),
}))
