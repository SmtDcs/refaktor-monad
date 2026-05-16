# Refaktör — FaturaChain (Monad Testnet) 🚀

Refaktör, Türk KOBİ'lerinin ihracat faturalarını tokenize ederek global likiditeye erişmelerini sağlayan, **Monad Testnet** üzerinde çalışan yeni nesil bir RWA (Real World Asset) ve faktoring platformudur.

## 🌟 Öne Çıkan Özellikler

- **Monad Native**: Yüksek performanslı Monad Testnet ağı üzerinde düşük maliyetli ve anlık işlemler.
- **Faturaların Tokenizasyonu**: İhracat faturalarının ERC-1155 standartlarında parçalı hisselere (Fractionalized Shares) dönüştürülmesi.
- **İkincil Pazar**: Yatırımcıların tokenize edilmiş fatura hisselerini alıp satabileceği merkeziyetsiz emir defteri (OrderBook).
- **Premium UI**: Framer Motion ve Tailwind v4 ile güçlendirilmiş, modern ve akıcı DeFi arayüzü.
- **Güvenli Settlement**: Alıcı ve satıcı arasındaki takasın akıllı sözleşmeler ile %100 güvenli şekilde gerçekleşmesi.

## 🛠 Teknoloji Yığını

### Akıllı Sözleşmeler (Solidity)
- **InvoiceShares (ERC-1155)**: Fatura hisselerinin basımı ve yönetimi.
- **OrderBook**: On-chain takas ve emir eşleştirme mantığı.
- **InsurancePool**: Yatırımcı koruması için yerleşik sigorta havuzu.
- **MockUSDC (ERC-20)**: Testnet üzerinde ödeme aracı olarak kullanılan stabil coin.

### Frontend (Next.js)
- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS v4, Lucide Icons
- **Animations**: Framer Motion
- **Web3**: Wagmi, Viem, TanStack Query

## 🚀 Hızlı Başlangıç

### Akıllı Sözleşmeler
```bash
# Bağımlılıkları kurun
npm install

# Derleme
npx hardhat compile

# Deploy (Monad Testnet)
npx hardhat run scripts/deploy.ts --network monadTestnet
```

### Frontend
```bash
cd frontend

# Bağımlılıkları kurun
npm install --legacy-peer-deps

# Çalıştırın
npm run dev
```

## 📄 Lisans
Bu proje MIT lisansı ile lisanslanmıştır.

---
*Bu proje bir hackathon kapsamında Monad Testnet geçişi yapılarak geliştirilmiştir.*
