"use client";

import { useEffect, useMemo, useRef } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface DeliveryPoint {
  latitude: number;
  longitude: number;
}

interface DeliveryMapProps {
  value: DeliveryPoint;
  onChange: (point: DeliveryPoint) => void;
}

type LeafletContainer = HTMLDivElement & { _leaflet_id?: number };

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Leaflet is driven imperatively so the map is recreated whenever the effect
 * runs. Next.js Activity hides a route without unmounting it, which removes
 * the map but does not recreate react-leaflet's MapContainer on show.
 */
export function DeliveryMap({ value, onChange }: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialPointRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    initialPointRef.current = value;
  }, [value]);

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

  useEffect(() => {
    const container = containerRef.current as LeafletContainer | null;
    if (!container) return;

    // A hidden route keeps its DOM; clear any stale binding before mounting again.
    container._leaflet_id = undefined;

    const start = initialPointRef.current;
    const map = L.map(container, {
      center: [start.latitude, start.longitude],
      zoom: 13,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: ATTRIBUTION,
    }).addTo(map);

    const marker = L.marker([start.latitude, start.longitude], {
      icon: pinIcon,
      draggable: true,
      title: "Titik pengiriman",
    }).addTo(map);

    marker.on("dragend", () => {
      const point = marker.getLatLng();
      onChangeRef.current({ latitude: point.lat, longitude: point.lng });
    });

    map.on("click", (event) => {
      onChangeRef.current({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    });

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      observer.disconnect();
      mapRef.current = null;
      markerRef.current = null;
      map.remove();
    };
  }, [pinIcon]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    marker.setLatLng([value.latitude, value.longitude]);
    map.flyTo([value.latitude, value.longitude], map.getZoom(), {
      animate: true,
      duration: 0.4,
    });
  }, [value.latitude, value.longitude]);

  return <div ref={containerRef} className="h-full w-full" />;
}
