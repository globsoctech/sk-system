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

/** Keep unit fully inside facade / gate; front windows never cover the gate leaf */
export function clampGlazing(
  unit: Pick<GlazingUnit, 'wall' | 'along' | 'y' | 'w' | 'h'>,
  dims: ClampDims | number,
  widthArg?: number,
  wallHeightArg?: number,
): { along: number; y: number } {
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
  if (unit.wall === 'gate') {
    const half = dimsObj.gateWidth / 2
    const maxAlong = Math.max(0, half - unit.w / 2 - margin)
    const minY = unit.h / 2 + margin
    const maxY = Math.max(minY, dimsObj.gateHeight - unit.h / 2 - margin)
    return {
      along: Math.min(maxAlong, Math.max(-maxAlong, unit.along)),
      y: Math.min(maxY, Math.max(minY, unit.y)),
    }
  }

  const halfAlong =
    unit.wall === 'left' || unit.wall === 'right' ? dimsObj.length / 2 : dimsObj.width / 2
  const maxAlong = Math.max(0, halfAlong - unit.w / 2 - margin)
  const minY = unit.h / 2 + margin
  const maxY = Math.max(minY, dimsObj.wallHeight - unit.h / 2 - margin)

  let along = Math.min(maxAlong, Math.max(-maxAlong, unit.along))
  let y = Math.min(maxY, Math.max(minY, unit.y))

  // Front facade: keep clear of gate rectangle
  if (unit.wall === 'front' && dimsObj.showGate !== false) {
    const gw = dimsObj.gateWidth
    const gh = dimsObj.gateHeight
    const gap = 0.15
    const gx0 = -gw / 2 - gap
    const gx1 = gw / 2 + gap
    const gy0 = 0
    const gy1 = gh + gap

    const resolve = () => {
      const wx0 = along - unit.w / 2
      const wx1 = along + unit.w / 2
      const wy0 = y - unit.h / 2
      const wy1 = y + unit.h / 2
      if (!overlaps(wx0, wx1, gx0, gx1) || !overlaps(wy0, wy1, gy0, gy1)) return

      // Prefer push left/right; if no room, push above gate
      const leftTarget = gx0 - unit.w / 2
      const rightTarget = gx1 + unit.w / 2
      const canLeft = leftTarget >= -maxAlong
      const canRight = rightTarget <= maxAlong

      if (along <= 0 && canLeft) {
        along = leftTarget
      } else if (canRight) {
        along = rightTarget
      } else if (canLeft) {
        along = leftTarget
      } else {
        y = Math.min(maxY, Math.max(minY, gy1 + unit.h / 2))
      }

      along = Math.min(maxAlong, Math.max(-maxAlong, along))
      y = Math.min(maxY, Math.max(minY, y))
    }

    resolve()
    // Second pass if still overlapping after vertical move
    resolve()
  }

  return { along, y }
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
    mk('front', -4, 3.0, 'office'),
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
      glazing: state.glazing.map((g) => {
        const c = clampGlazing(g, dims)
        return { ...g, ...c }
      }),
    })
  },
  addGlazing: (partial = {}) => {
    const type = partial.type ?? 'window'
    const { w, h } = defaultSize(type)
    const wall = partial.wall ?? 'right'
    const state = get()
    const along = partial.along ?? 0
    const sizeW = partial.w ?? (wall === 'gate' ? Math.min(w, 1.4) : w)
    const sizeH = partial.h ?? (wall === 'gate' ? Math.min(h, 1.0) : h)
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
      w: sizeW,
      h: sizeH,
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
        const next = { ...g, ...patch }
        const c = clampGlazing(next, hallDims(state))
        return { ...next, ...c }
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
