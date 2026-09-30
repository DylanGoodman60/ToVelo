import Map, { Marker } from 'react-map-gl/maplibre';
import { Bike } from 'lucide-react';
import { useStations } from './features/stations/useStations';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';


function App() {

  const { data: stations } = useStations();

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
          <Map
            initialViewState={{
              longitude: -79.347015,
              latitude: 43.651070,
              zoom: 10
            }}
            style={{ width: '100%', height: '100%' }}
            mapStyle="https://tiles.openfreemap.org/styles/liberty"
          >
          {/* <Marker longitude={-79.347015} latitude={43.651070} color="red" /> */}
          {stations?.map((station) => (
            <Marker
              key={`${station.lon},${station.lat}`}
              longitude={station.lon}
              latitude={station.lat}
            >
              <Bike size={16} color="#167d5a" aria-label="Bike hub" />
            </Marker>
          ))}
          </Map>
        </div>
      </main>
    </div>
  );
}

export default App