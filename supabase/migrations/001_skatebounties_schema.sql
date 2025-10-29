-- Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    reputation_score INTEGER DEFAULT 0,
    total_spots_created INTEGER DEFAULT 0,
    total_bounties_created INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    total_earnings DECIMAL(18, 6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast wallet lookups
CREATE INDEX idx_users_wallet ON public.users(wallet_address);
CREATE INDEX idx_users_reputation ON public.users(reputation_score DESC);

-- =====================================================
-- SPOTS TABLE (Skate locations)
-- =====================================================
CREATE TABLE public.spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    -- PostGIS geography point for accurate distance calculations
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    city TEXT,
    country TEXT,
    -- Spot attributes
    spot_type TEXT, -- 'ledge', 'rail', 'stairs', 'manual_pad', 'bank', 'bowl', 'park'
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5), -- 1=beginner, 5=pro
    surface_type TEXT, -- 'concrete', 'marble', 'metal', 'wood'
    accessibility TEXT, -- 'public', 'private', 'restricted'
    -- Media
    photos JSONB DEFAULT '[]'::jsonb, -- Array of photo URLs
    video_preview_url TEXT,
    -- Stats
    views_count INTEGER DEFAULT 0,
    bounties_count INTEGER DEFAULT 0,
    submissions_count INTEGER DEFAULT 0,
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Spatial index for geo queries (find nearby spots)
CREATE INDEX idx_spots_location ON public.spots USING GIST(location);
-- Regular indexes
CREATE INDEX idx_spots_creator ON public.spots(creator_id);
CREATE INDEX idx_spots_difficulty ON public.spots(difficulty);
CREATE INDEX idx_spots_type ON public.spots(spot_type);
CREATE INDEX idx_spots_city ON public.spots(city);
CREATE INDEX idx_spots_created_at ON public.spots(created_at DESC);

-- =====================================================
-- BOUNTIES TABLE (On-chain + off-chain metadata)
-- =====================================================
CREATE TABLE public.bounties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- On-chain reference
    on_chain_id INTEGER UNIQUE, -- ID from smart contract
    tx_hash TEXT,
    -- Relations
    spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    -- Bounty details
    trick_name TEXT NOT NULL,
    description TEXT,
    trick_difficulty INTEGER CHECK (trick_difficulty BETWEEN 1 AND 5),
    -- Reward
    reward_token TEXT NOT NULL, -- address(0) for CELO, or token address
    reward_amount DECIMAL(18, 6) NOT NULL,
    reward_amount_usd DECIMAL(10, 2), -- Cache USD value
    -- Voting
    votes_required INTEGER NOT NULL,
    -- Status
    is_active BOOLEAN DEFAULT true,
    winner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    winning_submission_id UUID,
    -- Metadata
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_bounties_spot ON public.bounties(spot_id);
CREATE INDEX idx_bounties_creator ON public.bounties(creator_id);
CREATE INDEX idx_bounties_active ON public.bounties(is_active) WHERE is_active = true;
CREATE INDEX idx_bounties_reward ON public.bounties(reward_amount DESC);
CREATE INDEX idx_bounties_on_chain ON public.bounties(on_chain_id);

-- =====================================================
-- SUBMISSIONS TABLE (Trick attempts)
-- =====================================================
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- On-chain reference
    on_chain_id INTEGER UNIQUE,
    tx_hash TEXT,
    -- Relations
    bounty_id UUID REFERENCES public.bounties(id) ON DELETE CASCADE,
    skater_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    -- Media
    video_url TEXT NOT NULL, -- IPFS hash or Supabase storage URL
    video_thumbnail_url TEXT,
    video_duration INTEGER, -- seconds
    -- Voting
    votes_up INTEGER DEFAULT 0,
    votes_down INTEGER DEFAULT 0,
    vote_score INTEGER GENERATED ALWAYS AS (votes_up - votes_down) STORED,
    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'winner'
    is_rewarded BOOLEAN DEFAULT false,
    -- Metadata
    caption TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_submissions_bounty ON public.submissions(bounty_id);
CREATE INDEX idx_submissions_skater ON public.submissions(skater_id);
CREATE INDEX idx_submissions_status ON public.submissions(status);
CREATE INDEX idx_submissions_score ON public.submissions(vote_score DESC);
CREATE INDEX idx_submissions_created ON public.submissions(created_at DESC);

-- =====================================================
-- VOTES TABLE
-- =====================================================
CREATE TABLE public.votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
    voter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    vote_value INTEGER NOT NULL CHECK (vote_value IN (-1, 1)), -- -1 downvote, 1 upvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure one vote per user per submission
    UNIQUE(submission_id, voter_id)
);

CREATE INDEX idx_votes_submission ON public.votes(submission_id);
CREATE INDEX idx_votes_voter ON public.votes(voter_id);

-- =====================================================
-- COMMENTS TABLE
-- =====================================================
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    -- Polymorphic: can comment on spots OR submissions
    spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- For nested replies
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure comment is on either spot OR submission, not both
    CHECK (
        (spot_id IS NOT NULL AND submission_id IS NULL) OR
        (spot_id IS NULL AND submission_id IS NOT NULL)
    )
);

CREATE INDEX idx_comments_spot ON public.comments(spot_id);
CREATE INDEX idx_comments_submission ON public.comments(submission_id);
CREATE INDEX idx_comments_user ON public.comments(user_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_id);

