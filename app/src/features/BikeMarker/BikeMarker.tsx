
import { Bike, X } from "lucide-react";
import "./BikeMarker.css";

type BikeMarkerProps = {
    name: string;
    startTripCount: number;
    endTripCount: number;
    peakStartDay: number | null;
    peakStartHour: number | null;
    isSelected: boolean;
    onSelect: () => void;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatHour(hour: number | null): string {
    if (hour === null) return 'Not available';

    const displayHour = hour % 12 || 12;
    return `${displayHour} ${hour < 12 ? 'AM' : 'PM'}`;
}

export const BikeMarker = ({
    name,
    startTripCount,
    endTripCount,
    peakStartDay,
    peakStartHour,
    isSelected,
    onSelect,
}: BikeMarkerProps) => {
    return (
        <div
            className={`bike-marker${isSelected ? " bike-marker--selected" : ""}`}
            onClick={(event) => event.stopPropagation()}
        >
            <button
                className="bike-marker__button"
                type="button"
                aria-label={`${isSelected ? "Unselect" : "Select"} ${name} station`}
                aria-pressed={isSelected}
                onClick={onSelect}
            >
                <Bike size={24} color={isSelected ? "#ffffff" : "#167d5a"} aria-hidden="true" />
            </button>
            <span className="bike-marker__name">
                <strong>{name}</strong>
                {isSelected ? (
                    <span className="bike-marker__remove-hint">
                        <X size={12} aria-hidden="true" />
                        Click to remove
                    </span>
                ) : (
                    <div className="bike-marker__trip-counts">
                        <span>{startTripCount.toLocaleString()} starts / {endTripCount.toLocaleString()} returns</span>
                        <span>Peak day: {peakStartDay === null ? 'Not available' : WEEKDAYS[peakStartDay]}</span>
                        <span>Peak hour: {formatHour(peakStartHour)}</span>
                    </div>
                )}
            </span>
        </div>
    );
};