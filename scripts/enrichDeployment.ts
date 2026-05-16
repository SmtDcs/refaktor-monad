import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep = JSON.parse(fs.readFileSync(file, "utf8"));

  const provider = ethers.provider;
  const blocks: Record<string, number> = {};
  let earliest = Number.MAX_SAFE_INTEGER;

  for (const [name, addr] of Object.entries<string>(dep.contracts)) {
    // Try to find the contract creation block by binary search on bytecode presence
    const latest = await provider.getBlockNumber();
    let lo = 0;
    let hi = latest;
    // Confirm there's code now
    if ((await provider.getCode(addr, latest)) === "0x") {
      console.warn(`${name} ${addr} has no code at head`);
      continue;
    }
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const code = await provider.getCode(addr, mid);
      if (code === "0x") lo = mid + 1;
      else hi = mid;
    }
    blocks[name] = lo;
    earliest = Math.min(earliest, lo);
    console.log(`${name}: deployed at block ${lo}`);
  }

  dep.deploymentBlocks = blocks;
  dep.startBlock = earliest;
  dep.explorer = "https://testnet.monadvision.com";
  dep.rpc = "https://testnet-rpc.monad.xyz/";

  fs.writeFileSync(file, JSON.stringify(dep, null, 2));
  console.log(`Updated ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
