import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const verifierAddress = process.env.VERIFIER_ADDRESS ?? deployer.address;
  const matcherAddress = process.env.MATCHER_ADDRESS ?? deployer.address;

  const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentFile)) {
    // Allow CLI override via env vars
    const sharesAddr = required("INVOICE_SHARES_ADDR");
    const insuranceAddr = required("INSURANCE_POOL_ADDR");
    const escrowAddr = required("ESCROW_ADDR");
    const bookAddr = required("ORDER_BOOK_ADDR");
    await wire(sharesAddr, insuranceAddr, escrowAddr, bookAddr, verifierAddress, matcherAddress);
    return;
  }
  const dep = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  await wire(
    dep.contracts.InvoiceShares,
    dep.contracts.InsurancePool,
    dep.contracts.Escrow,
    dep.contracts.OrderBook,
    verifierAddress,
    matcherAddress
  );
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`missing env ${key}`);
  return v;
}

async function wire(
  sharesAddr: string,
  insuranceAddr: string,
  escrowAddr: string,
  bookAddr: string,
  verifier: string,
  matcher: string
) {
  const shares = await ethers.getContractAt("InvoiceShares", sharesAddr);
  const insurance = await ethers.getContractAt("InsurancePool", insuranceAddr);
  const book = await ethers.getContractAt("OrderBook", bookAddr);

  const VERIFIER_ROLE = ethers.id("VERIFIER_ROLE");
  const ESCROW_ROLE = ethers.id("ESCROW_ROLE");
  const MATCHER_ROLE = ethers.id("MATCHER_ROLE");

  console.log(`Granting VERIFIER_ROLE on InvoiceShares to ${verifier}`);
  await (await shares.grantRole(VERIFIER_ROLE, verifier)).wait();

  console.log(`Granting ESCROW_ROLE on InvoiceShares to ${escrowAddr}`);
  await (await shares.grantRole(ESCROW_ROLE, escrowAddr)).wait();

  console.log(`Granting ESCROW_ROLE on InsurancePool to ${escrowAddr}`);
  await (await insurance.grantRole(ESCROW_ROLE, escrowAddr)).wait();

  console.log(`Granting MATCHER_ROLE on OrderBook to ${matcher}`);
  await (await book.grantRole(MATCHER_ROLE, matcher)).wait();

  console.log("Roles wired.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
