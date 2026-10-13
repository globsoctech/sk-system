import * as THREE from 'three'
import type { GlazingUnit, HallConfig } from '../../store/configStore'
import { holesForWall, punchHoles, type UvRect } from './wallOpenings'

const OVERHANG = 0.25

export function roofRise(config: Pick<HallConfig, 'roofType' | 'roofPitch' | 'width'>) {
  if (config.roofType === 'monopitch') {
    return Math.tan((config.roofPitch * Math.PI) / 180) * config.width
  }
  return Math.tan((config.roofPitch * Math.PI) / 180) * (config.width / 2)
}

function createBuilder() {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const pushTri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    const i = positions.length / 3
    const n = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a))
      .normalize()
    for (const p of [a, b, c]) {
      positions.push(p.x, p.y, p.z)
      normals.push(n.x, n.y, n.z)
    }
    uvs.push(a.x, a.y, b.x, b.y, c.x, c.y)
    indices.push(i, i + 1, i + 2)
  }

  const pushQuad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
    pushTri(a, b, c)
    pushTri(a, c, d)
  }

  const pushPolygon = (pts: THREE.Vector3[], flip = false) => {
    for (let i = 1; i < pts.length - 1; i++) {
      if (flip) pushTri(pts[0], pts[i + 1], pts[i])
      else pushTri(pts[0], pts[i], pts[i + 1])
    }
  }

  const build = () => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()
    return geo
  }

  return { pushTri, pushQuad, pushPolygon, build }
}

type WallMapper = (u: number, v: number) => THREE.Vector3

