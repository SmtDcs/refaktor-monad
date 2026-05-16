"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { AnimatedButton } from "./AnimatedButton";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
            <span className="text-white font-bold">R</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Refaktör</span>
        </Link>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
            <Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>

          {isConnected ? (
            <AnimatedButton variant="secondary" onClick={() => disconnect()} className="py-2 px-4 text-sm">
              <Wallet className="w-4 h-4" />
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </AnimatedButton>
          ) : (
            <AnimatedButton onClick={() => connect({ connector: injected() })} className="py-2 px-4 text-sm">
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </AnimatedButton>
          )}
        </div>
      </div>
    </nav>
  );
}
