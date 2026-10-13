import { create } from 'zustand'

export type RoofType = 'gable' | 'monopitch'
export type WallId = 'left' | 'right' | 'front' | 'back' | 'gate'
export type GlazingType = 'window' | 'ribbon' | 'glass-door' | 'office'

export interface GlazingUnit {
  id: string
  wall: WallId
  /** Horizontal center along the facade (world X or Z depending on wall) */
  along: number
  /** Vertical center (world Y) */
  y: number
  w: number
  h: number
  type: GlazingType
}

export interface HallConfig {
  length: number
  width: number
  wallHeight: number
  roofPitch: number
  wallColor: string
  roofColor: string
  frameColor: string
  showFrame: boolean
  showGate: boolean
  gateWidth: number
  gateHeight: number
  roofType: RoofType
  showSkylight: boolean
  glazing: GlazingUnit[]
  selectedGlazingId: string | null
}

interface ConfigStore extends HallConfig {
  set: <K extends keyof HallConfig>(key: K, value: HallConfig[K]) => void
  addGlazing: (partial?: Partial<Omit<GlazingUnit, 'id'>>) => string
  updateGlazing: (id: string, patch: Partial<GlazingUnit>) => void
  removeGlazing: (id: string) => void
  clearGlazing: () => void
  selectGlazing: (id: string | null) => void
  reset: () => void
}

export const WALL_COLORS = [
  { name: 'Antracyt', hex: '#383E42' },
  { name: 'Czarny mat', hex: '#1a1a1a' },
  { name: 'Biały aluminium', hex: '#A5A5A5' },
  { name: 'Szary jasny', hex: '#D7D7D7' },
  { name: 'Granat SK', hex: '#030f27' },
  { name: 'Niebieski', hex: '#0E4C92' },
  { name: 'Zielony', hex: '#4B6B3C' },
  { name: 'Czerwony', hex: '#9B2335' },
]

export const ROOF_COLORS = [
  { name: 'Antracyt', hex: '#383E42' },
  { name: 'Ceglasty', hex: '#A65D3F' },
  { name: 'Grafit', hex: '#2B2B2B' },
  { name: 'Szary', hex: '#7A7A7A' },
  { name: 'Miedź SK', hex: '#c87f50' },
]

export const GLAZING_CATALOG: {
  type: GlazingType
  name: string
  desc: string
  w: number
  h: number
}[] = [
  { type: 'window', name: 'Okno', desc: 'Przeciągnij po fasadzie', w: 1.6, h: 1.2 },
  { type: 'ribbon', name: 'Pas okien', desc: 'Szeroki poziom pas', w: 4.5, h: 1.0 },
  { type: 'glass-door', name: 'Drzwi szklane', desc: 'Witryna / drzwi', w: 2.4, h: 2.4 },
  { type: 'office', name: 'Strefa biurowa', desc: 'Duże oszklenie', w: 5.5, h: 4.5 },
]

export const WALL_LABELS: Record<WallId, string> = {
  front: 'Front',
  back: 'Tył',
  left: 'Lewa',
  right: 'Prawa',
  gate: 'Brama',
}

export type ClampDims = {
  length: number
  width: number
  wallHeight: number
  gateWidth: number
  gateHeight: number
  showGate?: boolean
}

function uid() {
  return `g-${Math.random().toString(36).slice(2, 9)}`
}

export function defaultSize(type: GlazingType) {
  const m = GLAZING_CATALOG.find((c) => c.type === type)
  return { w: m?.w ?? 1.6, h: m?.h ?? 1.2 }
}

function overlaps(
  a0: number,
  a1: number,
  b0: number,
  b1: number,
) {
  return a0 < b1 && a1 > b0
}

type ClampResult = { along: number; y: number; w: number; h: number }

