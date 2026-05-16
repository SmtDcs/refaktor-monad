import { ethers, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const matcherAddress = process.env.MATCHER_ADDRESS ?? deployer.address;
  const verifierAddress = process.env.VERIFIER_ADDRESS ?? deployer.address;
  const feeRecipient = process.env.FEE_RECIPIENT ?? deployer.address;

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  console.log(`MockUSDC: ${usdcAddr}`);

  const InvoiceShares = await ethers.getContractFactory("InvoiceShares");
  const shares = await InvoiceShares.deploy(deployer.address);
  await shares.waitForDeployment();
  const sharesAddr = await shares.getAddress();
  console.log(`InvoiceShares: ${sharesAddr}`);

  const InsurancePool = await ethers.getContractFactory("InsurancePool");
  const insurance = await InsurancePool.deploy(deployer.address, usdcAddr);
  await insurance.waitForDeployment();
  const insuranceAddr = await insurance.getAddress();
  console.log(`InsurancePool: ${insuranceAddr}`);

  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(deployer.address, usdcAddr, sharesAddr, insuranceAddr);
  await escrow.waitForDeployment();
  const escrowAddr = await escrow.getAddress();
  console.log(`Escrow: ${escrowAddr}`);

  const OrderBook = await ethers.getContractFactory("OrderBook");
  const book = await OrderBook.deploy(deployer.address, usdcAddr, sharesAddr, insuranceAddr, feeRecipient);
  await book.waitForDeployment();
  const bookAddr = await book.getAddress();
  console.log(`OrderBook: ${bookAddr}`);

  // Wire roles (compute locally to avoid public-RPC read-after-write lag)
  const VERIFIER_ROLE = ethers.id("VERIFIER_ROLE");
  const ESCROW_ROLE_SHARES = ethers.id("ESCROW_ROLE");
  const ESCROW_ROLE_POOL = ethers.id("ESCROW_ROLE");
  const MATCHER_ROLE = ethers.id("MATCHER_ROLE");

  await (await shares.grantRole(VERIFIER_ROLE, verifierAddress)).wait();
  await (await shares.grantRole(ESCROW_ROLE_SHARES, escrowAddr)).wait();
  await (await insurance.grantRole(ESCROW_ROLE_POOL, escrowAddr)).wait();
  await (await book.grantRole(MATCHER_ROLE, matcherAddress)).wait();

  console.log("Roles granted");

  const out = {
    network: network.name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployer: deployer.address,
    matcher: matcherAddress,
    verifier: verifierAddress,
    feeRecipient,
    contracts: {
      MockUSDC: usdcAddr,
      InvoiceShares: sharesAddr,
      InsurancePool: insuranceAddr,
      Escrow: escrowAddr,
      OrderBook: bookAddr,
    },
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outFile}`);

  if (process.env.VERIFY === "1" && network.name !== "hardhat" && network.name !== "localhost") {
    console.log("Verifying contracts on Monad explorer...");
    const tasks: Array<{ address: string; constructorArguments: any[] }> = [
      { address: usdcAddr, constructorArguments: [] },
      { address: sharesAddr, constructorArguments: [deployer.address] },
      { address: insuranceAddr, constructorArguments: [deployer.address, usdcAddr] },
      { address: escrowAddr, constructorArguments: [deployer.address, usdcAddr, sharesAddr, insuranceAddr] },
      {
        address: bookAddr,
        constructorArguments: [deployer.address, usdcAddr, sharesAddr, insuranceAddr, feeRecipient],
      },
    ];
    for (const t of tasks) {
      try {
        await run("verify:verify", t);
      } catch (e: any) {
        console.warn(`verify ${t.address}: ${e.message}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
