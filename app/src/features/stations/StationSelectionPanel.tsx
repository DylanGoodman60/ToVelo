import { ArrowUpDown, X } from 'lucide-react';
import type { Station } from './useStations';
import './StationSelectionPanel.css';

type StationSelectionPanelProps = {
  startStation: Station | null;
  endStation: Station | null;
  onRemoveStation: (stationId: number) => void;
  onSwap: () => void;
};

export function StationSelectionPanel({
  startStation,
  endStation,
  onRemoveStation,
  onSwap,
}: StationSelectionPanelProps) {
  const selectedCount = Number(startStation !== null) + Number(endStation !== null);

  return (
    <section className="station-selection-panel" aria-label="Selected stations">
      <header className="station-selection-panel__header">
        <h2>Selected stations</h2>
        <span>{selectedCount}/2</span>
      </header>

      <div className="station-selection-panel__list">
        <div className="station-selection-panel__row">
          <div className="station-selection-panel__station">
            <span>Start</span>
            {startStation ? <strong title={startStation.name}>{startStation.name}</strong> : <span className="station-selection-panel__empty">Choose a station</span>}
          </div>
          {startStation && (
            <button
              className="station-selection-panel__icon-button"
              type="button"
              aria-label={`Remove start station ${startStation.name}`}
              title="Remove start station"
              onClick={() => onRemoveStation(startStation.station_id)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="station-selection-panel__row">
          <div className="station-selection-panel__station">
            <span>Destination</span>
            {endStation ? <strong title={endStation.name}>{endStation.name}</strong> : <span className="station-selection-panel__empty">Choose a station</span>}
          </div>
          {endStation && (
            <button
              className="station-selection-panel__icon-button"
              type="button"
              aria-label={`Remove destination station ${endStation.name}`}
              title="Remove destination station"
              onClick={() => onRemoveStation(endStation.station_id)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <button
        className="station-selection-panel__swap"
        type="button"
        disabled={!startStation || !endStation}
        onClick={onSwap}
      >
        <ArrowUpDown size={16} aria-hidden="true" />
        Swap direction
      </button>
    </section>
  );
}
