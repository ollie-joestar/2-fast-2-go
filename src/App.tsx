import { useRef, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './Scene.tsx'
import { COLOR_SCHEMES } from './options.ts'
import { useMultiplayer, colorForId } from './useMultiplayer.ts'
import { me } from 'playroomkit'
import type { PlayerState } from 'playroomkit'

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

const BLANK = '--:--.--'

type LeaderboardEntry = {
  id: string
  name: string
  color: string
  lap: number
  cp: number
  isMe: boolean
}

function ordinal(n: number): string {
  if (n === 1) return '1st'
  if (n === 2) return '2nd'
  if (n === 3) return '3rd'
  return `${n}th`
}

export default function App() {
  const speedRef = useRef<HTMLSpanElement>(null)
  const lapTimeRef = useRef<HTMLSpanElement>(null)
  const bestLapRef = useRef<HTMLSpanElement>(null)
  const lastLapRef = useRef<HTMLSpanElement>(null)
  const lapNumRef = useRef<HTMLSpanElement>(null)

  const [showDebug, setShowDebug] = useState(false)
  const debugContentRef = useRef<HTMLPreElement>(null)

  // Local race progress — updated via onProgressUpdate from Scene
  const localProgressRef = useRef({ lap: 0, cp: 0 })

  const { remotePlayers, broadcast, playersList, isConnected } = useMultiplayer()

  // Ref to the leaderboard rows container — updated imperatively, no React state
  const leaderboardBodyRef = useRef<HTMLDivElement>(null)

  // Keep a stable ref to playersList so the interval doesn't go stale
  const playersListRef = useRef<PlayerState[]>([])
  playersListRef.current = playersList

  // Rebuild leaderboard DOM at ~1 Hz — direct innerHTML, no setState, no re-render
  useEffect(() => {
    const id = setInterval(() => {
      if (!leaderboardBodyRef.current) return
      const list = playersListRef.current
      if (list.length === 0) return
      const myId = me()?.id
      const entries: LeaderboardEntry[] = list.map(p => {
        const isMe = p.id === myId
        const lap = isMe
          ? localProgressRef.current.lap
          : ((p.state.lap as number | undefined) ?? 0)
        const cp = isMe
          ? localProgressRef.current.cp
          : ((p.state.cp as number | undefined) ?? 0)
        const profile = p.getProfile?.()
        return {
          id: p.id,
          name: profile?.name ?? p.id.slice(0, 8),
          color: profile?.color?.hex ?? colorForId(p.id),
          lap,
          cp,
          isMe,
        }
      })
      entries.sort((a, b) => (b.lap - a.lap) || (b.cp - a.cp))
      leaderboardBodyRef.current.innerHTML = entries.map((entry, i) =>
        `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-weight:${entry.isMe ? 'bold' : 'normal'};color:${entry.isMe ? '#ffdd44' : '#ffffff'}">` +
        `<span style="width:28px;color:#888;font-size:11px">${ordinal(i + 1)}</span>` +
        `<span style="width:8px;height:8px;border-radius:50%;background:${entry.color};display:inline-block;flex-shrink:0"></span>` +
        `<span style="flex:1">${entry.name}${entry.isMe ? ' ★' : ''}</span>` +
        `<span style="color:${entry.lap > 0 ? '#44ff88' : '#555'};font-size:11px">${entry.lap > 0 ? `L${entry.lap}` : '--'}</span>` +
        `</div>`
      ).join('')
    }, 500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'i' || e.key === 'I') setShowDebug(v => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleHudUpdate = useCallback((kmh: number, lapMs: number | null, bestMs: number | null, lastMs: number | null) => {
    if (speedRef.current) speedRef.current.textContent = `${kmh.toFixed(0)} km/h`
    if (lapTimeRef.current) lapTimeRef.current.textContent = lapMs !== null ? formatTime(lapMs) : BLANK
    if (bestLapRef.current) bestLapRef.current.textContent = bestMs !== null ? formatTime(bestMs) : BLANK
    if (lastLapRef.current) lastLapRef.current.textContent = lastMs !== null ? formatTime(lastMs) : BLANK
  }, [])

  const handleDebugUpdate = useCallback((
    carX: number, carZ: number,
    cpsPassed: number, cpsTotal: number,
    next3: [number, number][],
  ) => {
    if (!debugContentRef.current) return
    const nextLines = next3.map((p, i) => `  CP+${i + 1}: (${p[0].toFixed(1)}, ${p[1].toFixed(1)})`)
    debugContentRef.current.textContent = [
      `Pos:  ${carX.toFixed(1)}, ${carZ.toFixed(1)}`,
      `CPs:  ${cpsPassed} / ${cpsTotal}`,
      ...nextLines,
    ].join('\n')
  }, [])

  const handleProgressUpdate = useCallback((lap: number, cp: number) => {
    localProgressRef.current = { lap, cp }
    if (lapNumRef.current) {
      lapNumRef.current.textContent = lap > 0 ? `Lap ${lap}` : ''
    }
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 500, position: [0, 8, -12] }}
        gl={{ antialias: true }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <color attach="background" args={[COLOR_SCHEMES.default.sky]} />
        <fogExp2 attach="fog" args={COLOR_SCHEMES.default.fog} />
        <Scene
          onHudUpdate={handleHudUpdate}
          onDebugUpdate={handleDebugUpdate}
          showDebug={showDebug}
          remotePlayers={remotePlayers}
          broadcast={broadcast}
          onProgressUpdate={handleProgressUpdate}
        />
      </Canvas>

      {/* Main HUD — top left */}
      <div style={{
        position: 'fixed',
        top: 16,
        left: 16,
        color: '#fff',
        font: 'bold 13px/1.8 monospace',
        pointerEvents: 'none',
        textShadow: '1px 1px 3px #000',
      }}>
        <div><span ref={lapNumRef} style={{ color: '#ffdd44' }} /></div>
        <div>Speed: <span ref={speedRef}>0 km/h</span></div>
        <div>Lap:&nbsp;&nbsp;<span ref={lapTimeRef}>{BLANK}</span></div>
        <div>Best: <span ref={bestLapRef}>{BLANK}</span></div>
        <div>Last: <span ref={lastLapRef}>{BLANK}</span></div>
        <div style={{ marginTop: 6, opacity: 0.5, fontWeight: 'normal', fontSize: 11 }}>
          WASD / Arrows — drive · [I] debug
        </div>
      </div>

      {/* Leaderboard — top right; outer shell rendered once on connect, rows updated via DOM ref */}
      {isConnected && (
        <div style={{
          position: 'fixed',
          top: 16,
          right: 16,
          color: '#fff',
          font: '13px/1.6 monospace',
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.55)',
          padding: '8px 14px',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.12)',
          minWidth: 180,
        }}>
          <div style={{ color: '#aaa', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>
            PLAYERS
          </div>
          <div ref={leaderboardBodyRef} />
        </div>
      )}

      {/* Debug overlay — bottom right, toggled by 'i' */}
      <div style={{
        display: showDebug ? 'block' : 'none',
        position: 'fixed',
        bottom: 16,
        right: 16,
        color: '#00ff88',
        font: '11px/1.6 monospace',
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.55)',
        padding: '8px 12px',
        borderRadius: 4,
        border: '1px solid rgba(0,255,136,0.25)',
      }}>
        <pre ref={debugContentRef} style={{ margin: 0 }} />
      </div>
    </div>
  )
}
