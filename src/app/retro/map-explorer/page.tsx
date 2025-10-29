'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useGeolocation, useNearbySpots } from '@/hooks/useSpots';
import Button from '@/components/ui/button';
import { MdMyLocation, MdAdd } from 'react-icons/md';
import CreateSpotModal from '@/components/spot/CreateSpotModal';
import { useMetaMask } from '@/hooks/useMetaMask';

// Dynamically import map to avoid SSR issues
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-200px)] items-center justify-center bg-asphalt">
      <div className="text-smoke">Loading map...</div>
    </div>
  ),
});

const MEXICO_CITY = { lat: 19.432608, lng: -99.133209 };

export default function MapExplorerPage() {
  const [radiusKm, setRadiusKm] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [manualLoc, setManualLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const { location, getCurrentLocation, isLoading: isGettingLocation } = useGeolocation();
  const { isConnected, connect, disconnect, account } = useMetaMask();

  const activeLat = manualLoc ? manualLoc.lat : location?.latitude || null;
  const activeLng = manualLoc ? manualLoc.lng : location?.longitude || null;

  const {
    data: nearbySpots = [],
    isLoading,
    error,
  } = useNearbySpots(activeLat, activeLng, radiusKm);

  useEffect(() => {
    // Auto-get location on mount
    getCurrentLocation();
  }, [getCurrentLocation]);

  const jumpToMexicoCity = () => {
    setManualLoc({ lat: MEXICO_CITY.lat, lng: MEXICO_CITY.lng });
    setBanner('Showing demo spots near Mexico City');
    // Auto-hide banner after 4s
    setTimeout(() => setBanner(null), 4000);
  };

  return (
    <div className="relative min-h-screen bg-asphalt">
      {/* Header */}
      <div className="border-b border-concrete/20 bg-asphalt/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-3xl text-smoke">🛹 Spot Explorer</h1>
              <p className="text-sm text-concrete">{nearbySpots.length} spots nearby</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Radius Selector */}
              <select
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                className="rounded-lg border border-concrete/30 bg-asphalt px-4 py-2 text-smoke focus:border-signal-orange focus:outline-none"
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
              </select>

              {/* Mexico City Quick Jump */}
              <Button onClick={jumpToMexicoCity} className="bg-concrete/20 text-smoke hover:bg-concrete/30">
                Mexico City
              </Button>

              {/* Get Location Button */}
              <Button
                onClick={() => {
                  setManualLoc(null);
                  getCurrentLocation();
                }}
                disabled={isGettingLocation}
                className="bg-electric-cyan text-asphalt hover:bg-electric-cyan/90"
              >
                <MdMyLocation className="mr-2" />
                {isGettingLocation ? 'Finding...' : 'Near Me'}
              </Button>

              {/* Connect / Account */}
              <Button
                onClick={() => (isConnected ? disconnect?.() : connect?.())}
                className="bg-concrete/20 text-smoke hover:bg-concrete/30"
              >
                {isConnected ? `${account?.slice(0, 6)}...${account?.slice(-4)}` : 'Connect Wallet'}
              </Button>

              {/* Add Spot Button */}
              <Button
                onClick={() => setShowCreateModal(true)}
                disabled={!isConnected}
                className="bg-signal-orange text-smoke hover:bg-signal-orange/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MdAdd className="mr-2" />
                Add Spot
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Banner */}
      {banner && (
        <div className="absolute left-1/2 top-20 z-20 -translate-x-1/2 rounded-lg border border-electric-cyan/30 bg-electric-cyan/10 px-4 py-2 text-electric-cyan">
          {banner}
        </div>
      )}

      {/* Map */}
      <div className="h-[calc(100vh-120px)]">
        {error && (
          <div className="flex h-full items-center justify-center">
            <div className="rounded-lg bg-red-500/10 p-6 text-center">
              <p className="text-red-400">{error.message}</p>
              <Button onClick={getCurrentLocation} className="mt-4">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {!activeLat && !isGettingLocation && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="mb-4 text-smoke">Enable location to see nearby spots</p>
              <div className="flex items-center justify-center gap-3">
                <Button onClick={getCurrentLocation} size="large">
                  Enable Location
                </Button>
                <Button onClick={jumpToMexicoCity} size="large" className="bg-concrete/20 text-smoke hover:bg-concrete/30">
                  Mexico City
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeLat && activeLng && (
          <MapView center={[activeLat, activeLng]} spots={nearbySpots} isLoading={isLoading} />
        )}
      </div>

      {/* Create Spot Modal */}
      {showCreateModal && <CreateSpotModal onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
