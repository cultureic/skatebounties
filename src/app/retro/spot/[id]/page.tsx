'use client';

import { use } from 'react';
import { useSpot } from '@/hooks/useSpots';
import { useSpotBounties } from '@/hooks/useBounties';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Button from '@/components/ui/button';
import { MdArrowBack, MdLocationOn, MdAdd, MdStar } from 'react-icons/md';
import routes from '@/config/routes';
import { ethers } from 'ethers';

interface SpotDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SpotDetailPage({ params }: SpotDetailPageProps) {
  const { id } = use(params);
  const { data: spot, isLoading, error } = useSpot(id);
  const { data: bounties = [] } = useSpotBounties(id);
  const [showBountyModal, setShowBountyModal] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-asphalt">
        <div className="text-smoke">Loading spot...</div>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-asphalt">
        <div className="text-center">
          <p className="mb-4 text-red-400">Spot not found</p>
          <Link href={routes.mapExplorer}>
            <Button>Back to Map</Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeBounties = bounties.filter((b: any) => b.is_active);
  const completedBounties = bounties.filter((b: any) => !b.is_active);

  return (
    <div className="min-h-screen bg-asphalt pb-20">
      {/* Header */}
      <div className="border-b border-concrete/20 bg-asphalt/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={routes.mapExplorer}
            className="inline-flex items-center text-concrete hover:text-smoke"
          >
            <MdArrowBack className="mr-2" />
            Back to Map
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Media & Info */}
          <div className="lg:col-span-2">
            {/* Photo Carousel */}
            {spot.photos && spot.photos.length > 0 ? (
              <div className="mb-6 overflow-hidden rounded-xl bg-concrete/10">
                <Swiper
                  modules={[Navigation, Pagination]}
                  navigation
                  pagination={{ clickable: true }}
                  className="h-[400px]"
                >
                  {spot.photos.map((photo: string, idx: number) => (
                    <SwiperSlide key={idx}>
                      <div className="relative h-full w-full">
                        <Image
                          src={photo}
                          alt={`${spot.title} - ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            ) : (
              <div className="mb-6 flex h-[400px] items-center justify-center rounded-xl bg-concrete/10">
                <p className="text-concrete">No photos yet</p>
              </div>
            )}

            {/* Spot Info */}
            <div className="rounded-xl bg-concrete/5 p-6">
              <h1 className="mb-2 font-heading text-4xl text-smoke">
                {spot.title}
              </h1>

              {spot.address && (
                <div className="mb-4 flex items-center text-concrete">
                  <MdLocationOn className="mr-2" />
                  <span>{spot.address}</span>
                </div>
              )}

              {spot.description && (
                <p className="mb-6 text-concrete">{spot.description}</p>
              )}

              {/* Spot Attributes */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {spot.difficulty && (
                  <div className="rounded-lg bg-asphalt/50 p-4">
                    <p className="mb-1 text-xs text-concrete">Difficulty</p>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <MdStar
                          key={i}
                          className={
                            i < spot.difficulty
                              ? 'text-signal-orange'
                              : 'text-concrete/30'
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}

                {spot.spot_type && (
                  <div className="rounded-lg bg-asphalt/50 p-4">
                    <p className="mb-1 text-xs text-concrete">Type</p>
                    <p className="font-bold capitalize text-smoke">
                      {spot.spot_type}
                    </p>
                  </div>
                )}

                {spot.surface_type && (
                  <div className="rounded-lg bg-asphalt/50 p-4">
                    <p className="mb-1 text-xs text-concrete">Surface</p>
                    <p className="font-bold capitalize text-smoke">
                      {spot.surface_type}
                    </p>
                  </div>
                )}

                {spot.accessibility && (
                  <div className="rounded-lg bg-asphalt/50 p-4">
                    <p className="mb-1 text-xs text-concrete">Access</p>
                    <p className="font-bold capitalize text-smoke">
                      {spot.accessibility}
                    </p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="mt-6 flex items-center gap-6 text-sm text-concrete">
                <span>👁️ {spot.views_count} views</span>
                <span>💰 {spot.bounties_count} bounties</span>
                <span>🎥 {spot.submissions_count} submissions</span>
              </div>
            </div>
          </div>

          {/* Right Column - Bounties */}
          <div>
            <div className="sticky top-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-2xl text-smoke">Bounties</h2>
                <Button
                  onClick={() => setShowBountyModal(true)}
                  size="small"
                  className="bg-signal-orange"
                >
                  <MdAdd className="mr-1" />
                  Add Bounty
                </Button>
              </div>

              {/* Active Bounties */}
              {activeBounties.length > 0 ? (
                <div className="space-y-4">
                  {activeBounties.map((bounty: any) => (
                    <div
                      key={bounty.id}
                      className="rounded-xl bg-concrete/5 p-4 transition-all hover:bg-concrete/10"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="font-heading text-lg text-smoke">
                          {bounty.trick_name}
                        </h3>
                        <span className="rounded bg-electric-cyan/20 px-2 py-1 text-xs font-bold text-electric-cyan">
                          Active
                        </span>
                      </div>

                      {bounty.description && (
                        <p className="mb-3 text-sm text-concrete">
                          {bounty.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-concrete">Reward</p>
                          <p className="font-bold text-signal-orange">
                            {bounty.reward_amount}{' '}
                            {bounty.reward_token === ethers.constants.AddressZero
                              ? 'CELO'
                              : 'cUSD'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-concrete">Votes Needed</p>
                          <p className="font-bold text-smoke">
                            {bounty.votes_required}
                          </p>
                        </div>
                      </div>

                      {bounty.submissions && bounty.submissions.length > 0 && (
                        <div className="mt-3 border-t border-concrete/20 pt-3">
                          <p className="text-xs text-concrete">
                            {bounty.submissions.length} submission(s)
                          </p>
                        </div>
                      )}

                      <Button
                        size="small"
                        className="mt-3 w-full bg-signal-orange"
                      >
                        Submit Trick
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-concrete/5 p-8 text-center">
                  <p className="mb-4 text-concrete">
                    No active bounties yet
                  </p>
                  <Button
                    onClick={() => setShowBountyModal(true)}
                    className="bg-signal-orange"
                  >
                    Create First Bounty
                  </Button>
                </div>
              )}

              {/* Completed Bounties */}
              {completedBounties.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-4 font-heading text-xl text-concrete">
                    Completed
                  </h3>
                  <div className="space-y-2">
                    {completedBounties.map((bounty: any) => (
                      <div
                        key={bounty.id}
                        className="rounded-lg bg-concrete/5 p-3 opacity-60"
                      >
                        <p className="text-sm text-smoke">
                          {bounty.trick_name}
                        </p>
                        <p className="text-xs text-concrete">
                          ✓ Completed by {bounty.winner?.username || 'Anonymous'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Bounty Modal */}
      {showBountyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative max-w-lg rounded-xl bg-asphalt p-6 shadow-2xl">
            <button
              onClick={() => setShowBountyModal(false)}
              className="absolute right-4 top-4 text-concrete hover:text-smoke"
            >
              ✕
            </button>
            <h2 className="mb-4 font-heading text-2xl text-smoke">
              Create Bounty
            </h2>
            <p className="text-concrete">Coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
}
