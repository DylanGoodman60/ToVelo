import { ArrowRight, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { RouteTripStats } from './useRouteTripStats';
import './RouteStatsDialog.css';

type RouteStatsDialogProps = {
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

export function RouteStatsDialog({
  startStationName,
  endStationName,
  stats,
  isLoading,
  errorMessage,
  onClose,
}: RouteStatsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();

    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="route-stats-dialog"
      aria-labelledby="route-stats-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="route-stats-dialog__content">
        <button
          className="route-stats-dialog__close"
          type="button"
          aria-label="Close route statistics"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>

        <p className="route-stats-dialog__eyebrow">Route statistics</p>
        <h2 id="route-stats-title" className="route-stats-dialog__route">
          <span>{startStationName}</span>
          <ArrowRight size={16} aria-hidden="true" />
          <span>{endStationName}</span>
        </h2>

        {isLoading && <p className="route-stats-dialog__message">Loading trip data...</p>}
        {errorMessage && <p className="route-stats-dialog__error">{errorMessage}</p>}
        {!isLoading && !errorMessage && stats?.completed_trip_count === 0 && (
          <p className="route-stats-dialog__message">No completed trips found for this route.</p>
        )}
        {!isLoading && !errorMessage && stats && stats.completed_trip_count > 0 && (
          <dl className="route-stats-dialog__metrics">
            <div>
              <dt>Completed trips</dt>
              <dd>{stats.completed_trip_count.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Average trip time</dt>
              <dd>{formatDuration(stats.average_duration_seconds)}</dd>
            </div>
            <div>
              <dt>Fastest trip</dt>
              <dd>{formatDuration(stats.fastest_duration_seconds)}</dd>
            </div>
            <div>
              <dt>Fastest 10% cutoff</dt>
              <dd>{formatDuration(stats.tenth_percentile_duration_seconds)}</dd>
            </div>
            <div>
              <dt>Estimated average speed</dt>
              <dd>
                {stats.average_straight_line_speed_kmh == null
                  ? 'Not available'
                  : `${stats.average_straight_line_speed_kmh.toFixed(1)} km/h`}
              </dd>
            </div>
          </dl>
        )}

        <p className="route-stats-dialog__note">
          Speed uses straight-line distance between stations, not actual route distance.
        </p>
      </div>
    </dialog>,
    document.body,
  );
}
