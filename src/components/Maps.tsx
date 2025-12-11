"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { Circle } from "react-leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const uiMarker = (color: string) =>
  L.divIcon({
    className: "",
    html: `
      <div class="relative w-10  h-10">
        <div class="absolute inset-0 bg-${color}-400/30 rounded-full animate-ping"></div>
        <div class="absolute inset-2 bg-${color}-500 rounded-full border-2 border-white shadow-lg"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 10],
    popupAnchor: [0, -10],
  });

interface MapsProps {
  height?: string;
  showMarker?: boolean;
  currentLocation?: { latitude: number; longitude: number } | null;
}
{/* LOKASI ABSEN */ }
const OFFICE = { latitude: -2.1359660060833807, longitude: 106.08458595346755 };
const RADIUS = 200;

export default function Maps({ height = "300px", showMarker = true, currentLocation }: MapsProps = {}) {
  const defaultPosition: [number, number] = [-2.136220950277728, 106.08475522112438];
  const position: [number, number] = currentLocation ? [currentLocation.latitude, currentLocation.longitude] : defaultPosition;

  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-0 z-10">
        <MapContainer center={position} zoom={16} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri" />
          {/* RADIUS KANTOR */}
          <Circle
            center={[OFFICE.latitude, OFFICE.longitude]}
            radius={RADIUS}
            pathOptions={{
              color: "#facc15",
              fillColor: "#fde047",
              fillOpacity: 0.2,
            }}
            className="animate-pulse"
          />

          {/* MARKER USER */}
          {currentLocation && (
            <Marker position={[currentLocation.latitude, currentLocation.longitude]} icon={uiMarker("yellow")}>
              <Popup>Posisi Anda</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
