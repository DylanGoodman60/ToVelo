
import { Bike } from "lucide-react";
import "./BikeMarker.css";

type BikeMarkerProps = {
    name: string;
    lat: number;
    lon: number;
    isOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
};

export const BikeMarker = ({ name, lat, lon, isOpen, onToggle, onClose }: BikeMarkerProps) => {
    return (
        <div
            className={`bike-marker${isOpen ? " bike-marker--open" : ""}`}
            onClick={(event) => event.stopPropagation()}
        >
            <button
                className="bike-marker__button"
                type="button"
                aria-label={`${isOpen ? "Close" : "Open"} ${name} station menu`}
                aria-expanded={isOpen}
                onClick={onToggle}
            >
                <Bike size={24} color="#167d5a" aria-hidden="true" />
            </button>

            <div className="bike-marker__menu" role="status">
                {isOpen ? (
                    <>
                        <strong>{name}</strong>
                        <span>{lat.toFixed(5)}, {lon.toFixed(5)}</span>
                        <button
                            className="bike-marker__close"
                            type="button"
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </>
                ) : (
                    <strong>{name}</strong>
                )}
            </div>
        </div>
    );
};