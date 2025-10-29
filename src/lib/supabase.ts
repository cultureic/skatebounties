import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'skatebounties',
    },
  },
});

// Helper functions for common operations

/**
 * Find nearby spots using PostGIS
 */
export async function findNearbySpots(
  latitude: number,
  longitude: number,
  radiusKm: number = 10
) {
  const { data, error } = await supabase.rpc('find_nearby_spots', {
    user_lat: latitude,
    user_lng: longitude,
    radius_km: radiusKm,
  });

  if (error) throw error;
  return data;
}

/**
 * Create or get user by wallet address
 */
export async function upsertUserByWallet(walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        wallet_address: walletAddress.toLowerCase(),
      },
      {
        onConflict: 'wallet_address',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user by wallet address
 */
export async function getUserByWallet(walletAddress: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

/**
 * Create a new spot
 */
export async function createSpot(spot: {
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
  photos?: string[];
}) {
  const { data, error } = await supabase
    .from('spots')
    .insert({
      ...spot,
      location: `POINT(${spot.longitude} ${spot.latitude})`,
      photos: spot.photos || [],
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get spot with bounties
 */
export async function getSpotWithBounties(spotId: string) {
  const { data: spot, error: spotError } = await supabase
    .from('spots')
    .select(
      `
      *,
      creator:users!spots_creator_id_fkey(*),
      bounties(
        *,
        creator:users!bounties_creator_id_fkey(*),
        submissions(
          *,
          skater:users!submissions_skater_id_fkey(*)
        )
      )
    `
    )
    .eq('id', spotId)
    .single();

  if (spotError) throw spotError;
  return spot;
}

/**
 * Create a bounty (after on-chain creation)
 */
export async function createBounty(bounty: {
  on_chain_id: number;
  tx_hash: string;
  spot_id: string;
  creator_id: string;
  trick_name: string;
  description?: string;
  trick_difficulty?: number;
  reward_token: string;
  reward_amount: string;
  votes_required: number;
  tags?: string[];
}) {
  const { data, error } = await supabase
    .from('bounties')
    .insert(bounty)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get active bounties
 */
export async function getActiveBounties(limit: number = 50) {
  const { data, error } = await supabase
    .from('bounties')
    .select(
      `
      *,
      spot:spots(*),
      creator:users!bounties_creator_id_fkey(*),
      submissions(count)
    `
    )
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Create a submission (after on-chain submission)
 */
export async function createSubmission(submission: {
  on_chain_id: number;
  tx_hash: string;
  bounty_id: string;
  skater_id: string;
  video_url: string;
  video_thumbnail_url?: string;
  video_duration?: number;
  caption?: string;
}) {
  const { data, error } = await supabase
    .from('submissions')
    .insert(submission)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Vote on submission
 */
export async function voteOnSubmission(
  submissionId: string,
  voterId: string,
  isUpvote: boolean
) {
  const { data, error } = await supabase
    .from('votes')
    .upsert(
      {
        submission_id: submissionId,
        voter_id: voterId,
        vote_value: isUpvote ? 1 : -1,
      },
      {
        onConflict: 'submission_id,voter_id',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user's vote on a submission
 */
export async function getUserVote(submissionId: string, userId: string) {
  const { data, error } = await supabase
    .from('votes')
    .select('vote_value')
    .eq('submission_id', submissionId)
    .eq('voter_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get submission with details
 */
export async function getSubmission(submissionId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `
      *,
      bounty:bounties(*),
      skater:users!submissions_skater_id_fkey(*),
      votes(count)
    `
    )
    .eq('id', submissionId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user profile with stats
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select(
      `
      *,
      spots:spots!spots_creator_id_fkey(count),
      bounties:bounties!bounties_creator_id_fkey(count),
      submissions:submissions!submissions_skater_id_fkey(count),
      followers:followers!followers_following_id_fkey(count),
      following:followers!followers_follower_id_fkey(count)
    `
    )
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Follow/unfollow user
 */
export async function toggleFollow(followerId: string, followingId: string) {
  // Check if already following
  const { data: existing } = await supabase
    .from('followers')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (existing) {
    // Unfollow
    const { error } = await supabase
      .from('followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) throw error;
    return { following: false };
  } else {
    // Follow
    const { error } = await supabase
      .from('followers')
      .insert({ follower_id: followerId, following_id: followingId });

    if (error) throw error;
    return { following: true };
  }
}

/**
 * Get activity feed
 */
export async function getActivityFeed(userId?: string, limit: number = 50) {
  let query = supabase
    .from('activity_feed')
    .select(
      `
      *,
      user:users!activity_feed_user_id_fkey(*),
      spot:spots(*),
      bounty:bounties(*),
      submission:submissions(*)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Create notification
 */
export async function createNotification(notification: {
  user_id: string;
  type: string;
  title: string;
  message?: string;
  link_url?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(userId: string, notificationIds?: string[]) {
  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId);

  if (notificationIds && notificationIds.length > 0) {
    query = query.in('id', notificationIds);
  }

  const { error } = await query;
  if (error) throw error;
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

/**
 * Search spots by text
 */
export async function searchSpots(query: string, limit: number = 20) {
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`)
    .eq('is_active', true)
    .limit(limit);

  if (error) throw error;
  return data;
}

/**
 * Get leaderboard (top skaters by earnings)
 */
export async function getLeaderboard(
  type: 'earnings' | 'reputation' | 'spots' | 'bounties' = 'earnings',
  limit: number = 10
) {
  let orderBy: string;
  switch (type) {
    case 'earnings':
      orderBy = 'total_earnings';
      break;
    case 'reputation':
      orderBy = 'reputation_score';
      break;
    case 'spots':
      orderBy = 'total_spots_created';
      break;
    case 'bounties':
      orderBy = 'total_bounties_created';
      break;
  }

  const { data, error } = await supabase
    .from('users')
    .select('id, username, wallet_address, avatar_url, reputation_score, total_earnings, total_spots_created, total_bounties_created')
    .order(orderBy, { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export default supabase;
