import { useRef, useCallback } from 'react'
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
  const speedRef   = useRef<HTMLSpanElement>(null)
  const lapTimeRef = useRef<HTMLSpanElement>(null)
  const bestLapRef = useRef<HTMLSpanElement>(null)

  const handleHudUpdate = useCallback((kmh: number, lapMs: number | null, bestMs: number | null) => {
    if (speedRef.current)   speedRef.current.textContent   = `${kmh.toFixed(0)} km/h`
    if (lapTimeRef.current) lapTimeRef.current.textContent = lapMs !== null ? formatTime(lapMs) : BLANK
    if (bestLapRef.current) bestLapRef.current.textContent = bestMs !== null ? formatTime(bestMs) : BLANK
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
        <Scene onHudUpdate={handleHudUpdate} />
      </Canvas>

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
        <div style={{ marginTop: 6, opacity: 0.5, fontWeight: 'normal', fontSize: 11 }}>
          WASD / Arrows — drive &nbsp;·&nbsp; Space — drift
        </div>
      </div>
    </div>
  )
}
