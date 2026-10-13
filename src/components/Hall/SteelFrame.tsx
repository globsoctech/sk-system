import { useMemo } from 'react'
import { useConfigStore } from '../../store/configStore'
import { roofRise } from './geometry'

const COL_SIZE = 0.2
const BEAM = 0.16
const INSET = 0.28

export function SteelFrame() {
  const length = useConfigStore((s) => s.length)
  const width = useConfigStore((s) => s.width)
  const wallHeight = useConfigStore((s) => s.wallHeight)
  const showFrame = useConfigStore((s) => s.showFrame)
  const frameColor = useConfigStore((s) => s.frameColor)
  const roofType = useConfigStore((s) => s.roofType)
  const roofPitch = useConfigStore((s) => s.roofPitch)

  const frames = useMemo(() => {
    if (!showFrame) return []

    const spacing = 5
    const count = Math.max(2, Math.floor(length / spacing) + 1)
    const actual = length / (count - 1)
    const hx = width / 2 - INSET
    const hz = length / 2
    const R = roofRise({ length, width, wallHeight, roofPitch, roofType } as never)
    const rInner = Math.max(0.15, R - 0.12)
    const lowH = wallHeight - 0.05
    const highH = roofType === 'monopitch' ? wallHeight + rInner - 0.05 : lowH

    const items: {
      pos: [number, number, number]
      rot?: [number, number, number]
      size: [number, number, number]
    }[] = []

    for (let i = 0; i < count; i++) {
      const z = -hz + i * actual

      // Low side columns
      items.push({
        pos: [-hx, lowH / 2, z],
        size: [COL_SIZE, lowH, COL_SIZE],
      })
      // High side columns (taller on monopitch)
      items.push({
        pos: [hx, highH / 2, z],
        size: [COL_SIZE, highH, COL_SIZE],
      })

      if (roofType === 'gable') {
        const rafterLen = Math.hypot(hx, rInner) - 0.05
        const angle = Math.atan2(rInner, hx)
        items.push({
          pos: [-hx / 2, wallHeight + rInner / 2 - 0.08, z],
          rot: [0, 0, angle],
          size: [rafterLen, BEAM, BEAM],
        })
        items.push({
          pos: [hx / 2, wallHeight + rInner / 2 - 0.08, z],
          rot: [0, 0, -angle],
          size: [rafterLen, BEAM, BEAM],
        })
        items.push({
          pos: [0, wallHeight + rInner / 2 - 0.05, z],
          size: [BEAM * 0.7, Math.max(0.15, rInner - 0.1), BEAM * 0.7],
        })
      } else {
        const span = hx * 2
        const rafterLen = Math.hypot(span, rInner) - 0.05
        const angle = Math.atan2(rInner, span)
        // Rafter follows roof slope under the skin
        items.push({
          pos: [0, wallHeight + rInner / 2 - 0.1, z],
          rot: [0, 0, angle],
          size: [rafterLen, BEAM, BEAM],
        })
      }
    }

    items.push({
      pos: [-hx, wallHeight - 0.08, 0],
      size: [BEAM, BEAM, length - INSET * 2],
    })
    items.push({
      pos: [hx, (roofType === 'monopitch' ? wallHeight + rInner : wallHeight) - 0.08, 0],
      size: [BEAM, BEAM, length - INSET * 2],
    })
    if (roofType === 'gable') {
      items.push({
        pos: [0, wallHeight + rInner - 0.1, 0],
        size: [BEAM, BEAM, length - INSET * 2],
      })
    }

    return items
  }, [length, width, wallHeight, showFrame, roofType, roofPitch])

  if (!showFrame) return null

  return (
    <group>
      {frames.map((f, i) => (
        <mesh key={i} position={f.pos} rotation={f.rot ?? [0, 0, 0]} castShadow>
          <boxGeometry args={f.size} />
          <meshStandardMaterial color={frameColor} metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}
