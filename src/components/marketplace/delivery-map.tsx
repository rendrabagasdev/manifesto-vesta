"use client";

import { useEffect, useMemo } from "react";
import * as L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface DeliveryPoint {
  latitude: number;
  longitude: number;
}

interface DeliveryMapProps {
  value: DeliveryPoint;
  onChange: (point: DeliveryPoint) => void;
}

function MapFocus({ point }: { point: DeliveryPoint }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([point.latitude, point.longitude], map.getZoom(), {
      animate: true,
      duration: 0.4,
    });
  }, [map, point.latitude, point.longitude]);

  return null;
}

function MapClickHandler({
  onChange,
}: {
  onChange: (point: DeliveryPoint) => void;
}) {
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });

  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

export function DeliveryMap({ value, onChange }: DeliveryMapProps) {
  const pinIcon = useMemo(
    () =>
      L.divIcon({
        className: "vesta-map-pin",
        html: "<span aria-hidden='true'></span>",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      }),
    [],
  );

  return (
    <MapContainer
      center={[value.latitude, value.longitude]}
      zoom={13}
      scrollWheelZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapFocus point={value} />
      <MapClickHandler onChange={onChange} />
      <MapResizeHandler />
      <Marker
        position={[value.latitude, value.longitude]}
        icon={pinIcon}
        draggable
        title="Titik pengiriman"
        eventHandlers={{
          dragend(event) {
            const marker = event.target as L.Marker;
            const position = marker.getLatLng();
            onChange({
              latitude: position.lat,
              longitude: position.lng,
            });
          },
        }}
      />
    </MapContainer>
  );
}
