import type { GlazingUnit, WallId } from '../../store/configStore'

export type UvRect = { u0: number; u1: number; v0: number; v1: number }

function clipHole(hole: UvRect, rect: UvRect): UvRect | null {
  const u0 = Math.max(hole.u0, rect.u0)
  const u1 = Math.min(hole.u1, rect.u1)
  const v0 = Math.max(hole.v0, rect.v0)
  const v1 = Math.min(hole.v1, rect.v1)
  if (u1 - u0 < 0.05 || v1 - v0 < 0.05) return null
  return { u0, u1, v0, v1 }
}

/** Split rect around one hole → up to 4 panels */
function punchOne(rect: UvRect, hole: UvRect): UvRect[] {
  const h = clipHole(hole, rect)
  if (!h) return [rect]
  const out: UvRect[] = []
  if (h.v1 < rect.v1 - 0.01) out.push({ u0: rect.u0, u1: rect.u1, v0: h.v1, v1: rect.v1 })
  if (h.v0 > rect.v0 + 0.01) out.push({ u0: rect.u0, u1: rect.u1, v0: rect.v0, v1: h.v0 })
  if (h.u0 > rect.u0 + 0.01) out.push({ u0: rect.u0, u1: h.u0, v0: h.v0, v1: h.v1 })
  if (h.u1 < rect.u1 - 0.01) out.push({ u0: h.u1, u1: rect.u1, v0: h.v0, v1: h.v1 })
  return out
}

export function punchHoles(rect: UvRect, holes: UvRect[]): UvRect[] {
  let parts = [rect]
  for (const hole of holes) {
    const next: UvRect[] = []
    for (const p of parts) next.push(...punchOne(p, hole))
    parts = next
  }
  return parts
}

/**
 * Hole matches outer window size (w×h includes frame).
 * Tiny pad only — avoids a second “step” (wall lip) around the frame.
 */
export function glazingToHole(g: GlazingUnit, pad = 0.01): UvRect {
  return {
    u0: g.along - g.w / 2 - pad,
    u1: g.along + g.w / 2 + pad,
    v0: g.y - g.h / 2 - pad,
    v1: g.y + g.h / 2 + pad,
  }
}

export function holesForWall(glazing: GlazingUnit[], wall: WallId): UvRect[] {
  return glazing.filter((g) => g.wall === wall).map((g) => glazingToHole(g))
}
