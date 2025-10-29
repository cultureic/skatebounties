'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createSubmission as createSubmissionApi,
  voteOnSubmission,
  getUserVote,
  getSubmission,
  supabase,
} from '@/lib/supabase';
import { useSkateBounty } from './useSkateBounty';
import { useMetaMask } from '@/hooks/useMetaMask';
import { getUserByWallet, upsertUserByWallet } from '@/lib/supabase';

export interface Submission {
  id: string;
  on_chain_id: number;
  tx_hash: string;
  bounty_id: string;
  skater_id: string;
  video_url: string;
  video_thumbnail_url?: string;
  video_duration?: number;
  votes_up: number;
  votes_down: number;
  vote_score: number;
  status: 'pending' | 'approved' | 'rejected' | 'winner';
  is_rewarded: boolean;
  caption?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubmissionInput {
  bounty_id: string;
  video_url: string; // IPFS hash or Supabase URL
  video_thumbnail_url?: string;
  video_duration?: number;
  caption?: string;
  useGasless?: boolean;
}

export function useSubmissions(bountyId: string | null) {
  return useQuery({
    queryKey: ['submissions', bountyId],
    queryFn: async () => {
      if (!bountyId) return [];

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          skater:users!submissions_skater_id_fkey(*),
          bounty:bounties(*)
        `)
        .eq('bounty_id', bountyId)
        .order('vote_score', { ascending: false });

      if (error) throw error;
      return data as Submission[];
    },
    enabled: Boolean(bountyId),
  });
}

export function useSubmission(submissionId: string | null) {
  return useQuery({
    queryKey: ['submission', submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      return getSubmission(submissionId);
    },
    enabled: Boolean(submissionId),
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();
  const { account } = useMetaMask();
  const {
    submitTrick: submitTrickOnChain,
    submitTrickMeta: submitTrickGasless,
  } = useSkateBounty();

  const createSubmissionMutation = useMutation({
    mutationFn: async (input: CreateSubmissionInput) => {
      if (!account) throw new Error('Wallet not connected');

      // Ensure user exists
      let user = await getUserByWallet(account);
      if (!user) {
        user = await upsertUserByWallet(account);
      }

      // 1. Submit on-chain (with or without gasless)
      const onChainId = input.useGasless
        ? await submitTrickGasless(parseInt(input.bounty_id), input.video_url)
        : await submitTrickOnChain(parseInt(input.bounty_id), input.video_url);

      // 2. Store metadata in Supabase
      const submission = await createSubmissionApi({
        on_chain_id: onChainId,
        tx_hash: '', // TODO: Get from event
        bounty_id: input.bounty_id,
        skater_id: user.id,
        video_url: input.video_url,
        video_thumbnail_url: input.video_thumbnail_url,
        video_duration: input.video_duration,
        caption: input.caption,
      });

      return submission;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['submissions', variables.bounty_id] });
      queryClient.invalidateQueries({ queryKey: ['bounty', variables.bounty_id] });
      queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    },
  });

  return {
    createSubmission: createSubmissionMutation.mutateAsync,
    isCreating: createSubmissionMutation.isPending,
    error: createSubmissionMutation.error,
  };
}

export function useVote() {
  const queryClient = useQueryClient();
  const { account } = useMetaMask();
  const { voteMeta: voteGasless, vote: voteOnChain } = useSkateBounty();

  const voteMutation = useMutation({
    mutationFn: async ({
      submissionId,
      isUpvote,
      useGasless = true,
    }: {
      submissionId: string;
      isUpvote: boolean;
      useGasless?: boolean;
    }) => {
      if (!account) throw new Error('Wallet not connected');

      let user = await getUserByWallet(account);
      if (!user) {
        user = await upsertUserByWallet(account);
      }

      // 1. Vote on-chain
      if (useGasless) {
        await voteGasless(parseInt(submissionId), isUpvote);
      } else {
        await voteOnChain(parseInt(submissionId), isUpvote);
      }

      // 2. Record vote in Supabase
      await voteOnSubmission(submissionId, user.id, isUpvote);

      return { submissionId, isUpvote };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['submission', data.submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['user-vote', data.submissionId] });
    },
  });

  return {
    vote: voteMutation.mutateAsync,
    isVoting: voteMutation.isPending,
    error: voteMutation.error,
  };
}

export function useUserVote(submissionId: string | null) {
  const { account } = useMetaMask();

  return useQuery({
    queryKey: ['user-vote', submissionId, account],
    queryFn: async () => {
      if (!submissionId || !account) return null;

      const user = await getUserByWallet(account);
      if (!user) return null;

      return getUserVote(submissionId, user.id);
    },
    enabled: Boolean(submissionId && account),
  });
}

export function useMySubmissions() {
  const { account } = useMetaMask();

  return useQuery({
    queryKey: ['my-submissions', account],
    queryFn: async () => {
      if (!account) return [];

      const user = await getUserByWallet(account);
      if (!user) return [];

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          bounty:bounties(
            *,
            spot:spots(*)
          )
        `)
        .eq('skater_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: Boolean(account),
  });
}

// Hook for video upload
export function useVideoUpload() {
  const uploadVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('videos').getPublicUrl(filePath);

      return publicUrl;
    },
  });

  return {
    uploadVideo: uploadVideoMutation.mutateAsync,
    isUploading: uploadVideoMutation.isPending,
    progress: uploadVideoMutation.isPending ? 50 : 0, // TODO: Real progress
    error: uploadVideoMutation.error,
  };
}

// Hook for generating video thumbnail
export function useGenerateThumbnail() {
  const generateThumbnailMutation = useMutation({
    mutationFn: async (videoFile: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = () => {
          video.currentTime = 1; // Seek to 1 second
        };

        video.onseeked = async () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context?.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('Failed to generate thumbnail'));
              return;
            }

            // Upload thumbnail to storage
            const fileName = `${Math.random()}.jpg`;
            const filePath = `thumbnails/${fileName}`;

            const { error } = await supabase.storage
              .from('videos')
              .upload(filePath, blob);

            if (error) {
              reject(error);
              return;
            }

            const {
              data: { publicUrl },
            } = supabase.storage.from('videos').getPublicUrl(filePath);

            resolve(publicUrl);
          }, 'image/jpeg');
        };

        video.onerror = () => {
          reject(new Error('Error loading video'));
        };

        video.src = URL.createObjectURL(videoFile);
      });
    },
  });

  return {
    generateThumbnail: generateThumbnailMutation.mutateAsync,
    isGenerating: generateThumbnailMutation.isPending,
    error: generateThumbnailMutation.error,
  };
}