-- =====================================================
-- FOLLOWERS TABLE (Social graph)
-- =====================================================
CREATE TABLE public.followers (
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    -- Can't follow yourself
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_followers_follower ON public.followers(follower_id);
CREATE INDEX idx_followers_following ON public.followers(following_id);

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'bounty_created', 'submission_posted', 'vote_received', 'bounty_won', etc.
    title TEXT NOT NULL,
    message TEXT,
    link_url TEXT,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- =====================================================
-- ACTIVITY_FEED TABLE (For homepage feed)
-- =====================================================
CREATE TABLE public.activity_feed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'spot_created', 'bounty_created', 'submission_posted', 'bounty_won'
    spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
    bounty_id UUID REFERENCES public.bounties(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON public.activity_feed(user_id);
CREATE INDEX idx_activity_type ON public.activity_feed(activity_type);
CREATE INDEX idx_activity_created ON public.activity_feed(created_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spots_updated_at BEFORE UPDATE ON public.spots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update submission vote counts
CREATE OR REPLACE FUNCTION update_submission_votes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_value = 1 THEN
            UPDATE public.submissions SET votes_up = votes_up + 1 WHERE id = NEW.submission_id;
        ELSE
            UPDATE public.submissions SET votes_down = votes_down + 1 WHERE id = NEW.submission_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_value = 1 THEN
            UPDATE public.submissions SET votes_up = votes_up - 1 WHERE id = OLD.submission_id;
        ELSE
            UPDATE public.submissions SET votes_down = votes_down - 1 WHERE id = OLD.submission_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.vote_value != NEW.vote_value THEN
            IF OLD.vote_value = 1 THEN
                UPDATE public.submissions SET votes_up = votes_up - 1, votes_down = votes_down + 1 WHERE id = NEW.submission_id;
            ELSE
                UPDATE public.submissions SET votes_up = votes_up + 1, votes_down = votes_down - 1 WHERE id = NEW.submission_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_votes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.votes
FOR EACH ROW EXECUTE FUNCTION update_submission_votes();

-- Function to find nearby spots (using PostGIS)
CREATE OR REPLACE FUNCTION find_nearby_spots(
    user_lat DECIMAL,
    user_lng DECIMAL,
    radius_km DECIMAL DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    distance_km DECIMAL,
    latitude DECIMAL,
    longitude DECIMAL,
    difficulty INTEGER,
    bounties_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.title,
        (ST_Distance(
            s.location,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
        ) / 1000)::DECIMAL AS distance_km,
        s.latitude,
        s.longitude,
        s.difficulty,
        s.bounties_count
    FROM public.spots s
    WHERE s.is_active = true
    AND ST_DWithin(
        s.location,
        ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
        radius_km * 1000
    )
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- USERS: Public read, own user write
CREATE POLICY "Users are viewable by everyone" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (wallet_address = current_setting('request.jwt.claim.wallet_address', true));

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (wallet_address = current_setting('request.jwt.claim.wallet_address', true));

-- SPOTS: Public read, authenticated create
CREATE POLICY "Spots are viewable by everyone" ON public.spots
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create spots" ON public.spots
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own spots" ON public.spots
    FOR UPDATE USING (creator_id = auth.uid());

-- BOUNTIES: Public read, authenticated create
CREATE POLICY "Bounties are viewable by everyone" ON public.bounties
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create bounties" ON public.bounties
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- SUBMISSIONS: Public read, authenticated create
CREATE POLICY "Submissions are viewable by everyone" ON public.submissions
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create submissions" ON public.submissions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- VOTES: Public read, authenticated create, own delete
CREATE POLICY "Votes are viewable by everyone" ON public.votes
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.votes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own votes" ON public.votes
    FOR DELETE USING (voter_id = auth.uid());

-- COMMENTS: Public read, authenticated create, own update/delete
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own comments" ON public.comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE USING (user_id = auth.uid());

-- FOLLOWERS: Public read, authenticated manage own follows
CREATE POLICY "Followers are viewable by everyone" ON public.followers
    FOR SELECT USING (true);

CREATE POLICY "Users can follow others" ON public.followers
    FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow" ON public.followers
    FOR DELETE USING (follower_id = auth.uid());

-- NOTIFICATIONS: Users can only see own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- ACTIVITY_FEED: Public read
CREATE POLICY "Activity feed is viewable by everyone" ON public.activity_feed
    FOR SELECT USING (true);

-- =====================================================
-- INITIAL DATA (Optional)
-- =====================================================

-- Insert sample trick types for reference
CREATE TABLE IF NOT EXISTS public.trick_types (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    category TEXT, -- 'flip', 'grind', 'manual', 'grab', etc.
    difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5)
);

INSERT INTO public.trick_types (name, category, difficulty) VALUES
    ('Ollie', 'basic', 1),
    ('Kickflip', 'flip', 2),
    ('Heelflip', 'flip', 2),
    ('Pop Shove-it', 'flip', 2),
    ('Frontside 180', 'rotation', 2),
    ('Backside 180', 'rotation', 2),
    ('50-50 Grind', 'grind', 3),
    ('Boardslide', 'grind', 3),
    ('Lipslide', 'grind', 4),
    ('Treflip', 'flip', 4),
    ('Hardflip', 'flip', 4),
    ('Nollie Heelflip', 'flip', 4),
    ('Switch Kickflip', 'flip', 4),
    ('Varial Kickflip', 'flip', 3),
    ('360 Flip', 'flip', 5),
    ('Frontside Feeble', 'grind', 4),
    ('Backside Smith', 'grind', 4)
ON CONFLICT (name) DO NOTHING;

-- Grant permissions (adjust based on your Supabase auth setup)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
