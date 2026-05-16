**Refaktör**

Türk KOBİ İhracat Faturalarını Açık Pazar Modeliyle Global Yatırımcılara Açan Web3 Platformu

MVP Dokümanı — Bi-Thongo Web3 Hackathon

Biruni Teknopark — 32 Saatlik Hackathon

Nisan 2026

_Factoring’in Web3 versiyonu — Açık pazar + ikincil piyasa ile fatura finansmanı_

# 1\. Problem

**Türkiye’de 1.87 trilyon TL’lik faktoring pazarı var.** KOBİ’lerin %99.6’sı vadeli fatura bekliyor, nakit sıkışıyor. Özellikle ihracat yapan KOBİ’ler 90-120 gün ödeme bekliyorlar. Mevcut çözümler ya çok pahalı, ya çok yavaş, ya da erişilemez.

## Mevcut Çözümlerin Eksikleri

**Mevcut Çözüm**

**Ne Yapıyor**

**Eksik**

**Banka Kredisi**

%40-45 faiz, 2 hafta süreç, teminat gerekli

Pahalı, yavaş, KOBİ erişemiyor

**Geleneksel Faktoring**

48 şirket + 32 banka, %15-20 kesinti

Sadece yurt içi, bireysel yatırımcı yok

**MFKS**

Çift finansmanı önlüyor, GİB entegrasyonu

Sadece lisanslı kurumlar, cross-border yok

**Figopara**

Bankalar arası teklif karşılaştırma

Bireysel yatırımcı yok, yurt dışı yok

**Huma/Arf (Web3)**

Cross-border tokenizasyon, 10B$ hacim

Finans kurumlarına satıyor, KOBİ giremez

**Polytrade (Web3)**

Fatura tokenizasyonu, 850M$ TVL, 3500 KOBİ

Aracı gerekli, Türkiye GİB entegrasyonu yok

# 2\. Çözüm: FaturaChain

Türk KOBİ’lerin ihracat faturalarını açık pazar modeliyle global yatırımcılara açan, aracısız bir Web3 platformu. Birincil piyasada fatura ilk kez satılır, ikincil piyasada token el değiştirir.

## Nasıl Çalışıyor — Ahmet Bey Örneği

Ahmet Bey’in Bursa’da tekstil fabrikası var. Almanya’daki Lidl’e 50.000€’luk kumaş sattı. Lidl 120 gün sonra ödeyecek.

**Adım**

**Ne Oluyor**

**Kim Yapıyor**

**Süre**

**1**

Fatura yükleniyor

KOBİ (Ahmet Bey)

2 dakika

**2**

GİB e-Fatura API + MFKS sorgusu ile doğrulama

Platform (otomatik)

30 saniye

**3**

Fatura 500 tokena bölünüyor (NFT)

Smart Contract

10 saniye

**4**

KOBİ satış fiyatını belirliyor (ask price)

KOBİ

1 dakika

**5**

Tokenler açık pazarda listeleniyor

Platform

Anlık

**6**

Yatırımcılar alış teklifi veriyor veya direkt alıyor

Global yatırımcılar

Sürekli açık

**7**

Eşleşen emirlerde token el değiştiriyor

Smart Contract (matching)

Anlık

**8**

KOBİ satılan tokenların USDC’sini alıyor

Smart Contract → KOBİ

Anlık

**9**

Yatırımcı isterse vade dolmadan ikincil piyasada satar

Yatırımcı → Yatırımcı

İstediği zaman

**10**

Vade dolunca Lidl ödüyor, token sahiplerine dağıtılıyor

Smart Contract

120 gün sonra

## Açık Pazar (Order Book) Modeli

Platform bir borsa gibi çalışıyor. KOBİ faturayı listeliyor (ask), yatırımcılar teklif veriyor (bid). Fiyatlar eşleştiğinde işlem gerçekleşiyor. İki piyasa katmanı var:

**Birincil Piyasa:** KOBİ faturayı ilk kez listeliyor. Token başına fiyat belirliyor (ör. 95€). Yatırımcılar bu fiyattan alıyor veya daha düşük teklif veriyor. Fiyat eşleşince token el değiştiriyor.

**İkincil Piyasa:** Tokenı alan yatırımcı, vade dolmadan başka birine satabilir. Örnek: Hans 60. günde nakde ihtiyacı olursa tokenını 97.5€’ya satar. Alan kişi kalan 60 günde 97.5 → 100€ getiri elde eder.

