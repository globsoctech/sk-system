import { useMemo } from 'react'
import { useConfigStore } from '../../store/configStore'
import { holesForWall, punchHoles } from './wallOpenings'

const GATE_OUT = 0.12

/** Gate leaf with punched vision panels for gate glazing */
export function Openings() {
  const width = useConfigStore((s) => s.width)
  const length = useConfigStore((s) => s.length)
  const wallHeight = useConfigStore((s) => s.wallHeight)
  const showGate = useConfigStore((s) => s.showGate)
  const gateWidth = useConfigStore((s) => s.gateWidth)
  const gateHeight = useConfigStore((s) => s.gateHeight)
  const glazing = useConfigStore((s) => s.glazing)

  const gw = Math.min(gateWidth, width - 1)
  const gh = Math.min(gateHeight, wallHeight - 0.3)
  const hz = length / 2

  const panels = useMemo(() => {
    const holes = holesForWall(glazing, 'gate')
    return punchHoles({ u0: -gw / 2, u1: gw / 2, v0: 0, v1: gh }, holes)
  }, [glazing, gw, gh])

  if (!showGate) return null

  return (
    <group position={[0, 0, hz + GATE_OUT]}>
      {panels.map((p, i) => {
        const w = p.u1 - p.u0
        const h = p.v1 - p.v0
        const cx = (p.u0 + p.u1) / 2
        const cy = (p.v0 + p.v1) / 2
        return (
          <mesh key={i} position={[cx, cy, 0]} castShadow>
            <boxGeometry args={[w, h, 0.1]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.55} roughness={0.42} />
          </mesh>
        )
      })}

      <mesh position={[0, gh + 0.06, 0]}>
        <boxGeometry args={[gw + 0.2, 0.12, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-gw / 2 - 0.06, gh / 2, 0]}>
        <boxGeometry args={[0.12, gh + 0.12, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[gw / 2 + 0.06, gh / 2, 0]}>
        <boxGeometry args={[0.12, gh + 0.12, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.7} roughness={0.3} />
      </mesh>

      {Array.from({ length: 5 }).map((_, i) => {
        const y = ((i + 1) * gh) / 6
        const overlapsWindow = glazing.some(
          (g) => g.wall === 'gate' && Math.abs(y - g.y) < g.h / 2 + 0.05,
        )
        if (overlapsWindow) return null
        return (
          <mesh key={`bar-${i}`} position={[0, y, 0.06]}>
            <boxGeometry args={[gw * 0.92, 0.035, 0.02]} />
            <meshStandardMaterial color="#c87f50" metalness={0.5} roughness={0.4} />
          </mesh>
        )
      })}
    </group>
  )
}
