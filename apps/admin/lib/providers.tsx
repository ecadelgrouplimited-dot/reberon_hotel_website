'use client';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import type { MeDTO, Permission } from '@reberon/contracts';
import { ApiError, get } from './api';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 20_000, refetchOnWindowFocus: true, retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2 },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="bottom-right" richColors closeButton toastOptions={{ className: 'font-sans' }} />
    </QueryClientProvider>
  );
}

const MeCtx = createContext<MeDTO | null>(null);

export function useMeQuery() {
  return useQuery({ queryKey: ['me'], queryFn: () => get<MeDTO>('/auth/me'), staleTime: 5 * 60_000 });
}

export function MeProvider({ me, children }: { me: MeDTO; children: ReactNode }) {
  return <MeCtx.Provider value={me}>{children}</MeCtx.Provider>;
}

export function useMe() {
  const me = useContext(MeCtx);
  if (!me) throw new Error('useMe outside MeProvider');
  return me;
}

export function useCan() {
  const me = useMe();
  return (p: Permission) => me.permissions.includes(p);
}