## Order Book Örneği — Ahmet Bey’in Faturası

50.000€ fatura, 500 token, nominal değer: 100€/token. Ahmet Bey satış fiyatını 95€ olarak belirledi.

**Alış Teklifleri (Bid) — Yatırımcılar**

**Satış Teklifleri (Ask) — KOBİ**

95.8€ x 120 token — Hans, Berlin

95.0€ x 500 token — Ahmet Bey (birincil)

95.2€ x 200 token — Sara, Dubai

97.5€ x 80 token — Mehmet (ıkincil, 60 gün sonra)

94.0€ x 300 token — Mehmet, İstanbul

98.0€ x 50 token — Sara (ıkincil, 90 gün sonra)

**Eşleşme:** Hans’ın 95.8€ teklifi, Ahmet Bey’in 95€ askının üzerinde → 120 token anlık el değiştiriyor. Sara’nın 95.2€ teklifi de eşleşiyor → 200 token daha. Mehmet’in 94€ teklifi askın altında → bekliyor, Ahmet Bey kabul ederse eşleşir.

**Ahmet Bey’in aldığı:** 320 token satıldı (120 x 95.8 + 200 x 95.2) = 30.536€ anlık cebinde. Kalan 180 token hala pazarda, daha fazla yatırımcı geldiğinde satılacak.

## Neden Açık Pazar?

*   Sürekli likidite — yatırımcı istediği zaman girip çıkabilir, artırma süresi beklemiyor
*   İkincil piyasa — token vade dolmadan alınıp satılabilir, yatırımcı kilitlenmiyor
*   Gerçek fiyat keşfi — arz ve talep dengeye gelir, piyasa kendi fiyatını bulur
*   Daha fazla işlem hacmi — her alım-satımdan komisyon, platform daha çok kazanır
*   Kısmi satış — KOBİ 500 tokenin 300’ünü hemen satar, kalan 200’ü daha iyi fiyat bekliyorsa tutar

# 3\. Risk Yönetimi

Faturanın ödenmeme riskini sıfıra indiremeyiz ama katmanlı koruma ile minimize ederiz. Platform garanti veren değil, riski doğru fiyatlayan bir mekanizmadır.

**Katman**

**Açıklama**

**Öncellik**

**Alıcı Seçimi**

Sadece büyük kurumsal alıcılar (Lidl, Zara, Bosch). Küçük firma faturaları kabul edilmiyor.

MVP’de var

**Kredi Skorlama**

Alıcıya A/B/C/D rating. Geçmiş ödeme davranışı, şirket büyüklüğü, ülke riski.

MVP’de var

**Overcollateralization**

Faturanın %80-85’i tokenize. %15-20 tampon.

MVP’de var

**Sigorta Havuzu**

Her işlemden %0.5 sigorta havuzuna. Ödenmezse buradan tazminat.

MVP’de var

**Smart Contract Escrow**

Para smart contract’ta kilitli. Kod karar veriyor, insan müdahalesi yok.

MVP’de var

**Geç Ödeme Faizi**

Vade geçtikten sonra günlük ceza faizi.

MVP’de var

# 4\. Teknik Mimari (32 Saat MVP)

## Teknoloji Seçimleri

**Katman**

**Teknoloji**

**Neden**

**Blockchain**

Polygon (testnet)

Düşük gas, hızlı, EVM uyumlu

**Smart Contract**

Solidity + Hardhat

En yaygın, en çok kaynak

**Frontend**

React + ethers.js + MetaMask

Hızlı geliştirme, wallet bağlantısı

**Backend**

Node.js + Express

GİB API, off-chain order book

**Stablecoin**

USDC (testnet mock)

En yaygın, Circle destekli

**Veritabanı**

MongoDB / Firebase

Off-chain order book, metadata

## Smart Contract Yapısı

**Contract**

**Görevi**

**Durum**

**InvoiceNFT.sol**

ERC-721 — faturayı NFT olarak mint eder, metadata (tutar, vade, alıcı, rating)

MVP çekirdek

**OrderBook.sol**

Açık pazar — bid/ask emirlerini alır, eşleştirir, tokenları transfer eder

MVP çekirdek

**Escrow.sol**

USDC’yi kilitler, KOBİ’ye dağıtır, vade dolunca geri ödemeyi yönetir

