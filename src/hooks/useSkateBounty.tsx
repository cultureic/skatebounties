'use client';

import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useMetaMask } from '@/hooks/useMetaMask';

export interface Bounty {
  id: number;
  creator: string;
  spotId: string;
  trickName: string;
  rewardToken: string;
  rewardAmount: string;
  votesRequired: number;
  isActive: boolean;
  createdAt: number;
  winner: string;
}

export interface Submission {
  id: number;
  bountyId: number;
  skater: string;
  videoIPFSHash: string;
  votesUp: number;
  votesDown: number;
  createdAt: number;
  rewarded: boolean;
}

export interface UseSkateBountyReturn {
  createBounty: (
    spotId: string,
    trickName: string,
    rewardToken: string,
    rewardAmount: string,
    votesRequired: number
  ) => Promise<number>;
  submitTrick: (bountyId: number, videoIPFSHash: string) => Promise<number>;
  vote: (submissionId: number, isUpvote: boolean) => Promise<void>;
  batchVote: (submissionIds: number[], isUpvotes: boolean[]) => Promise<void>;
  createBountyMeta: (
    spotId: string,
    trickName: string,
    rewardToken: string,
    rewardAmount: string,
    votesRequired: number
  ) => Promise<number>;
  submitTrickMeta: (bountyId: number, videoIPFSHash: string) => Promise<number>;
  voteMeta: (submissionId: number, isUpvote: boolean) => Promise<void>;
  getBounty: (bountyId: number) => Promise<Bounty | null>;
  getSubmission: (submissionId: number) => Promise<Submission | null>;
  getBountySubmissions: (bountyId: number) => Promise<number[]>;
  getReputation: (address: string) => Promise<number>;
  isLoading: boolean;
  error: string | null;
  contract: ethers.Contract | null;
}

export function useSkateBounty(): UseSkateBountyReturn {
  useMetaMask();
  const [contract] = useState<ethers.Contract | null>(null);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const notConfigured = useCallback(() => {
    throw new Error('On-chain not configured');
  }, []);

  return {
    createBounty: async () => notConfigured() as any,
    createBountyMeta: async () => notConfigured() as any,
    submitTrick: async () => notConfigured() as any,
    submitTrickMeta: async () => notConfigured() as any,
    vote: async () => notConfigured() as any,
    voteMeta: async () => notConfigured() as any,
    getBounty: async () => null,
    getSubmission: async () => null,
    getBountySubmissions: async () => [],
    getReputation: async () => 0,
    isLoading,
    error,
    contract,
  };
}
