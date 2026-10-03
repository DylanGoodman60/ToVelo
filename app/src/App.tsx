import { StationMap } from '@/features/stations/StationMap'
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-copy">
            <strong>Trip Stats</strong>
            <span>Toronto bike-share station activity | 2024-present</span>
          </span>
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