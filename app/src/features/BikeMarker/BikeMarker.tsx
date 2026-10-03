
import { Bike } from "lucide-react";
import "./BikeMarker.css";

type BikeMarkerProps = {
    name: string;
    lat: number;
    lon: number;
    isOpen: boolean;
    isSelected: boolean;
    selectionLabel: string;
    selectionDisabled: boolean;
    onToggle: () => void;
    onSelect: () => void;
};

export const BikeMarker = ({
    name,
    lat,
    lon,
    isOpen,
    isSelected,
    selectionLabel,
    selectionDisabled,
    onToggle,
    onSelect,
}: BikeMarkerProps) => {
    return (
        <div
            className={`bike-marker${isOpen ? " bike-marker--open" : ""}${isSelected ? " bike-marker--selected" : ""}`}
            onClick={(event) => event.stopPropagation()}
        >
            <button
                className="bike-marker__button"
                type="button"
                aria-label={`${isOpen ? "Close" : "Open"} ${name} station menu`}
                aria-expanded={isOpen}
                onClick={onToggle}
            >
                <Bike size={24} color={isSelected ? "#ffffff" : "#167d5a"} aria-hidden="true" />
            </button>

            <div className="bike-marker__menu">
                {isOpen ? (
                    <>
                        <strong>{name}</strong>
                        <span>{lat.toFixed(5)}, {lon.toFixed(5)}</span>
                        <button
                            className="bike-marker__close"
                            type="button"
                            disabled={selectionDisabled}
                            onClick={onSelect}
                        >
                            {selectionLabel}
                        </button>
                    </>
                ) : (
                    <strong>{name}</strong>
                )}
            </div>
        </div>
    );
};