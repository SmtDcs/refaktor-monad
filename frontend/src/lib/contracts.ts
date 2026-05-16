import InvoiceSharesABI from "./abis/InvoiceShares.json";
import OrderBookABI from "./abis/OrderBook.json";
import MockUSDCABI from "./abis/MockUSDC.json";

// Monad Testnet deploy adresleri
export const CONTRACTS = {
  MockUSDC: "0x66c98244a1Ece2D8354CdA3e24683F62Dd67d2e1",
  InvoiceShares: "0x876adabBA1A0400a3aB6F90583d487c6c35633f7",
  InsurancePool: "0xC76A50Ae23E02CA7B4EAB50b0746077E68070F3a",
  Escrow: "0x89e70168BCe1D60Ea72eE91846e3112D2Ed82Da7",
  OrderBook: "0x9CA2b4868D31f821ebF04216c6a88A3267e965A8",
} as const;

export const ABIS = {
  InvoiceShares: InvoiceSharesABI,
  OrderBook: OrderBookABI,
  MockUSDC: MockUSDCABI,
} as const;

export const CHAIN_ID = 10143;
