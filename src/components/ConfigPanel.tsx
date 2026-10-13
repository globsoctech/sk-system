import { useEffect, useState } from 'react'
import {
  useConfigStore,
  WALL_COLORS,
  ROOF_COLORS,
  type HallConfig,
} from '../store/configStore'
import { roofRise } from './Hall/geometry'
import { GlazingPanel } from './GlazingPanel'

function clampNum(v: number, min: number, max: number, step: number) {
  if (Number.isNaN(v)) return min
  const snapped = step > 0 ? Math.round(v / step) * step : v
  return Math.min(max, Math.max(min, snapped))
}

/** Slider + editable number — type dimensions by hand */
function DimField({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  const decimals = step < 1 ? 1 : 0
  const [text, setText] = useState(value.toFixed(decimals))

  useEffect(() => {
    setText(value.toFixed(decimals))
  }, [value, decimals])

  const commit = () => {
    const raw = text.replace(',', '.')
    const n = clampNum(Number(raw), min, max, step)
    setText(n.toFixed(decimals))
    onChange(n)
  }

  return (
    <label className="field">
      <div className="field-head">
        <span>{label}</span>
        <span className="dim-input-wrap">
          <input
            className="dim-input"
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur()
              }
            }}
            aria-label={`${label} (${unit})`}
          />
          <span className="dim-unit">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function ColorSwatches({
  colors,
  value,
  onChange,
}: {
  colors: { name: string; hex: string }[]
  value: string
  onChange: (hex: string) => void
}) {
  return (
    <div className="swatches">
      {colors.map((c) => (
        <button
          key={c.hex}
          type="button"
          title={c.name}
          className={`swatch ${value === c.hex ? 'active' : ''}`}
          style={{ background: c.hex }}
          onClick={() => onChange(c.hex)}
          aria-label={c.name}
        />
      ))}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-ui" />
    </label>
  )
}

export function ConfigPanel() {
  const store = useConfigStore()
  const set = store.set
  const area = store.length * store.width
  const rise = roofRise(store)
  const highWall = store.wallHeight + rise

  return (
    <aside className="panel">
      <div className="panel-brand">
        <img src="/logo.png" alt="SK SYSTEM" className="panel-logo" />
        <div>
          <h1>Konfigurator hal</h1>
          <p>Prototyp 3D · Steel Constructions</p>
        </div>
      </div>

      <section className="panel-section">
        <h2>Wymiary</h2>
        <p className="hint-block">Suwak albo wpisz wartość z klawiatury i zatwierdź Enter / blur.</p>
        <DimField
          label="Długość"
          value={store.length}
          min={10}
          max={80}
          step={1}
          unit="m"
          onChange={(v) => set('length', v)}
        />
        <DimField
          label="Szerokość"
          value={store.width}
          min={6}
          max={40}
          step={1}
          unit="m"
          onChange={(v) => set('width', v)}
        />
        <DimField
          label="Wysokość ścian (okap)"
          value={store.wallHeight}
          min={3}
          max={12}
          step={0.5}
          unit="m"
          onChange={(v) => set('wallHeight', v)}
        />
        <DimField
          label="Kąt dachu"
          value={store.roofPitch}
          min={5}
          max={25}
          step={1}
          unit="°"
          onChange={(v) => set('roofPitch', v)}
        />
        {store.roofType === 'monopitch' && (
          <p className="hint-block">
            Ściana wysoka: <strong>{highWall.toFixed(1)} m</strong> (okap {store.wallHeight} m +
            wznios {rise.toFixed(1)} m)
          </p>
        )}
      </section>

      <section className="panel-section">
        <h2>Dach</h2>
        <div className="segmented">
          <button
            type="button"
            className={store.roofType === 'gable' ? 'active' : ''}
            onClick={() => set('roofType', 'gable')}
          >
            Dwuspadowy
          </button>
          <button
            type="button"
            className={store.roofType === 'monopitch' ? 'active' : ''}
            onClick={() => set('roofType', 'monopitch')}
          >
            Jednospadowy
          </button>
        </div>
      </section>

      <section className="panel-section">
        <h2>Kolor ścian (płyta warstwowa)</h2>
        <ColorSwatches
          colors={WALL_COLORS}
          value={store.wallColor}
          onChange={(hex) => set('wallColor', hex)}
        />
        <h2>Kolor dachu</h2>
        <ColorSwatches
          colors={ROOF_COLORS}
          value={store.roofColor}
          onChange={(hex) => set('roofColor', hex)}
        />
      </section>

      <section className="panel-section">
        <h2>Elementy</h2>
        <Toggle
          label="Konstrukcja stalowa"
          checked={store.showFrame}
          onChange={(v) => set('showFrame', v)}
        />
        <Toggle
          label="Brama wjazdowa"
          checked={store.showGate}
          onChange={(v) => set('showGate', v)}
        />
        {store.showGate && (
          <>
            <DimField
              label="Szerokość bramy"
              value={store.gateWidth}
              min={2}
              max={Math.min(12, store.width - 1)}
              step={0.1}
              unit="m"
              onChange={(v) => set('gateWidth', v)}
            />
            <DimField
              label="Wysokość bramy"
              value={store.gateHeight}
              min={2}
              max={Math.min(8, store.wallHeight - 0.3)}
              step={0.1}
              unit="m"
              onChange={(v) => set('gateHeight', v)}
            />
          </>
        )}
      </section>

      <GlazingPanel />

      <section className="panel-section summary">
        <h2>Podsumowanie</h2>
        <dl>
          <div>
            <dt>Powierzchnia</dt>
            <dd>{area.toFixed(0)} m²</dd>
          </div>
          <div>
            <dt>Oszklenie</dt>
            <dd>{store.glazing.length} szt.</dd>
          </div>
          <div>
            <dt>Wymiary</dt>
            <dd>
              {store.length} × {store.width} × {store.wallHeight} m
            </dd>
          </div>
        </dl>
        <button type="button" className="btn-primary" onClick={() => store.reset()}>
          Resetuj konfigurację
        </button>
        <a
          className="btn-outline"
          href="https://sksystem.eu/"
          target="_blank"
          rel="noreferrer"
        >
          Wyceń projekt na sksystem.eu
        </a>
      </section>
    </aside>
  )
}

export type { HallConfig }
