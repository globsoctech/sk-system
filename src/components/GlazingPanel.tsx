import { useState } from 'react'
import {
  useConfigStore,
  GLAZING_CATALOG,
  WALL_LABELS,
  type WallId,
  type GlazingType,
} from '../store/configStore'

export function GlazingPanel() {
  const glazing = useConfigStore((s) => s.glazing)
  const selectedId = useConfigStore((s) => s.selectedGlazingId)
  const showSkylight = useConfigStore((s) => s.showSkylight)
  const addGlazing = useConfigStore((s) => s.addGlazing)
  const removeGlazing = useConfigStore((s) => s.removeGlazing)
  const clearGlazing = useConfigStore((s) => s.clearGlazing)
  const selectGlazing = useConfigStore((s) => s.selectGlazing)
  const updateGlazing = useConfigStore((s) => s.updateGlazing)
  const set = useConfigStore((s) => s.set)
  const wallHeight = useConfigStore((s) => s.wallHeight)
  const showGate = useConfigStore((s) => s.showGate)
  const gateHeight = useConfigStore((s) => s.gateHeight)

  const [wall, setWall] = useState<WallId>('right')
  const [type, setType] = useState<GlazingType>('window')

  const facadeOptions = (Object.keys(WALL_LABELS) as WallId[]).filter(
    (w) => w !== 'gate' || showGate,
  )

  const selected = glazing.find((g) => g.id === selectedId)

  return (
    <section className="panel-section">
      <h2>Oszklenie</h2>
      <p className="hint-block">
        Dodaj moduł, potem <strong>kliknij i przeciągnij</strong>. Okna na froncie nie nachodzą
        na bramę — osobne wizjery dodaj na fasadzie „Brama”.
      </p>

      <label className="field">
        <div className="field-head">
          <span>Fasada startowa</span>
        </div>
        <select
          className="select"
          value={wall}
          onChange={(e) => setWall(e.target.value as WallId)}
        >
          {facadeOptions.map((w) => (
            <option key={w} value={w}>
              {WALL_LABELS[w]}
            </option>
          ))}
        </select>
      </label>

      <div className="field-head" style={{ marginBottom: '0.35rem' }}>
        <span>Moduł</span>
      </div>
      <div className="module-grid">
        {GLAZING_CATALOG.map((m) => (
          <button
            key={m.type}
            type="button"
            className={`module-card ${type === m.type ? 'active' : ''}`}
            onClick={() => setType(m.type)}
          >
            <strong>{m.name}</strong>
            <span>{m.desc}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn-primary"
        style={{ marginTop: '0.75rem' }}
        onClick={() =>
          addGlazing({
            wall,
            type: wall === 'gate' ? 'window' : type,
            along: 0,
            y:
              wall === 'gate'
                ? gateHeight * 0.65
                : type === 'glass-door'
                  ? 1.3
                  : wallHeight * 0.5,
          })
        }
      >
        {wall === 'gate' ? 'Dodaj okno na bramę' : 'Dodaj na ścianę — potem przeciągnij'}
      </button>

      <label className="toggle" style={{ marginTop: '0.85rem' }}>
        <span>Świetlik kalenicowy</span>
        <input
          type="checkbox"
          checked={showSkylight}
          onChange={(e) => set('showSkylight', e.target.checked)}
        />
        <span className="toggle-ui" />
      </label>

      {selected && (
        <div className="selected-box">
          <div className="field-head">
            <span>Zaznaczone</span>
            <button type="button" className="link-btn" onClick={() => removeGlazing(selected.id)}>
              Usuń
            </button>
          </div>
          <p className="hint-block" style={{ marginTop: 0 }}>
            {WALL_LABELS[selected.wall]}
          </p>
          <label className="field">
            <div className="field-head">
              <span>Szerokość</span>
              <span className="dim-input-wrap">
                <input
                  className="dim-input"
                  type="number"
                  inputMode="decimal"
                  min={0.8}
                  max={8}
                  step={0.1}
                  value={selected.w}
                  onChange={(e) =>
                    updateGlazing(selected.id, { w: Number(e.target.value) || selected.w })
                  }
                />
                <span className="dim-unit">m</span>
              </span>
            </div>
            <input
              type="range"
              min={0.8}
              max={8}
              step={0.1}
              value={selected.w}
              onChange={(e) => updateGlazing(selected.id, { w: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <div className="field-head">
              <span>Wysokość</span>
              <span className="dim-input-wrap">
                <input
                  className="dim-input"
                  type="number"
                  inputMode="decimal"
                  min={0.6}
                  max={
                    selected.wall === 'gate'
                      ? Math.max(0.8, gateHeight - 0.4)
                      : Math.min(wallHeight - 0.4, 8)
                  }
                  step={0.1}
                  value={selected.h}
                  onChange={(e) =>
                    updateGlazing(selected.id, { h: Number(e.target.value) || selected.h })
                  }
                />
                <span className="dim-unit">m</span>
              </span>
            </div>
            <input
              type="range"
              min={0.6}
              max={
                selected.wall === 'gate'
                  ? Math.max(0.8, gateHeight - 0.4)
                  : Math.min(wallHeight - 0.4, 8)
              }
              step={0.1}
              value={selected.h}
              onChange={(e) => updateGlazing(selected.id, { h: Number(e.target.value) })}
            />
          </label>
          <label className="field">
            <div className="field-head">
              <span>Przenieś na fasadę</span>
            </div>
            <select
              className="select"
              value={selected.wall}
              onChange={(e) =>
                updateGlazing(selected.id, { wall: e.target.value as WallId, along: 0 })
              }
            >
              {facadeOptions.map((w) => (
                <option key={w} value={w}>
                  {WALL_LABELS[w]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {glazing.length > 0 && (
        <>
          <div className="field-head" style={{ marginTop: '0.75rem' }}>
            <span>Lista ({glazing.length})</span>
            <button type="button" className="link-btn" onClick={clearGlazing}>
              Wyczyść
            </button>
          </div>
          <ul className="glazing-list">
            {glazing.map((g) => {
              const mod = GLAZING_CATALOG.find((c) => c.type === g.type)
              return (
                <li key={g.id} className={selectedId === g.id ? 'is-selected' : ''}>
                  <button
                    type="button"
                    className="link-btn list-pick"
                    onClick={() => selectGlazing(g.id)}
                  >
                    {WALL_LABELS[g.wall]} · {mod?.name}
                  </button>
                  <button type="button" className="link-btn" onClick={() => removeGlazing(g.id)}>
                    Usuń
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
