import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";
import { Navbar } from "../components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Refaktör — FaturaChain",
  description: "Türk KOBİ ihracat faturalarını tokenize eden Web3 faktoring platformu (Monad Testnet)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white min-h-screen flex flex-col relative`}
      >
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-black to-black -z-50 pointer-events-none" />
        <Providers>
          <Navbar />
          <main className="pt-20 flex-grow z-10">
            {children}
          </main>
          
          <footer className="border-t border-white/10 bg-black/50 backdrop-blur-md py-8 mt-12 z-10">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">R</span>
                </div>
                <span className="font-bold text-gray-300">Refaktör</span>
              </div>
              <p className="text-sm text-gray-500">
                &copy; {new Date().getFullYear()} Refaktör — FaturaChain. Tüm hakları saklıdır. Monad Testnet üzerinde çalışır.
              </p>
              <div className="flex gap-4 text-sm text-gray-400">
                <a href="#" className="hover:text-emerald-400 transition-colors">Kullanım Şartları</a>
                <a href="#" className="hover:text-emerald-400 transition-colors">Gizlilik</a>
                <a href="#" className="hover:text-emerald-400 transition-colors">Docs</a>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
