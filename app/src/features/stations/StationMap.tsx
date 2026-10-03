import Map, { Marker, type MapRef } from 'react-map-gl/maplibre';
import { useEffect, useRef, useState } from 'react';
import { BikeMarker } from '../BikeMarker/BikeMarker';
import { RouteStatsDialog } from './RouteStatsDialog';
import { useRouteTripStats } from './useRouteTripStats';
import { useStations } from './useStations';
import type { Station } from './useStations';
import 'maplibre-gl/dist/maplibre-gl.css';

export function StationMap() {
  const mapRef = useRef<MapRef | null>(null);
  const [openStationId, setOpenStationId] = useState<number | null>(null);
  const [startStation, setStartStation] = useState<Station | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<{ start: Station; end: Station } | null>(null);
  const routeStats = useRouteTripStats(
    selectedRoute?.start.station_id,
    selectedRoute?.end.station_id,
  );
  const { data: stations } = useStations();

  useEffect(() => {
    if (openStationId === null) return;

    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('.bike-marker')) {
        setOpenStationId(null);
      }
    };

    document.addEventListener('pointerdown', closeMenuOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeMenuOnOutsideClick);
  }, [openStationId]);

  const handleStationClick = (station: Station) => {
    setOpenStationId((currentId) => currentId === station.station_id ? null : station.station_id);
    mapRef.current?.flyTo({
      center: [station.lon, station.lat],
      zoom: 14,
      duration: 600,
      easing: (progress) => progress * (2 - progress),
    });
  };

  const handleStationSelect = (station: Station) => {
    setOpenStationId(null);

    if (!startStation || station.station_id === startStation.station_id) {
      setStartStation(startStation ? null : station);
      return;
    }

    setSelectedRoute({ start: startStation, end: station });
  };

  const closeRouteStats = () => {
    setSelectedRoute(null);
  };

  return (
    <>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -79.347015,
          latitude: 43.651070,
          zoom: 10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
      >
        {stations?.map((station) => {
          const isOpen = openStationId === station.station_id;
          const isSelected = startStation?.station_id === station.station_id;

          return (
            <Marker
              key={station.station_id}
              longitude={station.lon}
              latitude={station.lat}
              style={{ zIndex: isOpen ? 1000 : undefined }}
            >
              <BikeMarker
                name={station.name}
                lat={station.lat}
                lon={station.lon}
                isOpen={isOpen}
                isSelected={isSelected}
                selectionLabel={isSelected ? 'Clear start' : startStation ? 'Select as destination' : 'Select as start'}
                selectionDisabled={routeStats.isFetching}
                onToggle={() => handleStationClick(station)}
                onSelect={() => handleStationSelect(station)}
              />
            </Marker>
          );
        })}
      </Map>

      {selectedRoute && (
        <RouteStatsDialog
          startStationName={selectedRoute.start.name}
          endStationName={selectedRoute.end.name}
          stats={routeStats.data}
          isLoading={routeStats.isLoading}
          errorMessage={routeStats.error instanceof Error ? routeStats.error.message : routeStats.error ? 'Unable to load route statistics.' : null}
          onClose={closeRouteStats}
        />
      )}
    </>
  );
}