function emitPunchedWall(
  pushQuad: (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => void,
  rect: UvRect,
  holes: UvRect[],
  map: WallMapper,
  /** winding: false = map(u0,v0)->(u1,v0)->(u1,v1)->(u0,v1) */
  flip = false,
) {
  const parts = punchHoles(rect, holes)
  for (const p of parts) {
    const a = map(p.u0, p.v0)
    const b = map(p.u1, p.v0)
    const c = map(p.u1, p.v1)
    const d = map(p.u0, p.v1)
    if (flip) pushQuad(a, d, c, b)
    else pushQuad(a, b, c, d)
  }
}

export function buildWallsOnly(config: HallConfig, glazing: GlazingUnit[] = []) {
  const L = config.length
  const W = config.width
  const H = config.wallHeight
  const R = roofRise(config)
  const hx = W / 2
  const hz = L / 2
  const oh = OVERHANG
  const isGable = config.roofType === 'gable'
  const { pushQuad, pushPolygon, build } = createBuilder()

  const yLow = H
  const yHigh = isGable ? H : H + R
  const yRidge = H + R

  const gw = Math.min(config.gateWidth ?? 4, W - 1)
  const gh = Math.min(config.gateHeight ?? 4.5, H - 0.3)
  const gateHole =
    config.showGate !== false
      ? [{ u0: -gw / 2, u1: gw / 2, v0: 0, v1: gh }]
      : []

  // Left wall (x = -hx): u = z, v = y, height H
  emitPunchedWall(
    pushQuad,
    { u0: -hz, u1: hz, v0: 0, v1: yLow },
    holesForWall(glazing, 'left'),
    (u, v) => new THREE.Vector3(-hx, v, u),
    false,
  )

  // Right wall (x = +hx)
  emitPunchedWall(
    pushQuad,
    { u0: -hz, u1: hz, v0: 0, v1: yHigh },
    holesForWall(glazing, 'right'),
    (u, v) => new THREE.Vector3(hx, v, u),
    true,
  )

  // Front / back: rectangular band 0..H with holes, then roof silhouette above
  const fillEnd = (zSign: 1 | -1, wall: 'front' | 'back') => {
    const z = zSign * hz
    const zo = zSign * (hz + oh)
    const flip = zSign > 0

    const frontHoles =
      wall === 'front'
        ? [
            ...holesForWall(
              glazing,
              'front',
              config.showGate !== false ? { width: gw, height: gh } : null,
            ),
            ...gateHole,
          ]
        : holesForWall(glazing, wall)

    emitPunchedWall(
      pushQuad,
      { u0: -hx, u1: hx, v0: 0, v1: yLow },
      frontHoles,
      (u, v) => new THREE.Vector3(u, v, z),
      flip,
    )

    if (isGable) {
      pushPolygon(
        [
          new THREE.Vector3(-hx, yLow, z),
          new THREE.Vector3(0, yRidge, z),
          new THREE.Vector3(hx, yLow, z),
        ],
        flip,
      )
      pushQuad(
        new THREE.Vector3(-hx, yLow, z),
        new THREE.Vector3(-hx - oh, yLow, zo),
        new THREE.Vector3(0, yRidge, zo),
        new THREE.Vector3(0, yRidge, z),
      )
      pushQuad(
        new THREE.Vector3(0, yRidge, z),
        new THREE.Vector3(0, yRidge, zo),
        new THREE.Vector3(hx + oh, yLow, zo),
        new THREE.Vector3(hx, yLow, z),
      )
    } else {
      // Monopitch upper wedge (above eave line on low side → high)
      pushPolygon(
        [
          new THREE.Vector3(-hx, yLow, z),
          new THREE.Vector3(hx, yHigh, z),
          new THREE.Vector3(hx, yLow, z),
        ],
        flip,
      )
      pushQuad(
        new THREE.Vector3(-hx, yLow, z),
        new THREE.Vector3(-hx - oh, yLow, zo),
        new THREE.Vector3(hx + oh, yHigh, zo),
        new THREE.Vector3(hx, yHigh, z),
      )
    }
  }

  fillEnd(-1, 'back')
  fillEnd(1, 'front')

  // Soffits
  pushQuad(
    new THREE.Vector3(-hx, yLow, -hz),
    new THREE.Vector3(-hx, yLow, hz),
    new THREE.Vector3(-hx - oh, yLow, hz),
    new THREE.Vector3(-hx - oh, yLow, -hz),
  )
  pushQuad(
    new THREE.Vector3(hx, yHigh, hz),
    new THREE.Vector3(hx, yHigh, -hz),
    new THREE.Vector3(hx + oh, yHigh, -hz),
    new THREE.Vector3(hx + oh, yHigh, hz),
  )
  if (isGable) {
    // right soffit at eave height for gable (yHigh === yLow)
  }

  return build()
}

export function buildRoofOnly(config: HallConfig) {
  const L = config.length
  const W = config.width
  const H = config.wallHeight
  const R = roofRise(config)
  const hx = W / 2
  const hz = L / 2
  const oh = OVERHANG
  const isGable = config.roofType === 'gable'
  const { pushQuad, build } = createBuilder()
  const eps = 0.015

  if (isGable) {
    pushQuad(
      new THREE.Vector3(-hx - oh, H + eps, -hz - oh),
      new THREE.Vector3(-hx - oh, H + eps, hz + oh),
      new THREE.Vector3(0, H + R + eps, hz + oh),
      new THREE.Vector3(0, H + R + eps, -hz - oh),
    )
    pushQuad(
      new THREE.Vector3(0, H + R + eps, -hz - oh),
      new THREE.Vector3(0, H + R + eps, hz + oh),
      new THREE.Vector3(hx + oh, H + eps, hz + oh),
      new THREE.Vector3(hx + oh, H + eps, -hz - oh),
    )
    pushQuad(
      new THREE.Vector3(-0.1, H + R + eps + 0.04, -hz - oh),
      new THREE.Vector3(-0.1, H + R + eps + 0.04, hz + oh),
      new THREE.Vector3(0.1, H + R + eps + 0.04, hz + oh),
      new THREE.Vector3(0.1, H + R + eps + 0.04, -hz - oh),
    )
  } else {
    pushQuad(
      new THREE.Vector3(-hx - oh, H + eps, -hz - oh),
      new THREE.Vector3(-hx - oh, H + eps, hz + oh),
      new THREE.Vector3(hx + oh, H + R + eps, hz + oh),
      new THREE.Vector3(hx + oh, H + R + eps, -hz - oh),
    )
  }

  return build()
}

export { OVERHANG }
