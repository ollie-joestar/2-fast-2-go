import { useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './Scene.tsx'

export default function App() {
  const speedRef = useRef<HTMLSpanElement>(null)
  const driftRef = useRef<HTMLSpanElement>(null)

  const handleHudUpdate = useCallback((kmh: number, drifting: boolean) => {
    if (speedRef.current) speedRef.current.textContent = `${kmh.toFixed(0)} km/h`
    if (driftRef.current) driftRef.current.style.display = drifting ? 'inline' : 'none'
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 500, position: [0, 8, -12] }}
        gl={{ antialias: true }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        {/* <color attach="background" args={['#66FFee']} /> */}
        <color attach="background" args={['#1f1f26']} />
        <fogExp2 attach="fog" args={['#2a2a2a', 0.012]} />
        <Scene onHudUpdate={handleHudUpdate} />
      </Canvas>

      <div style={{
        position: 'fixed',
        top: 16,
        left: 16,
        color: '#fff',
        font: 'bold 13px/1.6 monospace',
        pointerEvents: 'none',
        textShadow: '1px 1px 3px #000',
      }}>
        Speed: <span ref={speedRef}>0</span>
        <span ref={driftRef} style={{ color: '#f39c12', display: 'none' }}>{'  DRIFT'}</span>
        <br />
        <span style={{ opacity: 0.6, fontWeight: 'normal' }}>WASD / Arrows — drive | Space — handbrake</span>
      </div>
    </div>
  )
}

