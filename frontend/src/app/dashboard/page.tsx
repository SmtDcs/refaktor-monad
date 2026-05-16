"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "../../components/GlassCard";
import { AnimatedButton } from "../../components/AnimatedButton";
import { UploadCloud, TrendingUp, FileText, CheckCircle2 } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { CONTRACTS, ABIS } from "../../lib/contracts";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { address } = useAccount();
  const [faceValue, setFaceValue] = useState("50000");
  const [totalShares, setTotalShares] = useState("500");
  const [buyerName, setBuyerName] = useState("Lidl GmbH");

  const { writeContract: writeMint, data: mintHash, isPending: isMintPending } = useWriteContract();
  const { isLoading: isMintConfirming, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({ hash: mintHash });

  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  useEffect(() => {
    if (isMintSuccess) toast.success("Fatura başarıyla mint edildi!");
  }, [isMintSuccess]);

  useEffect(() => {
    if (isApproveSuccess) toast.success("OrderBook'a yetki başarıyla verildi!");
  }, [isApproveSuccess]);

  const handleMint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return toast.error("Lütfen cüzdan bağlayın!");
    
    // faceValue is in USDC (6 decimals)
    const faceValue6Decimals = BigInt(Number(faceValue) * 1_000_000);
    // dueDate is unix timestamp for 30 days from now
    const dueDate = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);

    writeMint({
      address: CONTRACTS.InvoiceShares as `0x${string}`,
      abi: ABIS.InvoiceShares as any,
      functionName: "mintInvoice",
      args: [
        address, // seller receives the shares
        faceValue6Decimals,
        dueDate,
        BigInt(totalShares),
        buyerName,
        "USD",
        0 // Rating A
      ],
    });
  };

  const handleApprove = () => {
    writeApprove({
      address: CONTRACTS.InvoiceShares as `0x${string}`,
      abi: ABIS.InvoiceShares as any,
      functionName: "setApprovalForAll",
      args: [CONTRACTS.OrderBook as `0x${string}`, true],
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">KOBİ Paneli</h1>
          <p className="text-gray-400">Faturalarınızı yönetin ve yeni finansman yaratın.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GlassCard>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <UploadCloud className="text-emerald-400" /> Yeni Fatura Yükle (Mint)
          </h2>
          <form onSubmit={handleMint} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Fatura Bedeli (USDC)</label>
              <input 
                type="number" 
                value={faceValue}
                onChange={e => setFaceValue(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Hisse Adedi (Parça)</label>
              <input 
                type="number" 
                value={totalShares}
                onChange={e => setTotalShares(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Alıcı Firma Adı</label>
              <input 
                type="text" 
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500" 
              />
            </div>
            
            <AnimatedButton 
              type="submit" 
              className="w-full"
              disabled={isMintPending || isMintConfirming}
            >
              {isMintPending ? "Cüzdandan Onay Bekleniyor..." : isMintConfirming ? "Ağda İşleniyor..." : isMintSuccess ? "Başarıyla Mint Edildi!" : "Faturayı Mint Et (Blockchain)"}
            </AnimatedButton>
          </form>
        </GlassCard>

        <div className="space-y-8">
          <GlassCard className="bg-emerald-500/5 border-emerald-500/20">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" /> Satış Yetkisi Ver
            </h2>
            <p className="text-gray-400 mb-6">
              Mint ettiğiniz hisselerin Pazar Yeri'nde (OrderBook sözleşmesi) satılabilmesi için sisteme aktarım yetkisi vermelisiniz.
            </p>
            <AnimatedButton 
              onClick={handleApprove}
              variant="outline"
              className="w-full"
              disabled={isApprovePending || isApproveConfirming}
            >
              {isApprovePending ? "Cüzdandan Onay Bekleniyor..." : isApproveConfirming ? "Ağda İşleniyor..." : isApproveSuccess ? "Satış Yetkisi Verildi!" : "OrderBook'a Yetki Ver (Approve)"}
            </AnimatedButton>
          </GlassCard>

          <div className="grid grid-cols-2 gap-4">
            <GlassCard className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Mintlenen</p>
                <p className="text-2xl font-bold">1</p>
              </div>
            </GlassCard>
            <GlassCard className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Bekleyen</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
