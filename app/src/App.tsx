import Map, { Marker, type MapRef } from 'react-map-gl/maplibre';
import { useEffect, useRef, useState } from 'react';
import { useStations } from './features/stations/useStations';
import { BikeMarker } from './features/BikeMarker/BikeMarker';
import 'maplibre-gl/dist/maplibre-gl.css';
import './App.css';


function App() {
  const mapRef = useRef<MapRef | null>(null);
  const [openStationKey, setOpenStationKey] = useState<string | null>(null);
  const { data: stations } = useStations();

  useEffect(() => {
    if (!openStationKey) return;

    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('.bike-marker')) {
        setOpenStationKey(null);
      }
    };

    document.addEventListener('pointerdown', closeMenuOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeMenuOnOutsideClick);
  }, [openStationKey]);

  const handleStationClick = (station: { lon: number; lat: number }, key: string) => {
    setOpenStationKey((currentKey) => currentKey === key ? null : key);
    mapRef.current?.flyTo({
      center: [station.lon, station.lat],
      zoom: 14,
      duration: 1200,
      easing: (progress) => progress * ( 2 * progress),
    });
  };

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
            ref={mapRef}
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
              style={{ zIndex: openStationKey === `${station.lon},${station.lat}` ? 1000 : undefined }}
            >
              <BikeMarker
                name={station.name}
                lat={station.lat}
                lon={station.lon}
                isOpen={openStationKey === `${station.lon},${station.lat}`}
                onToggle={() => handleStationClick(station, `${station.lon},${station.lat}`)}
                onClose={() => setOpenStationKey(null)}
              />
            </Marker>
          ))}
          </Map>
        </div>
      </main>
    </div>
  );
}

export default App