MVP çekirdek

**InsurancePool.sol**

Komisyonlardan sigorta havuzu biriktirir, default durumunda tazminat

MVP basit

**MockUSDC.sol**

Test ağında USDC simülasyonu

Sadece demo

## Order Book Mimarisi

**Hibrit yaklaşım:** Order book off-chain (hız için), settlement on-chain (güvenlik için). Yatırımcı teklif verdiğinde emir backend’de eşleştirilir, eşleşen emirler smart contract üzerinden settle edilir. Bu model büyük DEX’lerin (dYdX, Serum) kullandığı standarttır.

*   Bid (alış): Yatırımcı “95.5€’dan 50 token almak istiyorum”
*   Ask (satış): KOBİ “95€’dan 500 token satmak istiyorum” veya yatırımcı ikincil satış
*   Match: bid >= ask ise eşleşme olur, smart contract tokenı ve USDC’yi takas eder
*   Partial fill: 500 tokenden 320’si satılabilir, kalanı pazarda beklemeye devam eder

## 32 Saat Zaman Planı

**Saat**

**Görev**

**Kim**

**0-2**

Proje kurulumu, repo, Hardhat init, React boilerplate

Tüm takım

**2-8**

InvoiceNFT.sol + Escrow.sol yazma ve test

Smart Contract dev

**2-8**

Frontend: wallet bağlantı, fatura yükleme UI

Frontend dev

**8-14**

OrderBook.sol (basitleştirilmiş matching) + InsurancePool.sol

Smart Contract dev

**8-14**

Marketplace UI: order book görüntüleme, bid/ask verme

Frontend dev

**14-20**

Backend: off-chain order matching, GİB mock API, kredi skoru

Backend dev

**14-20**

Frontend-contract entegrasyonu, ikincil piyasa UI

Frontend dev

**20-26**

Test, bug fix, edge case, demo hazırlık

Tüm takım

**26-30**

Demo senaryosu, canlı alım-satım testi

Tüm takım

**30-32**

Pitch deck, sunum provaları

Sunum yapacak kişi

# 5\. Gelir Modeli

**Gelir Kaynağı**

**Açıklama**

**Oran**

**Birincil Satış Komisyonu**

KOBİ faturası ilk kez satıldığında

%1-2

**İkincil Piyasa Komisyonu**

Tokenların ikincil piyasada her el değiştirmesinden

%0.25

**Sigorta Payı**

Sigorta havuzuna aktarılan kısım

%0.5

**Premium Abonelik**

KOBİ’ler için gelişmiş analitik, öncelikli listeleme

Aylık ücret

**Listing Fee**

Fatura listeleme ücreti (opsiyonel, düşük tutarlı)

Sabit ücret

**Örnek:** 50.000€ fatura birincil satışta %1.5 = 705€. Aynı tokenlar ikincil piyasada 3 kez el değiştirirse: 3 x 50.000 x %0.25 = 375€. Tek faturadan toplam platform geliri = 1.080€ + sigorta payı.

# 6\. Rakiplerden Farkımız

**Özellik**

**FaturaChain**

**Polytrade**

**Huma/Arf**

**Gelen. Fakt.**

**KOBİ doğrudan erişir**

Evet

Hayır

Hayır

Evet

**Açık pazar + ikincil piyasa**

Evet

Kısmen

Hayır

Hayır

**Cross-border**

Evet

Kısmen

Evet

Pahalı/yavaş

**GİB e-Fatura entegrasyonu**

Evet

Yok

Yok

Yok

**Fraksiyonel yatırım (100€)**

Evet

Evet

Hayır

Hayır

**Stablecoin ödeme**

USDC

Evet

USDC

Hayır

# 7\. Yol Haritası

## Phase 1 — MVP (Hackathon, 32 saat)

*   Açık pazar modeli ile fatura tokenizasyonu ve satış
*   Basitleştirilmiş order book (bid/ask eşleştirme)
*   GİB e-Fatura doğrulama (mock API)
*   Smart contract escrow + otomatik dağıtım
*   Sigorta havuzu (basit versiyon)
*   Polygon testnet üzerinde çalışan demo

## Phase 2 — Beta (3-6 Ay)

