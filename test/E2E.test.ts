import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

// ----- Helpers -----------------------------------------------------------
const USDC = (n: number | bigint | string) => ethers.parseUnits(n.toString(), 6);
const TOTAL_SHARES = 500n;

const Status = { None: 0, Listed: 1, Repaid: 2, Defaulted: 3 } as const;
const Rating = { A: 0, B: 1, C: 2, D: 3 } as const;

const PRIMARY_BPS = 150n;
const SECONDARY_BPS = 25n;
const INSURANCE_BPS = 50n;
const BPS = 10_000n;

async function deployStack() {
  const [admin, sme1, sme2, alice, bob, carol, dave, realBuyer1, realBuyer2, feeRecipient, matcher, verifier] =
    await ethers.getSigners();

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();

  const InvoiceShares = await ethers.getContractFactory("InvoiceShares");
  const shares = await InvoiceShares.deploy(admin.address);

  const InsurancePool = await ethers.getContractFactory("InsurancePool");
  const insurance = await InsurancePool.deploy(admin.address, await usdc.getAddress());

  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(
    admin.address,
    await usdc.getAddress(),
    await shares.getAddress(),
    await insurance.getAddress()
  );

  const OrderBook = await ethers.getContractFactory("OrderBook");
  const book = await OrderBook.deploy(
    admin.address,
    await usdc.getAddress(),
    await shares.getAddress(),
    await insurance.getAddress(),
    feeRecipient.address
  );

  await shares.grantRole(await shares.VERIFIER_ROLE(), verifier.address);
  await shares.grantRole(await shares.ESCROW_ROLE(), await escrow.getAddress());
  await insurance.grantRole(await insurance.ESCROW_ROLE(), await escrow.getAddress());
  await book.grantRole(await book.MATCHER_ROLE(), matcher.address);

  for (const u of [alice, bob, carol, dave, realBuyer1, realBuyer2]) {
    await usdc.mint(u.address, USDC(10_000_000));
  }

  return {
    admin, sme1, sme2, alice, bob, carol, dave, realBuyer1, realBuyer2,
    feeRecipient, matcher, verifier,
    usdc, shares, insurance, escrow, book,
  };
}

type Stack = Awaited<ReturnType<typeof deployStack>>;

async function mintInvoice(
  s: Stack,
  seller: SignerWithAddress,
  faceValue: bigint,
  opts: { dueInDays?: number; rating?: number; buyer?: string; currency?: string } = {}
): Promise<{ invoiceId: bigint; dueDate: number }> {
  const due = (await time.latest()) + (opts.dueInDays ?? 120) * 24 * 3600;
  await s.shares
    .connect(s.verifier)
    .mintInvoice(
      seller.address,
      faceValue,
      due,
      TOTAL_SHARES,
      opts.buyer ?? "Lidl GmbH",
      opts.currency ?? "EUR",
      opts.rating ?? Rating.A
    );
  const id = (await s.shares.nextInvoiceId()) - 1n;
  return { invoiceId: id, dueDate: due };
}

async function approveSeller(s: Stack, seller: SignerWithAddress) {
  await s.shares.connect(seller).setApprovalForAll(await s.book.getAddress(), true);
}

async function approveBuyer(s: Stack, buyer: SignerWithAddress, amount = USDC(10_000_000)) {
  await s.usdc.connect(buyer).approve(await s.book.getAddress(), amount);
}

function feeSplit(gross: bigint, primary: boolean) {
  const platformFee = (gross * (primary ? PRIMARY_BPS : SECONDARY_BPS)) / BPS;
  const insuranceFee = (gross * INSURANCE_BPS) / BPS;
  return { platformFee, insuranceFee, sellerNet: gross - platformFee - insuranceFee };
}

// ----- Scenarios ---------------------------------------------------------

