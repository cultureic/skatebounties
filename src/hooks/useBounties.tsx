'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createBounty as createBountyApi,
  getActiveBounties,
  supabase,
} from '@/lib/supabase';
import { useSkateBounty } from './useSkateBounty';
import { useMetaMask } from '@/hooks/useMetaMask';
import { getUserByWallet, upsertUserByWallet } from '@/lib/supabase';
import { ethers } from 'ethers';

export interface Bounty {
  id: string;
  on_chain_id: number;
  tx_hash: string;
  spot_id: string;
  creator_id: string;
  trick_name: string;
  description?: string;
  trick_difficulty?: number;
  reward_token: string;
  reward_amount: string;
  reward_amount_usd?: number;
  votes_required: number;
  is_active: boolean;
  winner_id?: string;
  winning_submission_id?: string;
  tags: string[];
  created_at: string;
  completed_at?: string;
  expires_at?: string;
}

export interface CreateBountyInput {
  spot_id: string;
  trick_name: string;
  description?: string;
  trick_difficulty?: number;
  reward_token: string; // address(0) for CELO
  reward_amount: string; // in ETH/CELO
  votes_required: number;
  tags?: string[];
  useGasless?: boolean; // Use meta-transaction
}

export function useBounties() {
  const queryClient = useQueryClient();

  const {
    data: bounties = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['bounties'],
    queryFn: getActiveBounties,
  });

  return {
    bounties,
    isLoading,
    error,
  };
}

export function useCreateBounty() {
  const queryClient = useQueryClient();
  const { account } = useMetaMask();
  const {
    createBounty: createBountyOnChain,
    createBountyMeta: createBountyGasless,
  } = useSkateBounty();

  const createBountyMutation = useMutation({
    mutationFn: async (input: CreateBountyInput) => {
      if (!account) throw new Error('Wallet not connected');

      // Ensure user exists in DB
      let user = await getUserByWallet(account);
      if (!user) {
        user = await upsertUserByWallet(account);
      }

      // Generate spot ID hash for on-chain reference
      const spotIdHash = ethers.utils.formatBytes32String(input.spot_id.slice(0, 31));

      // 1. Create bounty on-chain (with or without gasless)
      const onChainId = input.useGasless
        ? await createBountyGasless(
            spotIdHash,
            input.trick_name,
            input.reward_token,
            input.reward_amount,
            input.votes_required
          )
        : await createBountyOnChain(
            spotIdHash,
            input.trick_name,
            input.reward_token,
            input.reward_amount,
            input.votes_required
          );

      // 2. Store metadata in Supabase
      const bounty = await createBountyApi({
        on_chain_id: onChainId,
        tx_hash: '', // TODO: Get from contract event
        spot_id: input.spot_id,
        creator_id: user.id,
        trick_name: input.trick_name,
        description: input.description,
        trick_difficulty: input.trick_difficulty,
        reward_token: input.reward_token,
        reward_amount: input.reward_amount,
        votes_required: input.votes_required,
        tags: input.tags,
      });

      // 3. Update spot bounty count
      await supabase.rpc('increment', {
        table_name: 'spots',
        id: input.spot_id,
        column_name: 'bounties_count',
      });

      return bounty;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bounties'] });
      queryClient.invalidateQueries({ queryKey: ['spots'] });
      queryClient.invalidateQueries({ queryKey: ['my-bounties'] });
    },
  });

  return {
    createBounty: createBountyMutation.mutateAsync,
    isCreating: createBountyMutation.isPending,
    error: createBountyMutation.error,
  };
}

export function useSpotBounties(spotId: string | null) {
  return useQuery({
    queryKey: ['spot-bounties', spotId],
    queryFn: async () => {
      if (!spotId) return [];

      const { data, error } = await supabase
        .from('bounties')
        .select(`
          *,
          creator:users!bounties_creator_id_fkey(*),
          submissions(count)
        `)
        .eq('spot_id', spotId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: Boolean(spotId),
  });
}

export function useMyBounties() {
  const { account } = useMetaMask();

  return useQuery({
    queryKey: ['my-bounties', account],
    queryFn: async () => {
      if (!account) return [];

      const user = await getUserByWallet(account);
      if (!user) return [];

      const { data, error } = await supabase
        .from('bounties')
        .select(`
          *,
          spot:spots(*),
          submissions(count)
        `)
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: Boolean(account),
  });
}

export function useBounty(bountyId: string | null) {
  return useQuery({
    queryKey: ['bounty', bountyId],
    queryFn: async () => {
      if (!bountyId) return null;

      const { data, error } = await supabase
        .from('bounties')
        .select(`
          *,
          spot:spots(*),
          creator:users!bounties_creator_id_fkey(*),
          submissions(
            *,
            skater:users!submissions_skater_id_fkey(*)
          )
        `)
        .eq('id', bountyId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: Boolean(bountyId),
  });
}

// Get trick types for autocomplete
export function useTrickTypes() {
  return useQuery({
    queryKey: ['trick-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trick_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
