import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy FunToken
  const FunToken = await ethers.getContractFactory("FunToken");
  const funToken = await FunToken.deploy(deployer.address);

  await funToken.waitForDeployment();
  const tokenAddress = await funToken.getAddress();

  console.log("\n=== Deployment Summary ===");
  console.log("FunToken deployed to:", tokenAddress);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);

  // Verify contract (if on testnet/mainnet)
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("\nWaiting for block confirmations...");
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s

    try {
      await hre.run("verify:verify", {
        address: tokenAddress,
        constructorArguments: [deployer.address],
      });
      console.log("Contract verified on Polygonscan!");
    } catch (error) {
      console.log("Verification failed (might already be verified):", error);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    tokenAddress: tokenAddress,
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Info ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

