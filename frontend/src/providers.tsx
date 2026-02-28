"use client";

import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { monadTestnet } from "@/config/chain";
import "@rainbow-me/rainbowkit/styles.css";

const config = getDefaultConfig({
  appName: "Bounty Duel Protocol",
  projectId: "b1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6", // get your own at cloud.walletconnect.com
  chains: [monadTestnet],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#836EF9",
            accentColorForeground: "white",
            borderRadius: "medium",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
