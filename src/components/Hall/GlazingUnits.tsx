import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { useConfigStore, type GlazingUnit, type WallId } from '../../store/configStore'

const OUT = 0.02
const GATE_OUT = 0.13
const FRAME = '#1a1a1a'
const SELECT = '#c87f50'
/** Outer frame face width */
export const FRAME_W = 0.08
const FRAME_D = 0.05

function placeOnWall(
  wall: WallId,
  along: number,
  y: number,
  hx: number,
  hz: number,
): { pos: [number, number, number]; rot: [number, number, number] } {
  switch (wall) {
    case 'right':
      return { pos: [hx + OUT, y, along], rot: [0, -Math.PI / 2, 0] }
    case 'left':
      return { pos: [-hx - OUT, y, along], rot: [0, Math.PI / 2, 0] }
    case 'front':
      return { pos: [along, y, hz + OUT], rot: [0, 0, 0] }
    case 'gate':
      return { pos: [along, y, hz + GATE_OUT], rot: [0, 0, 0] }
    case 'back':
      return { pos: [along, y, -hz - OUT], rot: [0, Math.PI, 0] }
  }
}

function wallPlane(wall: WallId, hx: number, hz: number) {
  switch (wall) {
    case 'right':
      return new THREE.Plane(new THREE.Vector3(-1, 0, 0), hx + OUT)
    case 'left':
      return new THREE.Plane(new THREE.Vector3(1, 0, 0), hx + OUT)
    case 'front':
      return new THREE.Plane(new THREE.Vector3(0, 0, -1), hz + OUT)
    case 'gate':
      return new THREE.Plane(new THREE.Vector3(0, 0, -1), hz + GATE_OUT)
    case 'back':
      return new THREE.Plane(new THREE.Vector3(0, 0, 1), hz + OUT)
  }
}

function hitToAlongY(wall: WallId, hit: THREE.Vector3) {
  if (wall === 'left' || wall === 'right') return { along: hit.z, y: hit.y }
  return { along: hit.x, y: hit.y }
}

function paneCount(type: GlazingUnit['type'], w: number) {
  if (type === 'window') return 1
  if (type === 'ribbon') return Math.min(4, Math.max(2, Math.round(w / 1.8)))
  if (type === 'glass-door') return Math.min(3, Math.max(2, Math.round(w / 1.2)))
  return Math.min(4, Math.max(2, Math.round(w / 1.5)))
}

/**
 * unit.w / unit.h = outer size including frame.
 * Glass fills the inner clear opening only — one pane, no extra tint layers.
 */
function GlassPanel({
  w,
  h,
  type,
  selected,
}: {
  w: number
  h: number
  type: GlazingUnit['type']
  selected: boolean
}) {
  const f = FRAME_W
  const innerW = Math.max(0.3, w - f * 2)
  const innerH = Math.max(0.3, h - f * 2)
  const cols = paneCount(type, innerW)
  const mullion = 0.045
  const usable = innerW - mullion * (cols - 1)
  const paneW = usable / cols
  const color = selected ? SELECT : FRAME

  return (
    <group>
      {/* Outer frame only — 4 bars, corners meet cleanly */}
      <mesh position={[0, h / 2 - f / 2, 0]}>
        <boxGeometry args={[w, f, FRAME_D]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[0, -h / 2 + f / 2, 0]}>
        <boxGeometry args={[w, f, FRAME_D]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[-w / 2 + f / 2, 0, 0]}>
        <boxGeometry args={[f, innerH, FRAME_D]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[w / 2 - f / 2, 0, 0]}>
        <boxGeometry args={[f, innerH, FRAME_D]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.45} />
      </mesh>

      {/* Mullions between panes */}
      {Array.from({ length: cols - 1 }).map((_, i) => {
        const x = -innerW / 2 + paneW * (i + 1) + mullion * i + mullion / 2
        return (
          <mesh key={i} position={[x, 0, 0]}>
            <boxGeometry args={[mullion, innerH, FRAME_D * 0.9]} />
            <meshStandardMaterial color={color} metalness={0.4} roughness={0.45} />
          </mesh>
        )
      })}

      {/* ONE glass plane only — FrontSide avoids double-edge from back face */}
      <mesh position={[0, 0, FRAME_D * 0.15]} renderOrder={2}>
        <planeGeometry args={[innerW - 0.02, innerH - 0.02]} />
        <meshPhysicalMaterial
          color="#c5e3f0"
          transmission={0.88}
          transparent
          opacity={1}
          thickness={0.25}
          ior={1.45}
          roughness={0.08}
          metalness={0}
          reflectivity={0.25}
          envMapIntensity={0.7}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>

      <mesh visible={false}>
        <boxGeometry args={[w + 0.25, h + 0.25, 0.35]} />
      </mesh>
    </group>
  )
}

