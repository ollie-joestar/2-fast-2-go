import { useRef, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './Scene.tsx'
import { COLOR_SCHEMES } from './options.ts'

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

const BLANK = '--:--.--'

export default function App() {
  const speedRef = useRef<HTMLSpanElement>(null)
  const lapTimeRef = useRef<HTMLSpanElement>(null)
  const bestLapRef = useRef<HTMLSpanElement>(null)
  const lastLapRef = useRef<HTMLSpanElement>(null)

  const [showDebug, setShowDebug] = useState(false)
  const debugContentRef = useRef<HTMLPreElement>(null)

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

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 500, position: [0, 8, -12] }}
        gl={{ antialias: true }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <color attach="background" args={[COLOR_SCHEMES.default.sky]} />
        <fogExp2 attach="fog" args={COLOR_SCHEMES.default.fog} />
        <Scene onHudUpdate={handleHudUpdate} onDebugUpdate={handleDebugUpdate} showDebug={showDebug} />
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
        <div>Speed: <span ref={speedRef}>0 km/h</span></div>
        <div>Lap:&nbsp;&nbsp;<span ref={lapTimeRef}>{BLANK}</span></div>
        <div>Best: <span ref={bestLapRef}>{BLANK}</span></div>
        <div>Last: <span ref={lastLapRef}>{BLANK}</span></div>
        <div style={{ marginTop: 6, opacity: 0.5, fontWeight: 'normal', fontSize: 11 }}>
          WASD / Arrows — drive
        </div>
      </div>

      {/* Debug overlay — bottom right, toggled by 'i' */}
      <div
        style={{
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
        }}
      >
        <pre ref={debugContentRef} style={{ margin: 0 }} />
      </div>
    </div>
  )
}