/** Keep unit fully inside facade / gate; front windows never cover the gate leaf */
export function clampGlazing(
  unit: Pick<GlazingUnit, 'wall' | 'along' | 'y' | 'w' | 'h'>,
  dims: ClampDims | number,
  widthArg?: number,
  wallHeightArg?: number,
): ClampResult {
  const dimsObj: ClampDims =
    typeof dims === 'number'
      ? {
          length: dims,
          width: widthArg ?? 15,
          wallHeight: wallHeightArg ?? 6,
          gateWidth: 4,
          gateHeight: 4.5,
          showGate: true,
        }
      : dims

  const margin = 0.2
  let w = unit.w
  let h = unit.h

  if (unit.wall === 'gate') {
    const half = dimsObj.gateWidth / 2
    const maxAlong = Math.max(0, half - w / 2 - margin)
    const minY = h / 2 + margin
    const maxY = Math.max(minY, dimsObj.gateHeight - h / 2 - margin)
    return {
      along: Math.min(maxAlong, Math.max(-maxAlong, unit.along)),
      y: Math.min(maxY, Math.max(minY, unit.y)),
      w,
      h,
    }
  }

  const halfAlong =
    unit.wall === 'left' || unit.wall === 'right' ? dimsObj.length / 2 : dimsObj.width / 2

  const fit = (ww: number, hh: number, alongIn: number, yIn: number) => {
    const maxA = Math.max(0, halfAlong - ww / 2 - margin)
    const minY = hh / 2 + margin
    const maxY = Math.max(minY, dimsObj.wallHeight - hh / 2 - margin)
    return {
      along: Math.min(maxA, Math.max(-maxA, alongIn)),
      y: Math.min(maxY, Math.max(minY, yIn)),
      maxA,
      minY,
      maxY,
    }
  }

  let { along, y, maxA } = fit(w, h, unit.along, unit.y)

  // Front facade: never intersect the gate leaf (under / through the gate)
  if (unit.wall === 'front' && dimsObj.showGate !== false) {
    const gap = 0.25
    const gx0 = -dimsObj.gateWidth / 2 - gap
    const gx1 = dimsObj.gateWidth / 2 + gap
    const gy1 = dimsObj.gateHeight + gap
    // Max width fully on one side: right edge ≤ gx0 (or left ≥ gx1)
    const maxSideW = Math.max(0.6, halfAlong - margin + gx0 - 0.02)

    const xHitsGate = (ww: number, a: number) =>
      overlaps(a - ww / 2, a + ww / 2, gx0, gx1)

    const hitsGate = (ww: number, hh: number, a: number, yy: number) =>
      xHitsGate(ww, a) && overlaps(yy - hh / 2, yy + hh / 2, 0, gy1)

    const parkBeside = (ww: number, preferLeft: boolean) => {
      const leftTarget = gx0 - ww / 2
      const rightTarget = gx1 + ww / 2
      const fitted = fit(ww, h, preferLeft ? leftTarget : rightTarget, y)
      const tryLeft = fit(ww, h, leftTarget, y)
      const tryRight = fit(ww, h, rightTarget, y)
      const leftOk = !xHitsGate(ww, tryLeft.along)
      const rightOk = !xHitsGate(ww, tryRight.along)
      if (preferLeft && leftOk) return tryLeft
      if (!preferLeft && rightOk) return tryRight
      if (leftOk) return tryLeft
      if (rightOk) return tryRight
      return fitted
    }

    if (hitsGate(w, h, along, y)) {
      const preferLeft = along <= 0

      // 1) Move fully beside (keep size)
      ;({ along, y, maxA } = parkBeside(w, preferLeft))

      // 2) Too wide for the side strip → shrink width, stay beside
      if (xHitsGate(w, along)) {
        w = Math.min(w, maxSideW)
        ;({ along, y, maxA } = parkBeside(w, preferLeft))
      }

      // 3) Only if still in the gate column → lift above (may shrink height)
      if (xHitsGate(w, along) && hitsGate(w, h, along, y)) {
        const maxHAbove = Math.max(0.5, dimsObj.wallHeight - margin - gy1)
        if (h > maxHAbove) h = maxHAbove
        ;({ along, y } = fit(w, h, along, gy1 + h / 2))
      }
    }
  }

  return { along, y, w, h }
}

function hallDims(state: {
  length: number
  width: number
  wallHeight: number
  gateWidth: number
  gateHeight: number
  showGate: boolean
}): ClampDims {
  return {
    length: state.length,
    width: state.width,
    wallHeight: state.wallHeight,
    gateWidth: Math.min(state.gateWidth, state.width - 1),
    gateHeight: Math.min(state.gateHeight, state.wallHeight - 0.3),
    showGate: state.showGate,
  }
}

