const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🛹 Deploying SkateBountyPool contract...\n');

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  console.log('Account balance:', hre.ethers.utils.formatEther(await deployer.getBalance()), 'CELO\n');

  // Deploy SkateBountyPool
  const SkateBountyPool = await hre.ethers.getContractFactory('SkateBountyPool');
  const bountyPool = await SkateBountyPool.deploy();

  await bountyPool.deployed();

  console.log('✅ SkateBountyPool deployed to:', bountyPool.address);
  console.log('Transaction hash:', bountyPool.deployTransaction.hash);
  console.log('Block number:', bountyPool.deployTransaction.blockNumber);

  // Wait for a few confirmations
  console.log('\n⏳ Waiting for confirmations...');
  await bountyPool.deployTransaction.wait(3);
  console.log('✅ Confirmed!\n');

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: bountyPool.address,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: bountyPool.deployTransaction.hash,
    blockNumber: bountyPool.deployTransaction.blockNumber,
  };

  const deploymentPath = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentPath, `bounty-pool-${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('📝 Deployment info saved to:', `deployments/bounty-pool-${hre.network.name}.json`);

  // Generate ABI file
  const artifact = await hre.artifacts.readArtifact('SkateBountyPool');
  const abiPath = path.join(__dirname, '../contracts/abi');
  
  if (!fs.existsSync(abiPath)) {
    fs.mkdirSync(abiPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(abiPath, 'SkateBountyPool.json'),
    JSON.stringify(artifact.abi, null, 2)
  );

  console.log('📝 ABI saved to:', 'contracts/abi/SkateBountyPool.json');

  // Verify contract on block explorer (if not localhost)
  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    console.log('\n⏳ Waiting before verification...');
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

    console.log('🔍 Verifying contract on block explorer...');
    try {
      await hre.run('verify:verify', {
        address: bountyPool.address,
        constructorArguments: [],
      });
      console.log('✅ Contract verified!');
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
    }
  }

  console.log('\n🎉 Deployment complete!');
  console.log('\n📋 Summary:');
  console.log('─────────────────────────────────────────');
  console.log('Network:', hre.network.name);
  console.log('Contract:', bountyPool.address);
  console.log('Explorer:', getExplorerUrl(hre.network.name, bountyPool.address));
  console.log('─────────────────────────────────────────');
  console.log('\n💡 Next steps:');
  console.log('1. Update .env.local with:');
  console.log(`   NEXT_PUBLIC_BOUNTY_POOL_ADDRESS=${bountyPool.address}`);
  console.log('2. Fund the relayer wallet with CELO for gasless transactions');
  console.log('3. Start the relayer service: node scripts/relayer-service.js');
  console.log('4. Test the contract with: npx hardhat test\n');
}

function getExplorerUrl(network, address) {
  const explorers = {
    alfajores: `https://alfajores.celoscan.io/address/${address}`,
    celo: `https://celoscan.io/address/${address}`,
    localhost: 'N/A',
    hardhat: 'N/A',
  };
  return explorers[network] || 'N/A';
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
