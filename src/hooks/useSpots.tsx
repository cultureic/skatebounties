'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import {
  supabase,
  createSpot as createSpotApi,
  findNearbySpots,
  getSpotWithBounties,
  searchSpots,
} from '@/lib/supabase';
import { useMetaMask } from '@/hooks/useMetaMask';
import { getUserByWallet, upsertUserByWallet } from '@/lib/supabase';

export interface Spot {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  spot_type?: string;
  difficulty?: number;
  surface_type?: string;
  accessibility?: string;
  photos: string[];
  video_preview_url?: string;
  views_count: number;
  bounties_count: number;
  submissions_count: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSpotInput {
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  spot_type?: string;
  difficulty?: number;
  surface_type?: string;
  accessibility?: string;
  photos?: string[];
}

export function useSpots() {
  const queryClient = useQueryClient();
  const { account } = useMetaMask();

  // Get all spots
  const {
    data: spots = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['spots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spots')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Spot[];
    },
  });

  // Create spot mutation
  const createSpotMutation = useMutation({
    mutationFn: async (input: CreateSpotInput) => {
      if (!account) throw new Error('Wallet not connected');

      // Ensure user exists
      let user = await getUserByWallet(account);
      if (!user) {
        user = await upsertUserByWallet(account);
      }

      return createSpotApi({
        ...input,
        creator_id: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spots'] });
      queryClient.invalidateQueries({ queryKey: ['my-spots'] });
    },
  });

  return {
    spots,
    isLoading,
    error,
    createSpot: createSpotMutation.mutateAsync,
    isCreating: createSpotMutation.isPending,
  };
}

export function useNearbySpots(
  latitude: number | null,
  longitude: number | null,
  radiusKm: number = 10
) {
  return useQuery({
    queryKey: ['nearby-spots', latitude, longitude, radiusKm],
    queryFn: async () => {
      if (!latitude || !longitude) return [];
      return findNearbySpots(latitude, longitude, radiusKm);
    },
    enabled: Boolean(latitude && longitude),
  });
}

export function useSpot(spotId: string | null) {
  return useQuery({
    queryKey: ['spot', spotId],
    queryFn: async () => {
      if (!spotId) return null;
      return getSpotWithBounties(spotId);
    },
    enabled: Boolean(spotId),
  });
}

export function useSearchSpots(query: string) {
  return useQuery({
    queryKey: ['search-spots', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      return searchSpots(query);
    },
    enabled: query.length >= 2,
  });
}

export function useMySpots() {
  const { account } = useMetaMask();

  return useQuery({
    queryKey: ['my-spots', account],
    queryFn: async () => {
      if (!account) return [];

      const user = await getUserByWallet(account);
      if (!user) return [];

      const { data, error } = await supabase
        .from('spots')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Spot[];
    },
    enabled: Boolean(account),
  });
}

// Hook for geolocation
export function useGeolocation() {
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvePosition = useCallback((position: GeolocationPosition) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });
    setIsLoading(false);
    setError(null);
  }, []);

  const explainError = (err: GeolocationPositionError): string => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return 'Location permission denied. Check browser site settings and reload.';
      case err.POSITION_UNAVAILABLE:
        return 'Location unavailable. Turn on GPS/location services and try again.';
      case err.TIMEOUT:
        return 'Timed out getting location. Try again or move to an area with better signal.';
      default:
        return err.message || 'Failed to get location.';
    }
  };

  const getCurrentLocation = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported by browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check permission state if supported
      const anyNav: any = navigator as any;
      if (anyNav.permissions?.query) {
        try {
          const status: PermissionStatus = await anyNav.permissions.query({ name: 'geolocation' as PermissionName });
          if (status.state === 'denied') {
            setIsLoading(false);
            setError('Location permission denied. Please enable it in site settings and reload.');
            return;
          }
        } catch {}
      }

      // Simple retry helper
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

      let attempts = 0;
      const tryWatch = () => {
        const watchId = navigator.geolocation.watchPosition(
          (pos) => {
            resolvePosition(pos);
            navigator.geolocation.clearWatch(watchId);
          },
          async (err) => {
            navigator.geolocation.clearWatch(watchId);
            // Retry a couple times if position temporarily unknown
            if (err.code === err.POSITION_UNAVAILABLE && attempts < 2) {
              attempts += 1;
              await delay(1000 * attempts);
              tryWatch();
              return;
            }
            // Fallback to a less strict getCurrentPosition
            navigator.geolocation.getCurrentPosition(
              (pos) => resolvePosition(pos),
              async (err2) => {
                // Final fallback: approximate by IP (city-level)
                try {
                  const res = await fetch('https://ipapi.co/json/');
                  const data = await res.json();
                  if (data && data.latitude && data.longitude) {
                    setLocation({ latitude: data.latitude, longitude: data.longitude });
                    setIsLoading(false);
                    setError('Using approximate location based on IP');
                    return;
                  }
                } catch {}
                setIsLoading(false);
                setError(explainError(err2));
              },
              { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
            );
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
        );
      };

      tryWatch();
    } catch (e: any) {
      setIsLoading(false);
      setError(e?.message || 'Failed to get location');
    }
  }, [resolvePosition]);

  return {
    location,
    isLoading,
    error,
    getCurrentLocation,
  };
}

// Hook for spot photo uploads
export function useSpotPhotoUpload() {
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `spots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('skateordie')
        .upload(filePath, file, { upsert: true, contentType: file.type || 'application/octet-stream' });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('skateordie').getPublicUrl(filePath);

      return publicUrl;
    },
  });

  return {
    uploadPhoto: uploadPhotoMutation.mutateAsync,
    isUploading: uploadPhotoMutation.isPending,
    error: uploadPhotoMutation.error,
  };
}
