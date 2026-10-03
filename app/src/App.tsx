import { StationMap } from '@/features/stations/StationMap'
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>ToVelo</span>
        </div>
        <div className="topbar-location">
          <span className="location-dot" aria-hidden="true" />
          <span>TORONTO, ON</span>
        </div>
        <div className="topbar-menu-space" aria-hidden="true" />
      </header>
      <main className="map-stage" aria-label="Toronto map">
        <div className="map-frame">
          <StationMap />
        </div>
      </main>
    </div>
  );
}

export default App