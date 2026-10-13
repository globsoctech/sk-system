import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { useConfigStore, type HallConfig } from '../../store/configStore'
import { buildWallsOnly, buildRoofOnly } from './geometry'
import { SteelFrame } from './SteelFrame'
import { Openings } from './Openings'
import { GlazingUnits } from './GlazingUnits'
import { InteriorDecor } from './InteriorDecor'

export function HallModel() {
  const length = useConfigStore((s) => s.length)
  const width = useConfigStore((s) => s.width)
  const wallHeight = useConfigStore((s) => s.wallHeight)
  const roofPitch = useConfigStore((s) => s.roofPitch)
  const roofType = useConfigStore((s) => s.roofType)
  const wallColor = useConfigStore((s) => s.wallColor)
  const roofColor = useConfigStore((s) => s.roofColor)
  const glazing = useConfigStore((s) => s.glazing)
  const showGate = useConfigStore((s) => s.showGate)
  const gateWidth = useConfigStore((s) => s.gateWidth)
  const gateHeight = useConfigStore((s) => s.gateHeight)

  const shapeKey = `${length}-${width}-${wallHeight}-${roofPitch}-${roofType}-${showGate}-${gateWidth}-${gateHeight}`
  const openingsKey = glazing
    .map((g) => `${g.id}:${g.wall}:${g.along.toFixed(2)}:${g.y.toFixed(2)}:${g.w}:${g.h}`)
    .join('|')

  const wallsGeo = useMemo(() => {
    const cfg = {
      length,
      width,
      wallHeight,
      roofPitch,
      roofType,
      showGate,
      gateWidth,
      gateHeight,
    } as HallConfig
    return buildWallsOnly(cfg, glazing)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey, openingsKey])

  const roofGeo = useMemo(() => {
    const cfg = { length, width, wallHeight, roofPitch, roofType } as HallConfig
    return buildRoofOnly(cfg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapeKey])

  return (
    <group>
      <mesh geometry={wallsGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={wallColor}
          metalness={0.22}
          roughness={0.58}
          side={DoubleSide}
          depthWrite
        />
      </mesh>

      <mesh geometry={roofGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color={roofColor}
          metalness={0.32}
          roughness={0.48}
          side={DoubleSide}
          depthWrite
        />
      </mesh>

      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[width + 0.6, 0.24, length + 0.6]} />
        <meshStandardMaterial color="#ececec" roughness={0.95} />
      </mesh>

      <InteriorDecor />
      <SteelFrame />
      <Openings />
      <GlazingUnits />

      <gridHelper
        args={[Math.max(length, width) * 1.8, 16, '#c87f50', '#efefef']}
        position={[0, 0.001, 0]}
      />
    </group>
  )
}
