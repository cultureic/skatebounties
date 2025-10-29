'use client';

import { useState, useEffect } from 'react';
import { useSpots, useGeolocation, useSpotPhotoUpload } from '@/hooks/useSpots';
import Button from '@/components/ui/button';
import { MdClose, MdMyLocation, MdPhotoCamera } from 'react-icons/md';
import { useMetaMask } from '@/hooks/useMetaMask';

interface CreateSpotModalProps {
  onClose: () => void;
}

const SPOT_TYPES = ['ledge', 'rail', 'stairs', 'manual_pad', 'bank', 'bowl', 'park', 'gap', 'hubba'];
const SURFACE_TYPES = ['concrete', 'marble', 'metal', 'wood', 'brick'];
const ACCESSIBILITY = ['public', 'private', 'restricted'];

export default function CreateSpotModal({ onClose }: CreateSpotModalProps) {
  const { createSpot, isCreating } = useSpots();
  const { location, getCurrentLocation, isLoading: gettingLocation } = useGeolocation();
  const { uploadPhoto, isUploading } = useSpotPhotoUpload();
  const { isConnected, connect } = useMetaMask();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    spot_type: 'rail',
    difficulty: 3,
    surface_type: 'concrete',
    accessibility: 'public',
    address: '',
    city: '',
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Auto-load location on mount
  useEffect(() => {
    if (!location) {
      getCurrentLocation();
    }
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError('');
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < Math.min(files.length, 5); i++) {
        const url = await uploadPhoto(files[i]);
        uploadedUrls.push(url);
      }
      setPhotos([...photos, ...uploadedUrls]);
    } catch (err: any) {
      setError('Failed to upload photos: ' + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (!location) {
      setError('Please enable location to add a spot');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter a spot name');
      return;
    }

    setError('');

    try {
      await createSpot({
        title: formData.title,
        description: formData.description || undefined,
        latitude: location.latitude,
        longitude: location.longitude,
        address: formData.address || undefined,
        city: formData.city || undefined,
        spot_type: formData.spot_type,
        difficulty: formData.difficulty,
        surface_type: formData.surface_type,
        accessibility: formData.accessibility,
        photos: photos.length > 0 ? photos : undefined,
      });

      onClose();
    } catch (err: any) {
      setError('Failed to create spot: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-asphalt shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-concrete/20 bg-asphalt px-6 py-4">
          <h2 className="font-heading text-2xl text-smoke">Add New Spot</h2>
          <button
            onClick={onClose}
            className="text-concrete hover:text-smoke"
          >
            <MdClose size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Wallet notice */}
          {!isConnected && (
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-yellow-300">Connect your wallet to create a spot.</p>
                <Button type="button" onClick={() => connect?.()} className="bg-yellow-500 text-asphalt hover:bg-yellow-500/90">
                  Connect Wallet
                </Button>
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="mb-2 block text-sm font-bold text-smoke">
              Location
            </label>
            {location ? (
              <div className="rounded-lg bg-electric-cyan/10 border border-electric-cyan/20 p-4">
                <p className="text-sm text-electric-cyan">
                  📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </p>
              </div>
            ) : (
              <Button
                type="button"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
                className="w-full bg-electric-cyan text-asphalt"
              >
                <MdMyLocation className="mr-2" />
                {gettingLocation ? 'Getting location...' : 'Use My Location'}
              </Button>
            )}
          </div>

          {/* Spot Name */}
          <div>
            <label className="mb-2 block text-sm font-bold text-smoke">
              Spot Name *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Downtown 10-stair"
              className="w-full rounded-lg border border-concrete/30 bg-concrete/10 px-4 py-3 text-smoke placeholder:text-concrete/50 focus:border-signal-orange focus:outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-bold text-smoke">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the spot, obstacles, best time to skate..."
              rows={3}
              className="w-full rounded-lg border border-concrete/30 bg-concrete/10 px-4 py-3 text-smoke placeholder:text-concrete/50 focus:border-signal-orange focus:outline-none"
            />
          </div>

          {/* Spot Type & Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-smoke">
                Spot Type
              </label>
              <select
                value={formData.spot_type}
                onChange={(e) => setFormData({ ...formData, spot_type: e.target.value })}
                className="w-full rounded-lg border border-concrete/30 bg-concrete/10 px-4 py-3 text-smoke focus:border-signal-orange focus:outline-none"
              >
                {SPOT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-smoke">
                Difficulty (1-5)
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="text-center text-signal-orange font-bold">
                {formData.difficulty} / 5
              </div>
            </div>
          </div>

          {/* Surface & Accessibility */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-smoke">
                Surface
              </label>
              <select
                value={formData.surface_type}
                onChange={(e) => setFormData({ ...formData, surface_type: e.target.value })}
                className="w-full rounded-lg border border-concrete/30 bg-concrete/10 px-4 py-3 text-smoke focus:border-signal-orange focus:outline-none"
              >
                {SURFACE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-smoke">
                Accessibility
              </label>
              <select
                value={formData.accessibility}
                onChange={(e) => setFormData({ ...formData, accessibility: e.target.value })}
                className="w-full rounded-lg border border-concrete/30 bg-concrete/10 px-4 py-3 text-smoke focus:border-signal-orange focus:outline-none"
              >
                {ACCESSIBILITY.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-smoke">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
                className="w-full rounded-lg border border-concrete/30 bg-concrete/10 px-4 py-3 text-smoke placeholder:text-concrete/50 focus:border-signal-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-smoke">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City name"
                className="w-full rounded-lg border border-concrete/30 bg-concrete/10 px-4 py-3 text-smoke placeholder:text-concrete/50 focus:border-signal-orange focus:outline-none"
              />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="mb-2 block text-sm font-bold text-smoke">
              Photos (up to 5)
            </label>
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-concrete/30 bg-concrete/5 p-6 hover:border-signal-orange hover:bg-concrete/10">
                <div className="text-center">
                  <MdPhotoCamera className="mx-auto mb-2 text-4xl text-concrete" />
                  <p className="text-sm text-concrete">
                    {isUploading ? 'Uploading...' : 'Click to upload photos'}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploading || photos.length >= 5}
                />
              </label>

              {photos.length > 0 && (
                <div className="grid grid-cols-5 gap-2">
                  {photos.map((url, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="h-full w-full rounded object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                        className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                      >
                        <MdClose size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-concrete/20 text-smoke hover:bg-concrete/30"
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-signal-orange text-smoke hover:bg-signal-orange/90"
              disabled={isCreating || !location}
            >
              {isCreating ? 'Creating...' : 'Create Spot'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
