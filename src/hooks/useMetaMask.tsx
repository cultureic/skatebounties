import { useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';

export interface UseMetaMaskReturn {
  isConnected: boolean;
  account: string | null;
  connect: () => Promise<void> | void;
  disconnect: () => Promise<void> | void;
  provider: any | null;
  isLoading: boolean;
}

export function useMetaMask(): UseMetaMaskReturn {
  const { authenticated, ready, user, login, logout } = usePrivy();
  const primaryWallet = (user?.linkedAccounts || []).find((a: any) => a.type === 'wallet');
  const account = (primaryWallet as any)?.address || null;

  return useMemo(
    () => ({
      isConnected: !!authenticated && !!account,
      account,
      connect: async () => { await login(); },
      disconnect: async () => { await logout(); },
      provider: null,
      isLoading: !ready,
    }),
    [authenticated, account, ready, login, logout],
  );
}
