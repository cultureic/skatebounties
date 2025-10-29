'use client';

import { useState } from 'react';
import { useVote, useUserVote } from '@/hooks/useSubmissions';
import { MdThumbUp, MdThumbDown } from 'react-icons/md';
import { motion } from 'framer-motion';

interface VoteButtonsProps {
  submissionId: string;
  initialVotesUp: number;
  initialVotesDown: number;
  showGaslessBadge?: boolean;
}

export default function VoteButtons({
  submissionId,
  initialVotesUp,
  initialVotesDown,
  showGaslessBadge = true,
}: VoteButtonsProps) {
  const { vote, isVoting } = useVote();
  const { data: userVote } = useUserVote(submissionId);
  const [votesUp, setVotesUp] = useState(initialVotesUp);
  const [votesDown, setVotesDown] = useState(initialVotesDown);

  const hasVoted = userVote !== null;
  const userVotedUp = userVote?.vote_value === 1;
  const userVotedDown = userVote?.vote_value === -1;

  const handleVote = async (isUpvote: boolean) => {
    if (hasVoted || isVoting) return;

    try {
      // Optimistic update
      if (isUpvote) {
        setVotesUp(votesUp + 1);
      } else {
        setVotesDown(votesDown + 1);
      }

      await vote({
        submissionId,
        isUpvote,
        useGasless: true, // Always use gasless by default
      });
    } catch (error) {
      // Revert optimistic update on error
      if (isUpvote) {
        setVotesUp(votesUp);
      } else {
        setVotesDown(votesDown);
      }
      console.error('Vote error:', error);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Upvote Button */}
      <motion.button
        onClick={() => handleVote(true)}
        disabled={hasVoted || isVoting}
        whileHover={{ scale: hasVoted ? 1 : 1.05 }}
        whileTap={{ scale: hasVoted ? 1 : 0.95 }}
        className={`
          flex items-center gap-2 rounded-full px-4 py-2 font-bold transition-all
          ${
            userVotedUp
              ? 'bg-electric-cyan text-asphalt'
              : hasVoted
              ? 'cursor-not-allowed bg-concrete/10 text-concrete/50'
              : 'bg-concrete/20 text-smoke hover:bg-electric-cyan hover:text-asphalt'
          }
          ${isVoting ? 'opacity-50' : ''}
        `}
      >
        <MdThumbUp className={userVotedUp ? 'animate-pulse' : ''} />
        <span>{votesUp}</span>
      </motion.button>

      {/* Downvote Button */}
      <motion.button
        onClick={() => handleVote(false)}
        disabled={hasVoted || isVoting}
        whileHover={{ scale: hasVoted ? 1 : 1.05 }}
        whileTap={{ scale: hasVoted ? 1 : 0.95 }}
        className={`
          flex items-center gap-2 rounded-full px-4 py-2 font-bold transition-all
          ${
            userVotedDown
              ? 'bg-signal-orange text-smoke'
              : hasVoted
              ? 'cursor-not-allowed bg-concrete/10 text-concrete/50'
              : 'bg-concrete/20 text-smoke hover:bg-signal-orange'
          }
          ${isVoting ? 'opacity-50' : ''}
        `}
      >
        <MdThumbDown className={userVotedDown ? 'animate-pulse' : ''} />
        <span>{votesDown}</span>
      </motion.button>

      {/* Gasless Badge */}
      {showGaslessBadge && !hasVoted && (
        <span className="rounded bg-electric-cyan/10 px-2 py-1 text-xs text-electric-cyan">
          ⚡ Free
        </span>
      )}

      {/* Already Voted Message */}
      {hasVoted && (
        <span className="text-xs text-concrete">
          ✓ You voted
        </span>
      )}
    </div>
  );
}
