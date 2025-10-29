'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/retro/map-explorer');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-asphalt">
      <div className="text-center">
        <h1 className="mb-4 font-heading text-4xl text-smoke">🛹 SkateBounties</h1>
        <p className="text-concrete">Loading...</p>
      </div>
    </div>
  );
}
