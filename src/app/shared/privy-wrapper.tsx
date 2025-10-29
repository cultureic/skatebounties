"use client";
import { PrivyProvider } from '@privy-io/react-auth';

export default function PrivyWrapper({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    // Render without Privy when APP ID is not set (build-safe)
    return <>{children}</>;
  }
  return (
    <PrivyProvider appId={appId}>
      {children}
    </PrivyProvider>
  );
}