function DraggableGlazing({
  unit,
  hx,
  hz,
  selected,
}: {
  unit: GlazingUnit
  hx: number
  hz: number
  selected: boolean
}) {
  const updateGlazing = useConfigStore((s) => s.updateGlazing)
  const selectGlazing = useConfigStore((s) => s.selectGlazing)
  const controls = useThree((s) => s.controls) as { enabled: boolean } | null
  const dragging = useRef(false)
  const plane = useMemo(() => wallPlane(unit.wall, hx, hz), [unit.wall, hx, hz])
  const hit = useMemo(() => new THREE.Vector3(), [])
  const placed = placeOnWall(unit.wall, unit.along, unit.y, hx, hz)

  const setOrbit = (on: boolean) => {
    if (controls) controls.enabled = on
    document.body.style.cursor = on ? '' : 'grabbing'
  }

  return (
    <group
      position={placed.pos}
      rotation={placed.rot}
      onPointerDown={(e) => {
        e.stopPropagation()
        dragging.current = true
        selectGlazing(unit.id)
        setOrbit(false)
        const t = e.target as unknown as { setPointerCapture?: (id: number) => void } | null
        t?.setPointerCapture?.(e.pointerId)
      }}
      onPointerUp={(e) => {
        e.stopPropagation()
        dragging.current = false
        setOrbit(true)
        const t = e.target as unknown as { releasePointerCapture?: (id: number) => void } | null
        try {
          t?.releasePointerCapture?.(e.pointerId)
        } catch {
          /* ignore */
        }
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return
        e.stopPropagation()
        if (e.ray.intersectPlane(plane, hit)) {
          const { along, y } = hitToAlongY(unit.wall, hit)
          updateGlazing(unit.id, { along, y })
        }
      }}
    >
      <GlassPanel w={unit.w} h={unit.h} type={unit.type} selected={selected} />
    </group>
  )
}

export function GlazingUnits() {
  const length = useConfigStore((s) => s.length)
  const width = useConfigStore((s) => s.width)
  const wallHeight = useConfigStore((s) => s.wallHeight)
  const glazing = useConfigStore((s) => s.glazing)
  const selectedId = useConfigStore((s) => s.selectedGlazingId)
  const showSkylight = useConfigStore((s) => s.showSkylight)
  const roofPitch = useConfigStore((s) => s.roofPitch)
  const roofType = useConfigStore((s) => s.roofType)
  const selectGlazing = useConfigStore((s) => s.selectGlazing)

  const hx = width / 2
  const hz = length / 2

  const ridgeY = useMemo(() => {
    const rise =
      roofType === 'monopitch'
        ? Math.tan((roofPitch * Math.PI) / 180) * width
        : Math.tan((roofPitch * Math.PI) / 180) * (width / 2)
    return wallHeight + rise + 0.16
  }, [wallHeight, roofPitch, roofType, width])

  return (
    <group onPointerMissed={() => selectGlazing(null)}>
      {glazing.map((g) => (
        <DraggableGlazing
          key={g.id}
          unit={g}
          hx={hx}
          hz={hz}
          selected={selectedId === g.id}
        />
      ))}

      {showSkylight && roofType === 'gable' && (
        // Thin box along ridge (X = width of strip, Z = hall length) — never a vertical plane
        <mesh position={[0, ridgeY, 0]}>
          <boxGeometry args={[0.85, 0.04, length * 0.9]} />
          <meshPhysicalMaterial
            color="#eaf6fc"
            transmission={0.85}
            roughness={0.12}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  )
}
