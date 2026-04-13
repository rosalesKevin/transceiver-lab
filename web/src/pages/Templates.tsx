import { useEffect, useState } from 'react'
import { Card, CardHeader, CardBody, SectionLabel } from '../components/Card'
import { Button } from '../components/Button'
import { FormatBadge } from '../components/Badge'
import { Field } from '../components/Field'
import { useTemplateStore } from '../stores/templateStore'
import { api } from '../lib/api'
import type { MessageFormat, Template } from '../lib/types'

const FORMAT_LABELS: Record<string, string> = { cot:'CoT', json:'JSON', vmf:'VMF', raw:'Custom' }

export default function Templates() {
  const { templates, fetch, add, update, remove } = useTemplateStore()
  const [editing, setEditing] = useState<Partial<Template> | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => { fetch() }, [])

  const filtered = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  )

  const startNew  = () => { setEditing({ name:'', format:'cot', content:'', tags:[] }); setTagInput(''); setError(''); setStatus('') }
  const startEdit = (t: Template) => { setEditing({...t}); setTagInput(t.tags.join(', ')); setError(''); setStatus('') }

  const handleSave = async () => {
    if (!editing) return
    setError('')
    if (!editing.name?.trim()) { setError('Name is required'); return }
    try {
      const tags = tagInput.split(',').map(s => s.trim()).filter(Boolean)
      if (editing.id) {
        const updated = await api.templates.update(editing.id, {...editing, tags})
        update(updated); setStatus(`"${updated.name}" updated`)
      } else {
        const created = await api.templates.create({ name:editing.name!, format:(editing.format as MessageFormat)?? 'cot', content:editing.content??'', tags })
        add(created); setStatus(`"${created.name}" created`)
      }
      setEditing(null)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed') }
  }

  const handleDelete = async (id: string) => {
    await api.templates.delete(id)
    remove(id)
    if (editing?.id === id) setEditing(null)
  }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-baseline justify-between">
        <h1 className="font-mono font-semibold text-xs tracking-[0.25em] uppercase text-t1">
          <span className="text-amber mr-2">&gt;</span>Templates
        </h1>
        <Button variant="primary" onClick={startNew}>+ New Template</Button>
      </div>

      {status && (
        <div className="flex items-center gap-2 px-3 py-2 border border-green/30 bg-green/4 font-mono text-xs text-green">
          <span className="text-2xs">✓</span> {status}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Template list */}
        <Card>
          <CardHeader>
            <SectionLabel>Library</SectionLabel>
            <span className="font-mono text-2xs text-t3">{filtered.length} templates</span>
          </CardHeader>
          <div className="px-4 py-2 border-b border-b1">
            <input
              className="w-full bg-black text-t1 font-mono text-xs border border-b1 px-2 py-1.5 outline-none focus:border-amber transition-colors placeholder:text-t3"
              placeholder="Search templates…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto max-h-[520px] divide-y divide-b1/40">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center font-mono text-2xs text-t3 tracking-widest uppercase">
                {templates.length === 0 ? 'No templates — click + New Template' : 'No matches'}
              </div>
            ) : filtered.map(t => (
              <div
                key={t.id}
                onClick={() => startEdit(t)}
                className={`px-4 py-3 cursor-pointer transition-colors hover:bg-raised/30 ${editing?.id === t.id ? 'bg-raised/50 border-l-2 border-l-amber' : 'border-l-2 border-l-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-t1">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <FormatBadge format={t.format} />
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
                      className="font-mono text-2xs text-t3 hover:text-red transition-colors"
                    >✕</button>
                  </div>
                </div>
                {t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 font-mono text-2xs text-t3 bg-raised border border-b1 tracking-wide">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Editor */}
        {editing ? (
          <Card>
            <CardHeader>
              <SectionLabel>{editing.id ? 'Edit Template' : 'New Template'}</SectionLabel>
              <button onClick={() => setEditing(null)} className="font-mono text-2xs text-t3 hover:text-t1 transition-colors">✕ Discard</button>
            </CardHeader>
            <CardBody className="space-y-4">
              {error && <div className="font-mono text-xs text-red border border-red/30 bg-red/4 px-3 py-2">{error}</div>}

              <Field label="Template Name">
                <input
                  className="field-input"
                  value={editing.name ?? ''}
                  onChange={e => setEditing(prev => ({...prev!, name:e.target.value}))}
                  placeholder="Give it a descriptive name"
                />
              </Field>

              <div>
                <div className="font-mono font-medium text-2xs tracking-[0.18em] uppercase text-t3 mb-1.5">Format</div>
                <div className="flex gap-0.5">
                  {(['cot','json','vmf','raw'] as MessageFormat[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setEditing(prev => ({...prev!, format:f}))}
                      className={`px-3 py-1 font-mono font-medium text-2xs tracking-widest uppercase border transition-all ${
                        editing.format === f
                          ? 'text-amber border-amber/50 bg-amber/8'
                          : 'text-t3 border-b1 hover:text-t2 hover:border-b2'
                      }`}
                    >
                      {FORMAT_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-mono font-medium text-2xs tracking-[0.18em] uppercase text-t3 mb-1.5">Content</div>
                <textarea
                  className="code-area w-full"
                  rows={13}
                  value={editing.content ?? ''}
                  onChange={e => setEditing(prev => ({...prev!, content:e.target.value}))}
                  spellCheck={false}
                  placeholder="Message payload…"
                />
              </div>

              <Field label="Tags" hint="Comma-separated · used for filtering">
                <input
                  className="field-input"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="cot, position, starter"
                />
              </Field>

              <div className="flex gap-2 pt-1">
                <Button variant="primary" onClick={handleSave}>
                  {editing.id ? '✓ Save Changes' : '+ Create Template'}
                </Button>
                <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <div className="flex flex-col items-center justify-center h-full px-4 py-16 text-center space-y-3">
              <div className="font-mono text-2xs text-t3 tracking-widest uppercase">
                Select a template to edit
              </div>
              <div className="font-mono text-2xs text-t3">or</div>
              <Button variant="outline" onClick={startNew}>+ New Template</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