const defaults: HallConfig = {
  length: 30,
  width: 15,
  wallHeight: 6,
  roofPitch: 15,
  wallColor: '#D7D7D7',
  roofColor: '#383E42',
  frameColor: '#6B7280',
  showFrame: true,
  showGate: true,
  gateWidth: 4,
  gateHeight: 4.5,
  roofType: 'gable',
  showSkylight: true,
  selectedGlazingId: null,
  glazing: [],
}

function seedGlazing(): GlazingUnit[] {
  const dims: ClampDims = {
    length: 30,
    width: 15,
    wallHeight: 6,
    gateWidth: 4,
    gateHeight: 4.5,
    showGate: true,
  }
  const mk = (
    wall: WallId,
    along: number,
    y: number,
    type: GlazingType,
    size?: { w: number; h: number },
  ): GlazingUnit => {
    const base = size ?? defaultSize(type)
    const c = clampGlazing({ wall, along, y, ...base }, dims)
    return { id: uid(), wall, type, ...base, ...c }
  }
  return [
    mk('right', -8, 3.2, 'window'),
    mk('right', -2, 1.8, 'window'),
    mk('right', 4, 4.2, 'window'),
    mk('right', 9, 3.0, 'ribbon'),
    // Front: keep clear of gate (±2 m + gap) — place to the left of gate
    mk('front', -5.5, 3.2, 'office', { w: 3.2, h: 3.8 }),
    mk('gate', 0, 2.8, 'window', { w: 1.2, h: 0.9 }),
  ]
}

defaults.glazing = seedGlazing()

const GATE_RELATED: (keyof HallConfig)[] = [
  'length',
  'width',
  'wallHeight',
  'gateWidth',
  'gateHeight',
  'showGate',
]

export const useConfigStore = create<ConfigStore>((set, get) => ({
  ...defaults,
  set: (key, value) => {
    set({ [key]: value })
    if (!GATE_RELATED.includes(key)) return
    const state = get()
    const dims = hallDims(state)
    set({
      glazing: state.glazing.map((g) => ({ ...g, ...clampGlazing(g, dims) })),
    })
  },
  addGlazing: (partial = {}) => {
    const type = partial.type ?? 'window'
    const { w, h } = defaultSize(type)
    const wall = partial.wall ?? 'right'
    const state = get()
    const sizeW = partial.w ?? (wall === 'gate' ? Math.min(w, 1.4) : w)
    const sizeH = partial.h ?? (wall === 'gate' ? Math.min(h, 1.0) : h)
    // Front: spawn beside the gate, never on the leaf
    const along =
      partial.along ??
      (wall === 'front' && state.showGate
        ? -(state.gateWidth / 2 + sizeW / 2 + 0.4)
        : 0)
    const y0 =
      partial.y ??
      (wall === 'gate' ? Math.min(state.gateHeight * 0.65, state.gateHeight - 0.5) : state.wallHeight * 0.5)
    const clamped = clampGlazing(
      { wall, along, y: y0, w: sizeW, h: sizeH },
      hallDims(state),
    )
    const id = uid()
    const unit: GlazingUnit = {
      id,
      wall,
      type,
      ...clamped,
    }
    set({ glazing: [...state.glazing, unit], selectedGlazingId: id })
    return id
  },
  updateGlazing: (id, patch) => {
    const state = get()
    set({
      glazing: state.glazing.map((g) => {
        if (g.id !== id) return g
        return { ...g, ...patch, ...clampGlazing({ ...g, ...patch }, hallDims(state)) }
      }),
    })
  },
  removeGlazing: (id) => {
    const state = get()
    set({
      glazing: state.glazing.filter((g) => g.id !== id),
      selectedGlazingId: state.selectedGlazingId === id ? null : state.selectedGlazingId,
    })
  },
  clearGlazing: () => set({ glazing: [], selectedGlazingId: null }),
  selectGlazing: (id) => set({ selectedGlazingId: id }),
  reset: () =>
    set({
      ...defaults,
      glazing: seedGlazing(),
      selectedGlazingId: null,
    }),
}))
