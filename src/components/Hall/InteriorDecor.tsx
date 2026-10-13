import { useMemo } from 'react'
import { useConfigStore } from '../../store/configStore'

const PETAL = ['#e85d75', '#f2a65a', '#f7e27a', '#ffffff', '#d4a5ff', '#ff8fab']
const LEAF = '#3d7a4a'
const POT = '#8b5a3c'
const SOIL = '#3b2a1f'

function Flower({
  position,
  scale = 1,
  petal,
}: {
  position: [number, number, number]
  scale?: number
  petal: string
}) {
  const s = scale
  return (
    <group position={position} scale={s}>
      {/* stem */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.7, 6]} />
        <meshStandardMaterial color="#2f6b3a" roughness={0.8} />
      </mesh>
      {/* leaves */}
      <mesh position={[0.08, 0.25, 0]} rotation={[0, 0, 0.7]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color={LEAF} roughness={0.85} />
      </mesh>
      <mesh position={[-0.07, 0.32, 0.04]} rotation={[0, 0.4, -0.6]}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color={LEAF} roughness={0.85} />
      </mesh>
      {/* petals */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.1, 0.72, Math.sin(a) * 0.1]}
          >
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshStandardMaterial color={petal} roughness={0.55} />
          </mesh>
        )
      })}
      {/* center */}
      <mesh position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color="#f5c518" roughness={0.4} />
      </mesh>
    </group>
  )
}

function Planter({
  position,
  size = [1.2, 0.45, 0.55] as [number, number, number],
  flowers,
}: {
  position: [number, number, number]
  size?: [number, number, number]
  flowers: { dx: number; dz: number; scale: number; petal: string }[]
}) {
  return (
    <group position={position}>
      <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={POT} roughness={0.9} />
      </mesh>
      <mesh position={[0, size[1] + 0.02, 0]}>
        <boxGeometry args={[size[0] * 0.9, 0.06, size[2] * 0.85]} />
        <meshStandardMaterial color={SOIL} roughness={1} />
      </mesh>
      {flowers.map((f, i) => (
        <Flower
          key={i}
          position={[f.dx, size[1], f.dz]}
          scale={f.scale}
          petal={f.petal}
        />
      ))}
    </group>
  )
}

function Bush({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 0.35, 8]} />
        <meshStandardMaterial color={POT} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.45, 12, 10]} />
        <meshStandardMaterial color="#4a8f55" roughness={0.85} />
      </mesh>
      <mesh position={[0.25, 0.65, 0.1]}>
        <sphereGeometry args={[0.28, 10, 8]} />
        <meshStandardMaterial color="#5aa362" roughness={0.85} />
      </mesh>
      <mesh position={[-0.2, 0.6, -0.15]}>
        <sphereGeometry args={[0.25, 10, 8]} />
        <meshStandardMaterial color="#3f7d48" roughness={0.85} />
      </mesh>
    </group>
  )
}

export function InteriorDecor() {
  const length = useConfigStore((s) => s.length)
  const width = useConfigStore((s) => s.width)

  const layout = useMemo(() => {
    const hx = width / 2 - 1.2
    const hz = length / 2 - 1.5
    const planters: {
      pos: [number, number, number]
      flowers: { dx: number; dz: number; scale: number; petal: string }[]
    }[] = []

    // Along right inner wall
    for (let i = 0; i < 4; i++) {
      const z = -hz + 2 + i * ((hz * 2 - 4) / 3)
      planters.push({
        pos: [hx, 0.02, z],
        flowers: [
          { dx: -0.25, dz: 0, scale: 0.85, petal: PETAL[i % PETAL.length] },
          { dx: 0.15, dz: 0.08, scale: 1, petal: PETAL[(i + 2) % PETAL.length] },
          { dx: 0, dz: -0.1, scale: 0.7, petal: PETAL[(i + 4) % PETAL.length] },
        ],
      })
    }

    // Front corner office vibe
    planters.push({
      pos: [-hx * 0.35, 0.02, hz - 1.2],
      flowers: [
        { dx: -0.3, dz: 0, scale: 1.1, petal: '#ff8fab' },
        { dx: 0.1, dz: 0.1, scale: 0.9, petal: '#ffffff' },
        { dx: 0.35, dz: -0.05, scale: 1, petal: '#f2a65a' },
      ],
    })

    planters.push({
      pos: [hx * 0.2, 0.02, -hz + 1.4],
      flowers: [
        { dx: -0.2, dz: 0.05, scale: 0.95, petal: '#d4a5ff' },
        { dx: 0.25, dz: -0.05, scale: 1.05, petal: '#e85d75' },
      ],
    })

    const bushes: [number, number, number][] = [
      [-hx, 0.02, -hz * 0.4],
      [-hx, 0.02, hz * 0.35],
      [hx * 0.55, 0.02, hz - 2.2],
    ]

    return { planters, bushes }
  }, [length, width])

  // Floor markings / soft interior ground
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <planeGeometry args={[width - 0.4, length - 0.4]} />
        <meshStandardMaterial color="#d9d2c5" roughness={0.95} />
      </mesh>

      {/* Soft interior fill light bounce — subtle warm patch */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <circleGeometry args={[Math.min(width, length) * 0.25, 24]} />
        <meshStandardMaterial color="#efe6d6" roughness={1} transparent opacity={0.7} />
      </mesh>

      {layout.planters.map((p, i) => (
        <Planter key={i} position={p.pos} flowers={p.flowers} />
      ))}
      {layout.bushes.map((b, i) => (
        <Bush key={`b-${i}`} position={b} />
      ))}

      {/* Simple bench */}
      <group position={[0, 0, -length / 2 + 2.5]}>
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[2.2, 0.08, 0.55]} />
          <meshStandardMaterial color="#6b4f3a" roughness={0.7} />
        </mesh>
        <mesh position={[-0.9, 0.2, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.5]} />
          <meshStandardMaterial color="#5a4130" />
        </mesh>
        <mesh position={[0.9, 0.2, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.5]} />
          <meshStandardMaterial color="#5a4130" />
        </mesh>
      </group>
    </group>
  )
}
