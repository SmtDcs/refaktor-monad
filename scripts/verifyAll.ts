import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep = JSON.parse(fs.readFileSync(file, "utf8"));
  const c = dep.contracts;

  const tasks: Array<{ name: string; address: string; args: any[] }> = [
    { name: "MockUSDC", address: c.MockUSDC, args: [] },
    { name: "InvoiceShares", address: c.InvoiceShares, args: [dep.deployer] },
    { name: "InsurancePool", address: c.InsurancePool, args: [dep.deployer, c.MockUSDC] },
    { name: "Escrow", address: c.Escrow, args: [dep.deployer, c.MockUSDC, c.InvoiceShares, c.InsurancePool] },
    {
      name: "OrderBook",
      address: c.OrderBook,
      args: [dep.deployer, c.MockUSDC, c.InvoiceShares, c.InsurancePool, dep.feeRecipient],
    },
  ];

  for (const t of tasks) {
    console.log(`\nVerifying ${t.name} at ${t.address}...`);
    try {
      await run("verify:verify", { address: t.address, constructorArguments: t.args });
      console.log(`  ✓ ${t.name} verified`);
    } catch (e: any) {
      const msg = String(e.message ?? e);
      if (msg.toLowerCase().includes("already verified")) {
        console.log(`  ↺ ${t.name} already verified`);
      } else {
        console.warn(`  ✗ ${t.name}: ${msg}`);
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
