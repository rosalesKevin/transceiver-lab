import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Send, Radio, BookTemplate,
  History, Settings, Activity,
} from 'lucide-react'
import Dashboard from './pages/Dashboard'
import SendPage from './pages/Send'
import Receive from './pages/Receive'
import Templates from './pages/Templates'
import HistoryPage from './pages/History'
import SettingsPage from './pages/Settings'
import { useSessionStore } from './stores/sessionStore'
import { sessionWs, rxWs, onSessionStatus } from './lib/ws'

const nav = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/send',      icon: Send,            label: 'Send'      },
  { to: '/receive',   icon: Radio,           label: 'Receive'   },
  { to: '/templates', icon: BookTemplate,    label: 'Templates' },
  { to: '/history',   icon: History,         label: 'History'   },
  { to: '/settings',  icon: Settings,        label: 'Settings'  },
]

function Clock() {
  const [time, setTime] = useState(() => new Date().toISOString().slice(11, 19) + 'Z')
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toISOString().slice(11, 19) + 'Z'), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono text-2xs text-t3 tabular-nums">{time}</span>
}

function TxCounter({ value, label }: { value: number; label: string }) {
  const prev = useRef(value)
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    if (value !== prev.current) {
      setFlash(true)
      prev.current = value
      const t = setTimeout(() => setFlash(false), 350)
      return () => clearTimeout(t)
    }
  }, [value])
  return (
    <span className={`font-mono text-2xs tabular-nums transition-colors duration-300 ${flash ? 'text-amber' : 'text-t3'}`}>
      <span className="text-t3 mr-1">{label}</span>
      {value.toLocaleString()}
    </span>
  )
}

function AppInner() {
  const { sessions, upsert, fetch } = useSessionStore()
  const location = useLocation()

  useEffect(() => {
    fetch()
    rxWs.connect()
    sessionWs.connect()
    const off = onSessionStatus((msg) => upsert(msg.status))
    return () => { off(); rxWs.disconnect(); sessionWs.disconnect() }
  }, [])

  const running = sessions.filter((s) => s.state === 'running').length
  const totalSent = sessions.reduce((a, s) => a + (s.sent ?? 0), 0)
  const totalRecv = sessions.reduce((a, s) => a + (s.received ?? 0), 0)

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Amber accent bar */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber/50 to-transparent shrink-0" />

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-2 bg-dark border-b border-b1 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Activity size={13} className="text-amber" />
            <span className="font-mono font-bold text-sm tracking-[0.25em] uppercase text-t1">TXL</span>
            <span className="text-b2 text-xs">|</span>
            <span className="font-mono text-2xs tracking-[0.15em] text-t3 uppercase">Transceiver Lab</span>
          </div>
          {running > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 border border-green/25 bg-green/4">
              <span className="running-dot" style={{ width: 5, height: 5 }} />
              <span className="font-mono text-2xs text-green tracking-widest uppercase">{running} Live</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-5">
          <TxCounter value={totalSent} label="TX" />
          <TxCounter value={totalRecv} label="RX" />
          <Clock />
          <span className="font-mono text-2xs text-t3 tracking-widest">v1.0.0</span>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-40 bg-dark border-r border-b1 flex flex-col py-2 shrink-0">
          <div className="px-3 pb-2 mb-1 border-b border-b1">
            <span className="font-mono font-medium text-2xs tracking-[0.2em] uppercase text-t3">Nav</span>
          </div>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 font-mono font-medium text-xs tracking-wide uppercase transition-all duration-100 ${
                  isActive
                    ? 'text-amber bg-amber/5 border-r-2 border-amber'
                    : 'text-t3 hover:text-t1 hover:bg-raised border-r-2 border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`w-3 font-mono text-2xs ${isActive ? 'text-amber' : 'text-b2'}`}>
                    {isActive ? '>' : ' '}
                  </span>
                  <Icon size={12} className={isActive ? 'text-amber' : 'text-t3'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}

          {/* Active session list */}
          {sessions.filter(s => s.state === 'running').length > 0 && (
            <div className="mt-auto px-3 pt-2 border-t border-b1 space-y-1">
              <span className="font-mono font-medium text-2xs tracking-[0.2em] uppercase text-t3">Active</span>
              {sessions.filter(s => s.state === 'running').slice(0, 4).map(s => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <span className="running-dot" style={{ width: 4, height: 4 }} />
                  <span className="font-mono text-2xs text-green truncate">{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* Main */}
        <main key={location.pathname} className="flex-1 overflow-auto bg-black grid-bg page-enter">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/send"      element={<SendPage />} />
            <Route path="/receive"   element={<Receive />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/history"   element={<HistoryPage />} />
            <Route path="/settings"  element={<SettingsPage />} />
          </Routes>
        </main>
      </div>

      {/* Status bar */}
      <footer className="flex items-center gap-5 px-5 py-1 bg-dark border-t border-b1 shrink-0">
        <span className="font-mono text-2xs text-t3 tracking-widest">SYS NOMINAL</span>
        <span className="text-b2">·</span>
        <span className="font-mono text-2xs text-t2">
          {sessions.length} SESSION{sessions.length !== 1 ? 'S' : ''}
        </span>
        <span className="text-b2">·</span>
        <span className="font-mono text-2xs">
          {running > 0
            ? <><span className="text-green">{running}</span><span className="text-t2"> RUNNING</span></>
            : <span className="text-t3">IDLE</span>
          }
        </span>
        <span className="ml-auto font-mono text-2xs text-t3">UDP MULTICAST · IPv4 · ASM/SSM</span>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
