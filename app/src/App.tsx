import { StationMap } from '@/features/stations/StationMap'
import logo from '@/assets/InBug-Black.png'
import './App.css';

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-copy">
            <strong>Route Stats</strong>
            <span>Toronto bike share station activity (2024-present)</span>
          </span>
        </div>
        <div className='flex items-center gap-2'>
          <a
            className='topbar-link'
            href="https://www.linkedin.com/in/dylan-jr-goodman/"
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn profile"
            title="LinkedIn"
          >
            <img src={logo} alt="LinkedIn Profile" width="36" height="36" />
          </a> 
        </div>
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