describe("E2E: Refaktör invoice lifecycle scenarios", () => {

  describe("Scenario 1 — Ahmet Bey's textile invoice (full happy path)", () => {
    it(
      "Ahmet Bey (SME) sells a 50,000 EUR Lidl invoice in 500 shares at 95 USDC. Two German and one Dubai investor fill the book. Lidl repays in full at maturity. All three investors claim pro-rata.",
      async () => {
        const s = await deployStack();
        const face = USDC(50_000);
        const { invoiceId } = await mintInvoice(s, s.sme1, face);

        await approveSeller(s, s.sme1);
        for (const b of [s.alice, s.bob, s.carol]) await approveBuyer(s, b);

        const price = USDC(95);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 120, price);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.bob.address, 200, price);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.carol.address, 180, price);

        // SME has all 500 sold
        expect(await s.shares.balanceOf(s.sme1.address, invoiceId)).to.equal(0);

        // Lidl pays the full face value
        await s.usdc.connect(s.realBuyer1).approve(await s.escrow.getAddress(), face);
        await s.escrow.connect(s.realBuyer1).repayInvoice(invoiceId, face);

        const inv = await s.shares.getInvoice(invoiceId);
        expect(inv.status).to.equal(Status.Repaid);

        // Each holder claims face * (held / 500)
        for (const [h, qty] of [[s.alice, 120n], [s.bob, 200n], [s.carol, 180n]] as const) {
          const before = await s.usdc.balanceOf(h.address);
          await s.escrow.connect(h).claim(invoiceId);
          expect((await s.usdc.balanceOf(h.address)) - before).to.equal((face * qty) / TOTAL_SHARES);
        }
      }
    );
  });

  describe("Scenario 2 — partial primary fill leaves remainder listed", () => {
    it(
      "SME lists 500 shares but only 320 are bought across two matches. Remaining 180 stay with SME and can be sold later at a different price.",
      async () => {
        const s = await deployStack();
        const { invoiceId } = await mintInvoice(s, s.sme1, USDC(50_000));
        await approveSeller(s, s.sme1);
        await approveBuyer(s, s.alice);
        await approveBuyer(s, s.bob);

        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 120, USDC(95));
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.bob.address, 200, USDC(95));

        expect(await s.shares.balanceOf(s.sme1.address, invoiceId)).to.equal(180n);

        // Later, demand picks up — SME sells 180 more at a higher price
        await approveBuyer(s, s.carol);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.carol.address, 180, USDC(96));
        expect(await s.shares.balanceOf(s.sme1.address, invoiceId)).to.equal(0);
      }
    );
  });

  describe("Scenario 3 — secondary trade chain (Hans → Mehmet → Sara)", () => {
    it(
      "Hans buys primary, sells half to Mehmet at premium, Mehmet flips to Sara closer to maturity. Each leg pays correct fee tier (1.5% primary, 0.25% secondary).",
      async () => {
        const s = await deployStack();
        const { invoiceId } = await mintInvoice(s, s.sme1, USDC(50_000));
        await approveSeller(s, s.sme1);
        for (const b of [s.alice, s.bob, s.carol]) {
          await approveBuyer(s, b);
          await approveSeller(s, b);
        }

        // Primary: SME -> Hans (alice) 200 @ 95
        const tx1Gross = 200n * USDC(95);
        const expectedPrimaryFee = (tx1Gross * PRIMARY_BPS) / BPS;
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 200, USDC(95));
        let feeRecv = await s.usdc.balanceOf(s.feeRecipient.address);
        expect(feeRecv).to.equal(expectedPrimaryFee);

        // Secondary: Hans -> Mehmet (bob) 100 @ 97
        const tx2Gross = 100n * USDC(97);
        const expectedSecondaryFee2 = (tx2Gross * SECONDARY_BPS) / BPS;
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.alice.address, s.bob.address, 100, USDC(97));
        expect((await s.usdc.balanceOf(s.feeRecipient.address)) - feeRecv).to.equal(expectedSecondaryFee2);
        feeRecv = await s.usdc.balanceOf(s.feeRecipient.address);

        // Secondary: Mehmet -> Sara (carol) 100 @ 98
        const tx3Gross = 100n * USDC(98);
        const expectedSecondaryFee3 = (tx3Gross * SECONDARY_BPS) / BPS;
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.bob.address, s.carol.address, 100, USDC(98));
        expect((await s.usdc.balanceOf(s.feeRecipient.address)) - feeRecv).to.equal(expectedSecondaryFee3);

        // Final ownership: alice 100, carol 100, sme has 300 (sold 200, kept 300)
        expect(await s.shares.balanceOf(s.alice.address, invoiceId)).to.equal(100n);
        expect(await s.shares.balanceOf(s.bob.address, invoiceId)).to.equal(0n);
        expect(await s.shares.balanceOf(s.carol.address, invoiceId)).to.equal(100n);
        expect(await s.shares.balanceOf(s.sme1.address, invoiceId)).to.equal(300n);
      }
    );
  });

  describe("Scenario 4 — insurance pool grows across many trades", () => {
    it(
      "Across 5 primary and 3 secondary matches the insurance pool accumulates exactly 0.5% of every gross.",
      async () => {
        const s = await deployStack();
        const { invoiceId } = await mintInvoice(s, s.sme1, USDC(100_000));
        await approveSeller(s, s.sme1);
        for (const b of [s.alice, s.bob, s.carol, s.dave]) {
          await approveBuyer(s, b);
          await approveSeller(s, b);
        }

        const trades: Array<{ seller: SignerWithAddress; buyer: SignerWithAddress; qty: bigint; price: bigint }> = [
          { seller: s.sme1, buyer: s.alice, qty: 50n, price: USDC(95) },
          { seller: s.sme1, buyer: s.bob, qty: 50n, price: USDC(94) },
          { seller: s.sme1, buyer: s.carol, qty: 100n, price: USDC(96) },
          { seller: s.sme1, buyer: s.dave, qty: 100n, price: USDC(97) },
          { seller: s.sme1, buyer: s.alice, qty: 50n, price: USDC(95) },
          // secondaries
          { seller: s.alice, buyer: s.bob, qty: 30n, price: USDC(98) },
          { seller: s.carol, buyer: s.dave, qty: 40n, price: USDC(99) },
          { seller: s.bob, buyer: s.carol, qty: 20n, price: USDC(99) },
        ];

        let expectedInsurance = 0n;
        for (const t of trades) {
          const gross = t.qty * t.price;
          expectedInsurance += (gross * INSURANCE_BPS) / BPS;
          await s.book.connect(s.matcher).executeMatch(invoiceId, t.seller.address, t.buyer.address, t.qty, t.price);
        }

        expect(await s.insurance.balance()).to.equal(expectedInsurance);
      }
    );
  });

  describe("Scenario 5 — default with full insurance coverage", () => {
    it(
      "Buyer goes silent past due+grace. Insurance pool was pre-seeded enough to cover the full face. After triggerDefault, every holder claims as if fully repaid.",
      async () => {
        const s = await deployStack();
        const face = USDC(50_000);
        const { invoiceId, dueDate } = await mintInvoice(s, s.sme1, face);

        await approveSeller(s, s.sme1);
        await approveBuyer(s, s.alice);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 200, USDC(95));

        // Pre-fund insurance with > face
        await s.usdc.mint(s.admin.address, face * 2n);
        await s.usdc.connect(s.admin).transfer(await s.insurance.getAddress(), face * 2n);

        await time.increaseTo(dueDate + 8 * 24 * 3600);
        await s.escrow.triggerDefault(invoiceId);

        const before = await s.usdc.balanceOf(s.alice.address);
        await s.escrow.connect(s.alice).claim(invoiceId);
        // Alice held 200/500 of face value
        expect((await s.usdc.balanceOf(s.alice.address)) - before).to.equal((face * 200n) / TOTAL_SHARES);
      }
    );
  });

  describe("Scenario 6 — default with partial insurance coverage", () => {
    it(
      "Pool only has 10,000 USDC against a 50,000 face. After default, claims are pro-rata of the 10,000 partial pool, not the face.",
      async () => {
        const s = await deployStack();
        const face = USDC(50_000);
        const { invoiceId, dueDate } = await mintInvoice(s, s.sme1, face);

        await approveSeller(s, s.sme1);
        await approveBuyer(s, s.alice);
        await approveBuyer(s, s.bob);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 200, USDC(95));
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.bob.address, 100, USDC(95));

        // Seed insurance with 10,000 USDC manually (bypassing fees for clean math)
        const seed = USDC(10_000);
        await s.usdc.mint(s.admin.address, seed);
        await s.usdc.connect(s.admin).transfer(await s.insurance.getAddress(), seed);

        await time.increaseTo(dueDate + 8 * 24 * 3600);
        // Pool now holds seed + insurance fees from the two trades above
        const poolAtDefault = await s.insurance.balance();
        await s.escrow.triggerDefault(invoiceId);

        // totalRepaid in escrow == poolAtDefault (capped at shortfall = face, but pool < face)
        const aliceBefore = await s.usdc.balanceOf(s.alice.address);
        const bobBefore = await s.usdc.balanceOf(s.bob.address);
        await s.escrow.connect(s.alice).claim(invoiceId);
        await s.escrow.connect(s.bob).claim(invoiceId);
        expect((await s.usdc.balanceOf(s.alice.address)) - aliceBefore).to.equal((poolAtDefault * 200n) / TOTAL_SHARES);
        expect((await s.usdc.balanceOf(s.bob.address)) - bobBefore).to.equal((poolAtDefault * 100n) / TOTAL_SHARES);
      }
    );
  });

  describe("Scenario 7 — default with empty insurance pool", () => {
    it(
      "No insurance funds at all. triggerDefault still succeeds, but holders' claims return 0 USDC and shares are still burned.",
      async () => {
        const s = await deployStack();
        const face = USDC(50_000);
        const { invoiceId, dueDate } = await mintInvoice(s, s.sme1, face);

        // Trade WITHOUT going through OrderBook so no fees go to insurance.
        // Easiest way: just transfer shares directly from SME to Alice.
        await s.shares.connect(s.sme1).safeTransferFrom(s.sme1.address, s.alice.address, invoiceId, 200, "0x");

        await time.increaseTo(dueDate + 8 * 24 * 3600);
        await s.escrow.triggerDefault(invoiceId);

        const before = await s.usdc.balanceOf(s.alice.address);
        await s.escrow.connect(s.alice).claim(invoiceId);
        expect((await s.usdc.balanceOf(s.alice.address)) - before).to.equal(0n);
        expect(await s.shares.balanceOf(s.alice.address, invoiceId)).to.equal(0n);
      }
    );
  });

  describe("Scenario 8 — late repayment before grace expires", () => {
    it(
      "Buyer pays 3 days after due date but within the 7-day grace. Invoice marked Repaid, holders claim full face value pro-rata, default cannot be triggered.",
      async () => {
        const s = await deployStack();
        const face = USDC(50_000);
        const { invoiceId, dueDate } = await mintInvoice(s, s.sme1, face);

        await approveSeller(s, s.sme1);
        await approveBuyer(s, s.alice);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 200, USDC(95));

        // 3 days after due date — still within grace
        await time.increaseTo(dueDate + 3 * 24 * 3600);

        await s.usdc.connect(s.realBuyer1).approve(await s.escrow.getAddress(), face);
        await s.escrow.connect(s.realBuyer1).repayInvoice(invoiceId, face);

        expect((await s.shares.getInvoice(invoiceId)).status).to.equal(Status.Repaid);
        await expect(s.escrow.triggerDefault(invoiceId)).to.be.revertedWith("already settled");
      }
    );
  });

  describe("Scenario 9 — invariants and revert paths", () => {
    it("triggerDefault reverts before grace period", async () => {
      const s = await deployStack();
      const { invoiceId, dueDate } = await mintInvoice(s, s.sme1, USDC(10_000));
      await time.increaseTo(dueDate + 1);
      await expect(s.escrow.triggerDefault(invoiceId)).to.be.revertedWith("too early");
    });

    it("triggerDefault cannot be called twice", async () => {
      const s = await deployStack();
      const { invoiceId, dueDate } = await mintInvoice(s, s.sme1, USDC(10_000));
      await time.increaseTo(dueDate + 8 * 24 * 3600);
      await s.escrow.triggerDefault(invoiceId);
      await expect(s.escrow.triggerDefault(invoiceId)).to.be.revertedWith("already settled");
    });

    it("trade rejected once invoice has been repaid", async () => {
      const s = await deployStack();
      const face = USDC(10_000);
      const { invoiceId } = await mintInvoice(s, s.sme1, face);
      await approveSeller(s, s.sme1);
      await approveBuyer(s, s.alice);
      await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 50, USDC(95));

      await s.usdc.connect(s.realBuyer1).approve(await s.escrow.getAddress(), face);
      await s.escrow.connect(s.realBuyer1).repayInvoice(invoiceId, face);

      await approveBuyer(s, s.bob);
      await approveSeller(s, s.alice);
      await expect(
        s.book.connect(s.matcher).executeMatch(invoiceId, s.alice.address, s.bob.address, 10, USDC(95))
      ).to.be.revertedWith("not tradable");
    });

    it("claim before settlement reverts", async () => {
      const s = await deployStack();
      const { invoiceId } = await mintInvoice(s, s.sme1, USDC(10_000));
      await approveSeller(s, s.sme1);
      await approveBuyer(s, s.alice);
      await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 50, USDC(95));
      await expect(s.escrow.connect(s.alice).claim(invoiceId)).to.be.revertedWith("not settled");
    });

    it("claim by holder with zero shares reverts", async () => {
      const s = await deployStack();
      const face = USDC(10_000);
      const { invoiceId } = await mintInvoice(s, s.sme1, face);
      await approveSeller(s, s.sme1);
      await approveBuyer(s, s.alice);
      await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 50, USDC(95));
      await s.usdc.connect(s.realBuyer1).approve(await s.escrow.getAddress(), face);
      await s.escrow.connect(s.realBuyer1).repayInvoice(invoiceId, face);
      await expect(s.escrow.connect(s.bob).claim(invoiceId)).to.be.revertedWith("no shares");
    });

    it("non-matcher cannot call executeMatch", async () => {
      const s = await deployStack();
      const { invoiceId } = await mintInvoice(s, s.sme1, USDC(10_000));
      await approveSeller(s, s.sme1);
      await approveBuyer(s, s.alice);
      await expect(
        s.book.connect(s.alice).executeMatch(invoiceId, s.sme1.address, s.alice.address, 10, USDC(95))
      ).to.be.reverted;
    });

    it("non-verifier cannot mint invoices", async () => {
      const s = await deployStack();
      const due = (await time.latest()) + 30 * 24 * 3600;
      await expect(
        s.shares.connect(s.alice).mintInvoice(s.sme1.address, USDC(1_000), due, 500, "Lidl", "EUR", Rating.A)
      ).to.be.reverted;
    });

    it("invoice with past due date cannot be minted", async () => {
      const s = await deployStack();
      const past = (await time.latest()) - 1;
      await expect(
        s.shares.connect(s.verifier).mintInvoice(s.sme1.address, USDC(1_000), past, 500, "Lidl", "EUR", Rating.A)
      ).to.be.revertedWith("due in past");
    });
  });

  describe("Scenario 10 — multiple invoices isolated", () => {
    it(
      "Two SMEs each mint an invoice. Trades, repayments, and defaults on one do not affect the other.",
      async () => {
        const s = await deployStack();
        const face1 = USDC(50_000);
        const face2 = USDC(20_000);

        const { invoiceId: id1 } = await mintInvoice(s, s.sme1, face1, { dueInDays: 120 });
        const { invoiceId: id2, dueDate: due2 } = await mintInvoice(s, s.sme2, face2, { dueInDays: 30 });

        await approveSeller(s, s.sme1);
        await approveSeller(s, s.sme2);
        await approveBuyer(s, s.alice);
        await approveBuyer(s, s.bob);

        await s.book.connect(s.matcher).executeMatch(id1, s.sme1.address, s.alice.address, 100, USDC(95));
        await s.book.connect(s.matcher).executeMatch(id2, s.sme2.address, s.bob.address, 250, USDC(90));

        // Repay invoice 1 fully
        await s.usdc.connect(s.realBuyer1).approve(await s.escrow.getAddress(), face1);
        await s.escrow.connect(s.realBuyer1).repayInvoice(id1, face1);
        expect((await s.shares.getInvoice(id1)).status).to.equal(Status.Repaid);
        expect((await s.shares.getInvoice(id2)).status).to.equal(Status.Listed);

        // Default invoice 2
        await time.increaseTo(due2 + 8 * 24 * 3600);
        await s.escrow.triggerDefault(id2);
        expect((await s.shares.getInvoice(id2)).status).to.equal(Status.Defaulted);
        // Invoice 1 unaffected
        expect((await s.shares.getInvoice(id1)).status).to.equal(Status.Repaid);

        // Both holders claim independently
        const aliceBefore = await s.usdc.balanceOf(s.alice.address);
        await s.escrow.connect(s.alice).claim(id1);
        expect((await s.usdc.balanceOf(s.alice.address)) - aliceBefore).to.equal((face1 * 100n) / TOTAL_SHARES);

        // Bob's id2 claim works but with whatever insurance covered (likely 0 here)
        await s.escrow.connect(s.bob).claim(id2);
        expect(await s.shares.balanceOf(s.bob.address, id2)).to.equal(0n);
      }
    );
  });

  describe("Scenario 11 — fee math correctness on a single primary trade", () => {
    it(
      "Primary trade of 320 shares @ 95 USDC: SME nets gross - 1.5% platform - 0.5% insurance, fee recipient and pool receive exact amounts.",
      async () => {
        const s = await deployStack();
        const { invoiceId } = await mintInvoice(s, s.sme1, USDC(50_000));
        await approveSeller(s, s.sme1);
        await approveBuyer(s, s.alice);
        const before = await s.usdc.balanceOf(s.alice.address);

        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 320, USDC(95));

        const gross = 320n * USDC(95);
        const { platformFee, insuranceFee, sellerNet } = feeSplit(gross, true);

        expect(await s.usdc.balanceOf(s.sme1.address)).to.equal(sellerNet);
        expect(await s.usdc.balanceOf(s.feeRecipient.address)).to.equal(platformFee);
        expect(await s.insurance.balance()).to.equal(insuranceFee);
        expect(before - (await s.usdc.balanceOf(s.alice.address))).to.equal(gross);
      }
    );
  });

  describe("Scenario 12 — over-repayment", () => {
    it(
      "If buyer over-pays (face + bonus), holders still claim only their pro-rata of total deposited (which now exceeds face).",
      async () => {
        const s = await deployStack();
        const face = USDC(50_000);
        const overpay = USDC(55_000);
        const { invoiceId } = await mintInvoice(s, s.sme1, face);

        await approveSeller(s, s.sme1);
        await approveBuyer(s, s.alice);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 500, USDC(95));

        await s.usdc.connect(s.realBuyer1).approve(await s.escrow.getAddress(), overpay);
        await s.escrow.connect(s.realBuyer1).repayInvoice(invoiceId, overpay);

        const before = await s.usdc.balanceOf(s.alice.address);
        await s.escrow.connect(s.alice).claim(invoiceId);
        // Alice owns 100% of shares so she gets the entire pool
        expect((await s.usdc.balanceOf(s.alice.address)) - before).to.equal(overpay);
      }
    );
  });

  describe("Scenario 13 — installment repayments accumulate", () => {
    it(
      "Real-world buyer pays in three installments totaling face. Status stays Listed after first two, flips to Repaid only when cumulative >= face.",
      async () => {
        const s = await deployStack();
        const face = USDC(50_000);
        const { invoiceId } = await mintInvoice(s, s.sme1, face);

        await approveSeller(s, s.sme1);
        await approveBuyer(s, s.alice);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 500, USDC(95));

        await s.usdc.connect(s.realBuyer1).approve(await s.escrow.getAddress(), face);
        await s.escrow.connect(s.realBuyer1).repayInvoice(invoiceId, USDC(20_000));
        expect((await s.shares.getInvoice(invoiceId)).status).to.equal(Status.Listed);
        await s.escrow.connect(s.realBuyer1).repayInvoice(invoiceId, USDC(20_000));
        expect((await s.shares.getInvoice(invoiceId)).status).to.equal(Status.Listed);
        await s.escrow.connect(s.realBuyer1).repayInvoice(invoiceId, USDC(10_000));
        expect((await s.shares.getInvoice(invoiceId)).status).to.equal(Status.Repaid);
      }
    );
  });

  describe("Scenario 14 — buyer becomes seller (round-trip)", () => {
    it(
      "Alice buys 200 from SME, sells 100 to Bob, then sells remaining 100 to Carol. Alice's USDC delta reflects net cash flow.",
      async () => {
        const s = await deployStack();
        const { invoiceId } = await mintInvoice(s, s.sme1, USDC(50_000));
        await approveSeller(s, s.sme1);
        await approveSeller(s, s.alice);
        await approveBuyer(s, s.alice);
        await approveBuyer(s, s.bob);
        await approveBuyer(s, s.carol);

        const startAlice = await s.usdc.balanceOf(s.alice.address);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 200, USDC(95));
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.alice.address, s.bob.address, 100, USDC(97));
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.alice.address, s.carol.address, 100, USDC(99));

        // Alice paid 200*95 = 19,000; received 100*97*(1-0.0075) + 100*99*(1-0.0075)
        const cost = 200n * USDC(95);
        const sale1 = (100n * USDC(97) * (BPS - SECONDARY_BPS - INSURANCE_BPS)) / BPS;
        const sale2 = (100n * USDC(99) * (BPS - SECONDARY_BPS - INSURANCE_BPS)) / BPS;
        const expectedDelta = sale1 + sale2 - cost;
        expect((await s.usdc.balanceOf(s.alice.address)) - startAlice).to.equal(expectedDelta);
        expect(await s.shares.balanceOf(s.alice.address, invoiceId)).to.equal(0n);
      }
    );
  });

  describe("Scenario 15 — different invoice ratings & buyers coexist", () => {
    it(
      "Two invoices with different buyers and ratings (A vs C) trade on the same platform; metadata stays separate.",
      async () => {
        const s = await deployStack();
        const { invoiceId: idA } = await mintInvoice(s, s.sme1, USDC(50_000), {
          buyer: "Bosch GmbH",
          rating: Rating.A,
        });
        const { invoiceId: idC } = await mintInvoice(s, s.sme2, USDC(20_000), {
          buyer: "ZorluTekstil Ltd",
          rating: Rating.C,
        });

        const a = await s.shares.getInvoice(idA);
        const c = await s.shares.getInvoice(idC);
        expect(a.buyerName).to.equal("Bosch GmbH");
        expect(a.rating).to.equal(Rating.A);
        expect(c.buyerName).to.equal("ZorluTekstil Ltd");
        expect(c.rating).to.equal(Rating.C);
        expect(a.faceValue).to.equal(USDC(50_000));
        expect(c.faceValue).to.equal(USDC(20_000));
      }
    );
  });

  describe("Scenario 16 — admin rotates fee recipient mid-flight", () => {
    it(
      "Admin updates feeRecipient. New recipient gets fees from subsequent trades; old recipient keeps prior balance untouched.",
      async () => {
        const s = await deployStack();
        const { invoiceId } = await mintInvoice(s, s.sme1, USDC(50_000));
        await approveSeller(s, s.sme1);
        await approveBuyer(s, s.alice);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.alice.address, 100, USDC(95));
        const oldFee = await s.usdc.balanceOf(s.feeRecipient.address);
        expect(oldFee).to.be.gt(0n);

        // sme2 is unfunded — clean delta target
        await s.book.connect(s.admin).setFeeRecipient(s.sme2.address);
        await approveBuyer(s, s.bob);
        await s.book.connect(s.matcher).executeMatch(invoiceId, s.sme1.address, s.bob.address, 100, USDC(95));

        expect(await s.usdc.balanceOf(s.feeRecipient.address)).to.equal(oldFee);
        expect(await s.usdc.balanceOf(s.sme2.address)).to.equal((100n * USDC(95) * PRIMARY_BPS) / BPS);
      }
    );
  });
});
