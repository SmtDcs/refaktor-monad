"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, BarChart3 } from "lucide-react";
import { AnimatedButton } from "../components/AnimatedButton";
import { GlassCard } from "../components/GlassCard";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[128px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-[128px] -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-4xl mx-auto mt-20"
      >
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight mb-8">
          Faturalarını <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
            Hızla Nakde Çevir
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Türkiye'nin ilk KOBİ ihracat faturası tokenize etme platformu. 
          Geleneksel bankaları bekleme, global yatırımcılardan anında fon bul.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Link href="/dashboard">
            <AnimatedButton className="w-full sm:w-auto px-8 py-4 text-lg">
              Fatura Yükle <ArrowRight className="w-5 h-5 ml-2" />
            </AnimatedButton>
          </Link>
          <Link href="/marketplace">
            <AnimatedButton variant="outline" className="w-full sm:w-auto px-8 py-4 text-lg">
              Yatırım Yap
            </AnimatedButton>
          </Link>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-8 mt-32 mb-20 w-full max-w-6xl">
        <GlassCard>
          <Zap className="w-10 h-10 text-emerald-400 mb-4" />
          <h3 className="text-xl font-bold mb-2">Anında Finansman</h3>
          <p className="text-gray-400">Günlerce onay beklemeden, faturalarınızı doğrudan Monad ağında akıllı sözleşmeler ile satın.</p>
        </GlassCard>
        <GlassCard>
          <ShieldCheck className="w-10 h-10 text-emerald-400 mb-4" />
          <h3 className="text-xl font-bold mb-2">%100 Güvenli Sigorta</h3>
          <p className="text-gray-400">Yerleşik sigorta havuzu (Insurance Pool) sayesinde yatırımcılar temerrüt riskine karşı korunur.</p>
        </GlassCard>
        <GlassCard>
          <BarChart3 className="w-10 h-10 text-emerald-400 mb-4" />
          <h3 className="text-xl font-bold mb-2">İkincil Pazar</h3>
          <p className="text-gray-400">Aldığınız faturayı vade sonunu beklemeden ikincil piyasada anında nakde çevirebilirsiniz.</p>
        </GlassCard>
      </div>
    </div>
  );
}
