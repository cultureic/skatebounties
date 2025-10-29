'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import Link from 'next/link';
import routes from '@/config/routes';

// Fix for default marker icons in Next.js
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom spot marker icon (simple orange circle)
const spotIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#FF4E00" stroke="#F5F5F5" stroke-width="2"/>
      <circle cx="16" cy="16" r="8" fill="#F5F5F5"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface MapViewProps {
  center: LatLngExpression;
  spots: any[];
  isLoading?: boolean;
}

// Component to recenter map when center prop changes
function RecenterMap({ center }: { center: LatLngExpression }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);

  return null;
}

export default function MapView({ center, spots, isLoading }: MapViewProps) {
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={center} />

        {/* User Location Marker */}
        <Marker position={center}>
          <Popup>
            <div className="p-2 text-center">
              <p className="font-bold">You are here</p>
            </div>
          </Popup>
        </Marker>

        {/* Spot Markers */}
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            position={[spot.latitude, spot.longitude]}
            icon={spotIcon}
          >
            <Popup>
              <div className="min-w-[200px] p-2">
                <h3 className="mb-1 font-heading text-lg font-bold">
                  {spot.title}
                </h3>

                {spot.distance_km && (
                  <p className="mb-2 text-sm text-gray-600">
                    📍 {spot.distance_km.toFixed(1)} km away
                  </p>
                )}

                <div className="mb-2 flex items-center gap-2 text-sm">
                  <span className="rounded bg-signal-orange/20 px-2 py-1 text-signal-orange">
                    Difficulty: {spot.difficulty || 'N/A'}/5
                  </span>
                  {spot.bounties_count > 0 && (
                    <span className="rounded bg-electric-cyan/20 px-2 py-1 text-electric-cyan">
                      💰 {spot.bounties_count} bounties
                    </span>
                  )}
                </div>

                <Link
                  href={routes.spotDetail(spot.id)}
                  className="mt-2 block rounded bg-signal-orange px-4 py-2 text-center text-sm font-bold text-white hover:bg-signal-orange/90"
                >
                  View Spot
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="rounded-lg bg-asphalt px-6 py-3 text-smoke shadow-lg">
            Loading spots...
          </div>
        </div>
      )}
    </div>
  );
}
