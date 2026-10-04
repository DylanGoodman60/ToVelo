import Map, { Layer, Marker, Source, type MapRef } from 'react-map-gl/maplibre';
import { useRef, useState } from 'react';
import { BikeMarker } from '../BikeMarker/BikeMarker';
import { RouteStatsPanel } from './RouteStatsPanel';
import { StationSelectionPanel } from './StationSelectionPanel';
import { useRouteTripStats } from './useRouteTripStats';
import { useStations } from './useStations';
import type { Station } from './useStations';
import { setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// maplibre 6 loads its worker from separate files that Vite doesn't emit on its own (see
// maplibreWorkerFiles in vite.config.ts), so in prod the request falls through to index.html.
// In dev the worker already sits next to maplibre in node_modules, so the default works.
if (import.meta.env.PROD) {
  setWorkerUrl(`${import.meta.env.BASE_URL}maplibre/maplibre-gl-worker.mjs`);
}

export function StationMap() {
  const mapRef = useRef<MapRef | null>(null);
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<{ start: Station; end: Station } | null>(null);
  const routeStats = useRouteTripStats(
    selectedRoute?.start.station_id,
    selectedRoute?.end.station_id,
  );
  const { data: stations } = useStations();

  const handleStationSelect = (station: Station) => {
    if (selectedRoute?.start.station_id === station.station_id) {
      setStartStation(selectedRoute.end);
      setSelectedRoute(null);
      return;
    }

    if (selectedRoute?.end.station_id === station.station_id) {
      setSelectedRoute(null);
      return;
    }

    if (startStation?.station_id === station.station_id) {
      setStartStation(null);
      return;
    }

    if (!startStation) {
      setStartStation(station);
      return;
    }

    setSelectedRoute({ start: startStation, end: station });
  };

  const handleRemoveStation = (stationId: number) => {
    if (selectedRoute?.end.station_id === stationId) {
      setSelectedRoute(null);
      return;
    }

    if (selectedRoute?.start.station_id === stationId) {
      setStartStation(selectedRoute.end);
      setSelectedRoute(null);
      return;
    }

    if (startStation?.station_id === stationId) {
      setStartStation(null);
    }
  };

  const handleSwapStations = () => {
    if (!selectedRoute) return;

    setStartStation(selectedRoute.end);
    setSelectedRoute({ start: selectedRoute.end, end: selectedRoute.start });
  };

  const handleStationClick = (station: Station) => {
    handleStationSelect(station);
    mapRef.current?.flyTo({
      center: [station.lon, station.lat],
      zoom: 14,
      duration: 600,
      easing: (progress) => progress * (2 - progress),
    });
  };

  const closeRouteStats = () => {
    setSelectedRoute(null);
  };

  return (
    <>
      <div className="station-selection-stack">
        <StationSelectionPanel
          startStation={startStation}
          endStation={selectedRoute?.end ?? null}
          onRemoveStation={handleRemoveStation}
          onSwap={handleSwapStations}
        />
        {selectedRoute && (
          <RouteStatsPanel
            startStationName={selectedRoute.start.name}
            endStationName={selectedRoute.end.name}
            stats={routeStats.data}
            isLoading={routeStats.isLoading}
            errorMessage={routeStats.error instanceof Error ? routeStats.error.message : routeStats.error ? 'Unable to load route statistics.' : null}
            onClose={closeRouteStats}
          />
        )}
      </div>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -79.347015,
          latitude: 43.651070,
          zoom: 10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.openfreemap.org/styles/bright"
      >
        {selectedRoute && (
          <Source
            id="selected-station-route"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [selectedRoute.start.lon, selectedRoute.start.lat],
                  [selectedRoute.end.lon, selectedRoute.end.lat],
                ],
              },
            }}
          >
            <Layer
              id="selected-station-route-line"
              type="line"
              layout={{
                'line-cap': 'round',
                'line-join': 'round',
              }}
              paint={{
                'line-color': '#167d5a',
                'line-width': 2,
                'line-opacity': 0.65,
                'line-dasharray': [2, 1.5],
              }}
            />
          </Source>
        )}
        {stations?.map((station) => {
          const isSelected = startStation?.station_id === station.station_id
            || selectedRoute?.end.station_id === station.station_id;

          return (
            <Marker
              key={station.station_id}
              longitude={station.lon}
              latitude={station.lat}
            >
              <BikeMarker
                name={station.name}
                startTripCount={station.start_trip_count}
                endTripCount={station.end_trip_count}
                peakStartDay={station.peak_start_day}
                peakStartHour={station.peak_start_hour}
                isSelected={isSelected}
                onSelect={() => handleStationClick(station)}
              />
            </Marker>
          );
        })}
      </Map>

    </>
  );
}