*   Gerçek GİB e-Fatura API + MFKS entegrasyonu
*   Tam ikincil piyasa (limit order, market order, order history)
*   AI destekli kredi skorlama
*   KYC/AML entegrasyonu
*   Fiat on/off ramp (TL/EUR direkt alım-satım)
*   Mobil uygulama
*   Fatura bundling (birden fazla faturayı paketleme)
*   Otomatik yatırım (kriter bazlı otomatik bid)
*   Chainlink Oracle (döviz kuru, alıcı verisi)

## Phase 3 — Ölçeklendirme (6-12 Ay)

*   BDDK/SPK lisanslama süreci
*   Mainnet geçiş (gerçek USDC/USDT)
*   Multi-chain destek (Arbitrum, Base, Solana)
*   Farklı ülkelere açılma (AB e-Rechnung standartları)
*   DAO yönetimi
*   Yield farming (sigorta havuzuna stake)
*   API marketplace (ERP/muhasebe entegrasyonu)
*   Yeşil fatura (ESG skorlu KOBİ’lere düşük komisyon)
*   Dispute resolution (merkeziyetsiz tahkim)
*   TÜBİTAK 1512 + teknopark kuluçka başvurusu

# 8\. Eklenebilecek Ekstra Özellikler

**Özellik**

**Açıklama**

**Zorluk**

**Faz**

**Limit + Market Order**

Yatırımcı sabit fiyattan (limit) veya en iyi fiyattan (market) alabilir.

Orta

Phase 2

**Order History + Charts**

Geçmiş işlem grafikleri, fiyat hareketi, hacim.

Orta

Phase 2

**AI Kredi Skorlama**

Alıcı firmanın geçmiş verilerini analiz eden ML modeli.

Orta

Phase 2

**Fatura Bundling**

Birden fazla faturayı paket halinde sat. Risk dağılımı.

Orta

Phase 2

**Otomatik Bid**

Kriter belirle (rating A, min %5), sistem otomatik teklif verir.

Orta

Phase 2

**Fiat On/Off Ramp**

TL/EUR ile direkt alım-satım. Kripto bilmeyen KOBİ’ler için.

Yüksek

Phase 2

**Mobil Uygulama**

KOBİ fatura yükleme + yatırımcı teklif verme native app.

Yüksek

Phase 2

**Chainlink Oracle**

Gerçek zamanlı döviz kuru, alıcı firma verisi.

Orta

Phase 2

**Multi-chain**

Polygon dışında Arbitrum, Base, Solana desteği.

Yüksek

Phase 3

**DAO Yönetimi**

Platform kararlarını token sahipleri oylama ile alır.

Yüksek

Phase 3

**Yield Farming**

Sigorta havuzuna stake edenlere ek getiri.

Orta

Phase 3

**API Marketplace**

Üçüncü parti ERP/muhasebe yazılımları entegrasyonu.

Orta

Phase 3

**Yeşil Fatura**

Sürdürülebilir KOBİ’lere düşük komisyon, ESG skoru.

Düşük

Phase 3

**Cross-chain Bridge**

Farklı zincirlerdeki yatırımcılar aynı faturaya teklif verir.

Yüksek

Phase 3

**Dispute Resolution**

Fatura ihtilafında merkeziyetsiz tahkim (Kleros benzeri).

Yüksek

Phase 3

# 9\. Jüriye Pitch Stratejisi

**Açılış (30sn):** “Türkiye’de 1.87 trilyon TL’lik faktoring pazarı var. Her yıl 100 milyar TL’lik ihracat faturası haftalarca bekliyor.”

**Problem (1dk):** Ahmet Bey hikayesi — somut, duygusal, anlaşılır.

**Çözüm (2dk):** Canlı demo — fatura yükle, order book’a listele, yatırımcı bid versin, eşleşme olsun, KOBİ parasını alsın. Sonra ikincil satış göster.

**Neden Web3 (1dk):** İki farklı ülke, iki farklı hukuk, iki farklı para — smart contract tarafsız hakem. İkincil piyasa ile yatırımcı kilitlenmiyor.

**Pazar (30sn):** Huma Finance 10B$ işlem, Polytrade 850M$ TVL. Pazar kanıtlanmış.

**Gelir (30sn):** Birincil %1.5 + ikincil %0.25 + sigorta %0.5. İkincil piyasa gelir çarpanı.

**Kapanış (30sn):** OVP ihracat hedefiyle uyumlu. TÜBİTAK 1512’ye hazır. Teknopark kuluçkaya aday.