import { ArrowRight, X } from 'lucide-react';
import type { RouteTripStats } from './useRouteTripStats';
import './RouteStatsPanel.css';

type RouteStatsPanelProps = {
  startStationName: string;
  endStationName: string;
  stats: RouteTripStats | undefined;
  isLoading: boolean;
  errorMessage: string | null;
  onClose: () => void;
};

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return 'Not available';

  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) return `${hours} hr ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${remainingSeconds} sec`;
  return `${remainingSeconds} sec`;
}

function formatSpeed(kmh: number | null | undefined): string {
  if (kmh == null) return 'Not available';
  return `${kmh.toFixed(1)} km/h`;
}

// start_time is a naive local timestamp ("YYYY-MM-DD HH:MM:SS"), so parse it as local time
function formatTripDate(timestamp: string): string {
  const date = new Date(timestamp.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RouteStatsPanel({
  startStationName,
  endStationName,
  stats,
  isLoading,
  errorMessage,
  onClose,
}: RouteStatsPanelProps) {
  return (
    <aside className="route-stats-panel" aria-labelledby="route-stats-title">
      <div className="route-stats-panel__header">
        <p className="route-stats-panel__eyebrow">Route statistics</p>
        <button
          className="route-stats-panel__close"
          type="button"
          aria-label="Close route statistics"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <h2 id="route-stats-title" className="route-stats-panel__route">
        <span>{startStationName}</span>
        <ArrowRight size={16} aria-hidden="true" />
        <span>{endStationName}</span>
      </h2>

      {isLoading && <p className="route-stats-panel__message">Loading trip data...</p>}
      {errorMessage && <p className="route-stats-panel__error">{errorMessage}</p>}
      {!isLoading && !errorMessage && stats?.completed_trip_count === 0 && (
        <p className="route-stats-panel__message">No completed trips found for this route.</p>
      )}
      {!isLoading && !errorMessage && stats && stats.completed_trip_count > 0 && (
        <>
          <h3 className="route-stats-panel__section-title">Fastest trips</h3>
          <ol className="route-stats-panel__fastest">
            {stats.fastest_trips.map((trip) => (
              <li key={trip.trip_id}>
                <span className="route-stats-panel__fastest-duration">
                  {formatDuration(trip.duration_seconds)}
                </span>
                <span className="route-stats-panel__fastest-detail">
                  {formatSpeed(trip.straight_line_speed_kmh)} · {formatTripDate(trip.start_time)}
                </span>
              </li>
            ))}
          </ol>

          <dl className="route-stats-panel__metrics">
            <div>
              <dt>Completed trips</dt>
              <dd>{stats.completed_trip_count.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Average trip time</dt>
              <dd>{formatDuration(stats.average_duration_seconds)}</dd>
            </div>
            <div>
              <dt>Estimated average speed</dt>
              <dd>{formatSpeed(stats.average_straight_line_speed_kmh)}</dd>
            </div>
          </dl>
        </>
      )}

      <p className="route-stats-panel__note">
        Speed uses straight-line distance between stations, not actual route distance.
      </p>
    </aside>
  );
}
