import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const USDC = (n: number | bigint) => ethers.parseUnits(n.toString(), 6);
const RATING_A = 0;
const TOTAL_SHARES = 500n;

async function setup() {
  const [admin, sme, alice, bob, realBuyer, feeRecipient, matcher] = await ethers.getSigners();

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

  await shares.grantRole(await shares.VERIFIER_ROLE(), admin.address);
  await shares.grantRole(await shares.ESCROW_ROLE(), await escrow.getAddress());
  await insurance.grantRole(await insurance.ESCROW_ROLE(), await escrow.getAddress());
  await book.grantRole(await book.MATCHER_ROLE(), matcher.address);

  // Fund wallets with USDC
  for (const u of [alice, bob, realBuyer]) {
    await usdc.mint(u.address, USDC(1_000_000));
  }

  return { admin, sme, alice, bob, realBuyer, feeRecipient, matcher, usdc, shares, insurance, escrow, book };
}

async function mintInvoice(ctx: Awaited<ReturnType<typeof setup>>, faceValue: bigint) {
  const due = (await time.latest()) + 120 * 24 * 3600;
  const tx = await ctx.shares.mintInvoice(
    ctx.sme.address,
    faceValue,
    due,
    TOTAL_SHARES,
    "Lidl",
    "EUR",
    RATING_A
  );
  await tx.wait();
  return { invoiceId: 1n, dueDate: due };
}

describe("Refaktör", () => {
  it("happy path: mint, partial fill across two buyers, SME paid net of fees", async () => {
    const ctx = await setup();
    const { sme, alice, bob, usdc, shares, book, insurance, feeRecipient, matcher } = ctx;

    const face = USDC(50_000);
    const { invoiceId } = await mintInvoice(ctx, face);

    expect(await shares.balanceOf(sme.address, invoiceId)).to.equal(TOTAL_SHARES);

    // Approvals
    await shares.connect(sme).setApprovalForAll(await book.getAddress(), true);
    await usdc.connect(alice).approve(await book.getAddress(), USDC(1_000_000));
    await usdc.connect(bob).approve(await book.getAddress(), USDC(1_000_000));

    const price = USDC(95); // 95 USDC per share
    // Alice buys 120 shares from SME (primary)
    await book.connect(matcher).executeMatch(invoiceId, sme.address, alice.address, 120, price);
    // Bob buys 200 shares from SME (primary)
    await book.connect(matcher).executeMatch(invoiceId, sme.address, bob.address, 200, price);

    // Gross = 320 * 95 = 30,400 USDC
    const gross = 320n * USDC(95);
    const platformFee = (gross * 150n) / 10_000n;
    const insuranceFee = (gross * 50n) / 10_000n;
    const sellerNet = gross - platformFee - insuranceFee;

    expect(await usdc.balanceOf(sme.address)).to.equal(sellerNet);
    expect(await usdc.balanceOf(feeRecipient.address)).to.equal(platformFee);
    expect(await insurance.balance()).to.equal(insuranceFee);
    expect(await shares.balanceOf(alice.address, invoiceId)).to.equal(120n);
    expect(await shares.balanceOf(bob.address, invoiceId)).to.equal(200n);
    expect(await shares.balanceOf(sme.address, invoiceId)).to.equal(TOTAL_SHARES - 320n);
  });

  it("secondary sale uses 0.25% fee", async () => {
    const ctx = await setup();
    const { sme, alice, bob, usdc, shares, book, feeRecipient, matcher } = ctx;
    const { invoiceId } = await mintInvoice(ctx, USDC(50_000));

    await shares.connect(sme).setApprovalForAll(await book.getAddress(), true);
    await shares.connect(alice).setApprovalForAll(await book.getAddress(), true);
    await usdc.connect(alice).approve(await book.getAddress(), USDC(1_000_000));
    await usdc.connect(bob).approve(await book.getAddress(), USDC(1_000_000));

    // Primary
    await book.connect(matcher).executeMatch(invoiceId, sme.address, alice.address, 100, USDC(95));
    const feeAfterPrimary = await usdc.balanceOf(feeRecipient.address);

    // Secondary: alice -> bob @ 97.5
    await book.connect(matcher).executeMatch(invoiceId, alice.address, bob.address, 100, USDC(97));
    const grossSecondary = 100n * USDC(97);
    const expectedSecondaryFee = (grossSecondary * 25n) / 10_000n;
    expect((await usdc.balanceOf(feeRecipient.address)) - feeAfterPrimary).to.equal(expectedSecondaryFee);
  });

  it("repaid: holders claim pro-rata", async () => {
    const ctx = await setup();
    const { sme, alice, bob, realBuyer, usdc, shares, escrow, book, matcher } = ctx;
    const face = USDC(50_000);
    const { invoiceId } = await mintInvoice(ctx, face);

    await shares.connect(sme).setApprovalForAll(await book.getAddress(), true);
    await usdc.connect(alice).approve(await book.getAddress(), USDC(1_000_000));
    await usdc.connect(bob).approve(await book.getAddress(), USDC(1_000_000));

    await book.connect(matcher).executeMatch(invoiceId, sme.address, alice.address, 100, USDC(95));
    await book.connect(matcher).executeMatch(invoiceId, sme.address, bob.address, 200, USDC(95));

    // Real-world buyer repays full face value
    await usdc.connect(realBuyer).approve(await escrow.getAddress(), face);
    await escrow.connect(realBuyer).repayInvoice(invoiceId, face);

    expect((await shares.getInvoice(invoiceId)).status).to.equal(2); // Repaid

    const aliceBefore = await usdc.balanceOf(alice.address);
    const bobBefore = await usdc.balanceOf(bob.address);

    await escrow.connect(alice).claim(invoiceId);
    await escrow.connect(bob).claim(invoiceId);

    const expectedAlice = (face * 100n) / TOTAL_SHARES;
    const expectedBob = (face * 200n) / TOTAL_SHARES;
    expect((await usdc.balanceOf(alice.address)) - aliceBefore).to.equal(expectedAlice);
    expect((await usdc.balanceOf(bob.address)) - bobBefore).to.equal(expectedBob);

    // Shares burned
    expect(await shares.balanceOf(alice.address, invoiceId)).to.equal(0);
    expect(await shares.balanceOf(bob.address, invoiceId)).to.equal(0);
  });

  it("default: insurance pool tops up shortfall", async () => {
    const ctx = await setup();
    const { sme, alice, usdc, shares, escrow, book, insurance, matcher } = ctx;
    const face = USDC(50_000);
    const { invoiceId, dueDate } = await mintInvoice(ctx, face);

    await shares.connect(sme).setApprovalForAll(await book.getAddress(), true);
    await usdc.connect(alice).approve(await book.getAddress(), USDC(1_000_000));

    await book.connect(matcher).executeMatch(invoiceId, sme.address, alice.address, 100, USDC(95));

    // Seed insurance with extra USDC so it can cover something
    await usdc.mint(matcher.address, USDC(10_000));
    await usdc.connect(matcher).transfer(await insurance.getAddress(), USDC(10_000));

    // Fast-forward past due + grace
    await time.increaseTo(dueDate + 8 * 24 * 3600);
    await escrow.triggerDefault(invoiceId);

    expect((await shares.getInvoice(invoiceId)).status).to.equal(3); // Defaulted

    // Alice claims her share of whatever was recovered
    const aliceBefore = await usdc.balanceOf(alice.address);
    await escrow.connect(alice).claim(invoiceId);
    const recovered = await usdc.balanceOf(alice.address);
    expect(recovered).to.be.gt(aliceBefore);
  });
});
