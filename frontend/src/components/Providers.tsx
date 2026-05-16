"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "../lib/wagmi";
import { useState } from "react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#18181b', // zinc-900
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            },
            success: {
              iconTheme: {
                primary: '#10b981', // emerald-500
                secondary: '#fff',
              },
            },
          }}
        />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
