"use client";

import { GlassCard } from "../../components/GlassCard";
import { AnimatedButton } from "../../components/AnimatedButton";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Search, ShieldAlert, CheckCircle2, WalletCards, TrendingUp, Activity, Filter, BarChart3 } from "lucide-react";
import { useAccount, useReadContracts, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, ABIS } from "../../lib/contracts";
import toast from "react-hot-toast";

const formatUSDC = (val: bigint) => `$${(Number(val) / 1_000_000).toLocaleString()}`;

function InvoiceCard({ invoice, invoiceId, index }: { invoice: any; invoiceId: bigint; index: number }) {
  const { address } = useAccount();
  const [qtyToBuy, setQtyToBuy] = useState(1);

  const { data: availableSharesData, refetch } = useReadContract({
    address: CONTRACTS.InvoiceShares as `0x${string}`,
    abi: ABIS.InvoiceShares as any,
    functionName: "balanceOf",
    args: [invoice.originalSeller, invoiceId],
  });

  const availableShares = availableSharesData !== undefined ? Number(availableSharesData) : 0;
  const pricePerShare = 95n * 1_000_000n; // Hardcoded demo price: 95 USDC
  const totalCost = BigInt(qtyToBuy) * pricePerShare;

  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  const { writeContract: writeMatch, data: matchHash, isPending: isMatchPending } = useWriteContract();
  const { isSuccess: isMatchSuccess } = useWaitForTransactionReceipt({ hash: matchHash });

  useEffect(() => {
    if (isMatchSuccess) {
      toast.success(`${qtyToBuy} adet hisse başarıyla satın alındı!`);
      refetch(); // Kalan hisseleri güncelle
    }
  }, [isMatchSuccess]);

  const handleBuy = async () => {
    if (!address) {
      toast.error("Lütfen sağ üstten cüzdanınızı bağlayın.");
      return;
    }
    
    if (isApproveSuccess) {
      const loadingToast = toast.loading("Satın alma işlemi blockchain'e işleniyor...");
      try {
        writeMatch({
          address: CONTRACTS.OrderBook as `0x${string}`,
          abi: ABIS.OrderBook as any,
          functionName: "executeMatch",
          args: [invoiceId, invoice.originalSeller, address, BigInt(qtyToBuy), pricePerShare],
        }, {
          onSuccess: () => toast.dismiss(loadingToast),
          onError: () => { toast.dismiss(loadingToast); toast.error("İşlem reddedildi."); }
        });
      } catch (e) {
        toast.dismiss(loadingToast);
      }
    } else {
      const loadingToast = toast.loading("USDC harcama onayı bekleniyor...");
      try {
        writeApprove({
          address: CONTRACTS.MockUSDC as `0x${string}`,
          abi: ABIS.MockUSDC as any,
          functionName: "approve",
          args: [CONTRACTS.OrderBook as `0x${string}`, totalCost],
        }, {
          onSuccess: () => {
            toast.dismiss(loadingToast);
            toast.success("Onay verildi! Lütfen satın alma işlemini tamamlamak için TEKRAR butona basın.", { duration: 5000 });
          },
          onError: () => { toast.dismiss(loadingToast); toast.error("Onay reddedildi."); }
        });
      } catch(e) {
        toast.dismiss(loadingToast);
      }
    }
  };

  const isRepaid = invoice.status === 2; // Repaid
  const progressPercent = ((Number(invoice.totalShares) - availableShares) / Number(invoice.totalShares)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <GlassCard className="flex flex-col h-full hover:border-emerald-500/50 transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] group relative overflow-hidden">
        {availableShares === 0 && !isRepaid && (
          <div className="absolute top-4 right-[-35px] bg-red-500 text-white text-[10px] font-bold px-10 py-1 rotate-45 shadow-lg z-10">
            TÜKENDİ
          </div>
        )}

        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg">
              {invoice.buyerName.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors">Invoice #{Number(invoiceId)}</h3>
              <p className="text-sm text-gray-400">Alıcı: <span className="text-gray-300 font-medium">{invoice.buyerName}</span></p>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full border text-xs font-bold text-emerald-400 bg-emerald-400/10 border-emerald-400/20 flex items-center gap-1 shadow-inner">
            <CheckCircle2 className="w-3 h-3"/> Rating: A
          </div>
        </div>

        <div className="space-y-5 flex-grow">
          <div className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-black/60 to-black/40 border border-white/5 shadow-inner">
            <span className="text-gray-400 text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4"/> Fatura Bedeli</span>
            <span className="font-bold text-lg text-white">{formatUSDC(invoice.faceValue)}</span>
          </div>
          
          <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400 font-medium">Satılabilir Hisseler</span>
              <span className="text-emerald-400 font-bold">{availableShares} <span className="text-gray-500 font-normal">/ {invoice.totalShares.toString()}</span></span>
            </div>
            <div className="w-full bg-black/50 rounded-full h-2.5 overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000 ease-out relative" 
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs mt-2 text-gray-500">
              <span>%0</span>
              <span>%{progressPercent.toFixed(0)} Satıldı</span>
              <span>%100</span>
            </div>
          </div>

          <div className="flex justify-between text-sm px-2">
            <span className="text-gray-400">Vade Tarihi</span>
            <span className="text-white font-medium">{new Date(Number(invoice.dueDate) * 1000).toLocaleDateString("tr-TR")}</span>
          </div>

          {availableShares > 0 && !isRepaid && (
            <div className="pt-4 border-t border-white/10 mt-auto">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-400">Alınacak Miktar:</span>
                <div className="bg-black/50 px-3 py-1 rounded-lg border border-white/10">
                  <span className="font-bold text-emerald-400 text-lg">{qtyToBuy}</span> <span className="text-xs text-gray-500">Parça</span>
                </div>
              </div>
              <input 
                type="range" 
                min="1" 
                max={availableShares} 
                value={qtyToBuy} 
                onChange={(e) => setQtyToBuy(Number(e.target.value))}
                className="w-full h-2 bg-black/50 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all mb-4"
              />
              <div className="flex justify-between items-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <span className="text-sm text-emerald-100/70">Toplam Ödenecek</span>
                <span className="font-bold text-xl text-emerald-400">${qtyToBuy * 95}</span>
              </div>
            </div>
          )}
        </div>

        <AnimatedButton 
          className="w-full mt-6 py-4 text-sm tracking-wide"
          disabled={isRepaid || availableShares === 0 || isApprovePending || isMatchPending}
          onClick={handleBuy}
        >
          {isApprovePending ? "Cüzdan Onayı Bekleniyor..." :
           isMatchPending ? "Satın Alınıyor..." :
           isRepaid ? "Vadesi Doldu / Ödendi" : 
           availableShares === 0 ? "Tümü Satıldı" :
           isApproveSuccess ? "Satın Alımı Tamamla" : 
           "Yatırım Yap (Satın Al)"}
        </AnimatedButton>
      </GlassCard>
    </motion.div>
  );
}

export default function Marketplace() {
  const { address } = useAccount();

  // Fetch up to 6 invoices
  const invoiceIds = [1n, 2n, 3n, 4n, 5n, 6n];
  const { data: invoicesData, isLoading } = useReadContracts({
    contracts: invoiceIds.map(id => ({
      address: CONTRACTS.InvoiceShares as `0x${string}`,
      abi: ABIS.InvoiceShares as any,
      functionName: "getInvoice",
      args: [id],
    })),
  });

  const { writeContract: writeMintUSDC, isPending: isMintUSDCPending } = useWriteContract();

  const handleMintUSDC = () => {
    if (!address) {
      toast.error("Lütfen cüzdan bağlayın!");
      return;
    }
    const loadingToast = toast.loading("100,000 USDC cüzdanınıza basılıyor...");
    try {
      writeMintUSDC({
        address: CONTRACTS.MockUSDC as `0x${string}`,
        abi: ABIS.MockUSDC as any,
        functionName: "mint",
        args: [address, BigInt(100000 * 1_000_000)], // 100k USDC
      }, {
        onSuccess: () => {
          toast.dismiss(loadingToast);
          toast.success("100,000 Test USDC cüzdanınıza başarıyla eklendi! 🎉");
        },
        onError: () => {
          toast.dismiss(loadingToast);
          toast.error("USDC alma işlemi başarısız oldu.");
        }
      });
    } catch(e) {
      toast.dismiss(loadingToast);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Hero / Header Section */}
      <div className="relative rounded-3xl overflow-hidden mb-12 border border-white/10 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/40 via-teal-900/40 to-black/80 z-0" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 z-0" />
        
        <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row justify-between items-center gap-8 backdrop-blur-sm">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold mb-6 tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE ON MONAD TESTNET
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-4 tracking-tight text-white drop-shadow-lg">
              Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">Pazar Yeri</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Yüksek getirili, %100 sigortalı Türk KOBİ ihracat faturalarına global olarak yatırım yapın. Riskleri minimize edin, getiriyi maksimize edin.
            </p>
            <div className="flex gap-4">
              {/* Test USDC butonu kaldırıldı */}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-black/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
              <TrendingUp className="text-emerald-400 w-8 h-8 mb-2" />
              <div className="text-gray-400 text-sm mb-1">Toplam Hacim</div>
              <div className="text-2xl font-bold text-white">$24.5M+</div>
            </div>
            <div className="bg-black/50 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
              <Activity className="text-teal-400 w-8 h-8 mb-2" />
              <div className="text-gray-400 text-sm mb-1">Ortalama Getiri</div>
              <div className="text-2xl font-bold text-white">%12.4 APY</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-emerald-500" /> Yatırıma Açık Fırsatlar
        </h2>
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Firma ara..." 
              className="w-full md:w-64 bg-black/40 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-full p-2 px-4 flex items-center gap-2 text-sm text-gray-300 transition-colors">
            <Filter className="w-4 h-4" /> Filtrele
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            <span className="text-emerald-400 font-medium animate-pulse">Sözleşmeler Taranıyor...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {invoicesData?.map((res, i) => {
            const invoice = res.result as any;
            if (!invoice || invoice.faceValue === 0n) return null; // Not minted yet
            return <InvoiceCard key={i} invoice={invoice} invoiceId={BigInt(i + 1)} index={i} />;
          })}
        </div>
      )}

      {/* Decorative Bottom Glow */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
    </div>
  );
}
