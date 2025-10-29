'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import routes from '@/config/routes';

export default function IndexPageRetro() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to SkateBounties map explorer
    router.push(routes.mapExplorer);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-asphalt">
      <div className="text-center">
        <h1 className="mb-4 font-heading text-4xl text-smoke">🛹 SkateBounties</h1>
        <p className="text-concrete">Loading map...</p>
      </div>
    </div>
  );
}
