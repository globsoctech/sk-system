import { Scene } from './components/Scene'
import { ConfigPanel } from './components/ConfigPanel'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <a href="https://sksystem.eu/" target="_blank" rel="noreferrer" className="topbar-brand">
          <img src="/logo.png" alt="SK SYSTEM" />
        </a>
        <div className="topbar-meta">
          <span className="badge">Demo 3D</span>
          <span className="hint">Obracaj · zoom · przeciągnij okno po ścianie</span>
        </div>
        <a className="topbar-cta" href="https://sksystem.eu/" target="_blank" rel="noreferrer">
          sksystem.eu
        </a>
      </header>

      <main className="workspace">
        <ConfigPanel />
        <div className="viewport">
          <Scene />
          <div className="viewport-overlay">
            <p>Hala stalowa · podgląd interaktywny</p>
          </div>
        </div>
      </main>
    </div>
  )
}
