# Smart Account Integration for SkateBounties

This document explains how **SkateBounties** implements **gasless transactions** and **smart account support** using meta-transactions and ERC-4337 patterns.

## 🎯 Why Smart Accounts?

Traditional Web3 UX friction points:
- Users need native tokens (CELO) for gas before they can interact
- Each action requires wallet confirmation + gas payment
- Complex for onboarding non-crypto natives

**Smart accounts solve this by:**
- ✅ Gasless transactions (sponsored by the app)
- ✅ Batch operations (vote on 10 clips with 1 signature)
- ✅ Social recovery (recover account without seed phrase)
- ✅ Session keys (approve app for X hours without repeated signing)

## 🏗️ Architecture

```
┌─────────────────┐
│   Frontend UI   │
│  (React Hook)   │
└────────┬────────┘
         │ 1. Sign meta-tx
         ▼
┌─────────────────┐
│ useSkateBounty  │  ← Generates signature
│     Hook        │
└────────┬────────┘
         │ 2. Send to relayer
         ▼
┌─────────────────┐
│  Relayer API    │  ← Validates & submits
│  (Backend)      │     (pays gas)
└────────┬────────┘
         │ 3. Submit on-chain
         ▼
┌─────────────────┐
│ SkateBountyPool │  ← Verifies signature
│    Contract     │     & executes
└─────────────────┘
```

## 📝 Contract Functions

### Standard Transactions (User pays gas)

```solidity
createBounty(spotId, trickName, rewardToken, amount, votesRequired)
submitTrick(bountyId, videoIPFSHash)
vote(submissionId, isUpvote)
batchVote(submissionIds[], isUpvotes[])
```

### Meta-Transactions (Gasless)

```solidity
createBountyMeta(spotId, trickName, token, amount, votes, creator, nonce, signature)
submitTrickMeta(bountyId, videoIPFSHash, skater, nonce, signature)
voteMeta(submissionId, isUpvote, voter, nonce, signature)
```

**How it works:**
1. User signs transaction data (no gas needed)
2. Relayer submits transaction (pays gas)
3. Contract verifies signature matches `creator`/`skater`/`voter`
4. Action executes as if user submitted directly

## 🔐 Security Features

### Replay Protection
- Each meta-transaction requires a unique `nonce`
- `usedNonces` mapping prevents nonce reuse
- Attack: ❌ Relayer can't replay old signatures

### Signature Validation
```solidity
bytes32 messageHash = keccak256(abi.encodePacked(
    "vote",
    submissionId,
    isUpvote,
    voter,
    nonce,
    address(this),  // Contract address
    block.chainid   // Chain ID
));

address signer = messageHash.recover(signature);
require(signer == voter, "Invalid signature");
```

### Rate Limiting (Relayer-side)
- Prevent spam by limiting meta-txs per address
- Configurable: e.g., 10 votes/hour max

## 🚀 Frontend Usage

### Basic Usage (Hook)

```tsx
import { useSkateBounty } from '@/hooks/useSkateBounty';

function VoteButton({ submissionId }) {
  const { voteMeta, isLoading } = useSkateBounty();

  const handleVote = async () => {
    try {
      // Gasless vote - user only signs, no gas paid
      await voteMeta(submissionId, true);
      toast.success('Voted! (gasless)');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <button onClick={handleVote} disabled={isLoading}>
      {isLoading ? 'Voting...' : '👍 Upvote (Free)'}
    </button>
  );
}
```

### Batch Operations

```tsx
// User signs once, votes on multiple submissions
const submissionIds = [1, 2, 3, 4, 5];
const upvotes = [true, true, false, true, true];

await batchVote(submissionIds, upvotes);
```

### With Relayer Service

```tsx
import { getRelayerClient } from '@/services/relayer';

const relayer = getRelayerClient();

// Check if relayer is online
const status = await relayer.getStatus();
console.log('Relayer balance:', status.balance, 'CELO');

// Estimate gas cost
const estimate = await relayer.estimateGas({
  to: BOUNTY_POOL_ADDRESS,
  functionName: 'vote',
  params: [submissionId, true],
  from: userAddress,
});
console.log('Gas cost:', estimate.costInUSD, 'USD');
```

## 🔧 Deployment

### 1. Compile Contract

```bash
npx hardhat compile
```

### 2. Deploy to Alfajores

```bash
npx hardhat run scripts/deploy-bounty-pool.js --network alfajores
```

Output:
```
✅ SkateBountyPool deployed to: 0x...
📝 ABI saved to: contracts/abi/SkateBountyPool.json
```

### 3. Update Environment Variables

```bash
# .env.local
NEXT_PUBLIC_BOUNTY_POOL_ADDRESS=0x...  # From deployment
NEXT_PUBLIC_RELAYER_API_URL=https://relayer.skatebounties.app
```

### 4. Fund Relayer Wallet

The relayer needs CELO to pay gas for meta-transactions:

```bash
# Send CELO to relayer address
cast send <RELAYER_ADDRESS> --value 10ether --rpc-url $ALFAJORES_RPC
```

### 5. Start Relayer Service

```bash
# Backend service (Node.js/Express)
node scripts/relayer-service.js
```

## 📊 Gas Cost Comparison

| Action | Standard TX | Meta-TX | Savings |
|--------|------------|---------|---------|
| Vote | 150k gas (~$0.01) | **FREE** | 100% |
| Submit Trick | 300k gas (~$0.02) | **FREE** | 100% |
| Create Bounty | 500k gas (~$0.03) | **FREE** | 100% |
| Batch Vote (10) | 1.5M gas (~$0.10) | **FREE** | 100% |

**User Experience:**
- No wallet setup with tokens required
- No gas estimation anxiety
- Instant confirmations (no "insufficient funds" errors)

## 🧪 Testing

### Test Meta-Transaction Flow

```bash
npx hardhat test test/SkateBountyPool.test.js
```

```javascript
describe('Meta-Transactions', () => {
  it('should allow gasless voting', async () => {
    const { bountyPool, user } = await setup();
    
    // User signs vote data
    const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const messageHash = /* ... */;
    const signature = await user.signMessage(messageHash);

    // Relayer submits (as different account)
    await bountyPool.connect(relayer).voteMeta(
      submissionId,
      true,
      user.address,
      nonce,
      signature
    );

    // Verify vote counted
    const submission = await bountyPool.getSubmission(submissionId);
    expect(submission.votesUp).to.equal(1);
  });
});
```

## 🔮 Advanced Features

### Session Keys (Future)

Allow users to grant temporary permissions:

```solidity
// User approves app for 24 hours
approveSession(appAddress, duration);

// App can vote on user's behalf without signatures
voteWithSession(submissionId, isUpvote);
```

### Paymaster Integration (ERC-4337)

Replace custom relayer with standard paymaster:

```solidity
interface IPaymaster {
  function validatePaymasterUserOp(
    UserOperation calldata userOp
  ) external returns (bytes memory context);
}
```

### Social Recovery

Allow users to recover accounts via friends:

```solidity
addRecoveryGuardian(guardianAddress);
initiateRecovery(lostAccountAddress);
```

## 📚 Resources

- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Celo Documentation](https://docs.celo.org/)
- [OpenZeppelin ECDSA](https://docs.openzeppelin.com/contracts/4.x/api/utils#ECDSA)
- [MetaMask Snaps](https://metamask.io/snaps/)

## 🚨 Production Checklist

Before mainnet deployment:

- [ ] Audit smart contracts (especially signature validation)
- [ ] Set up monitoring for relayer (uptime, balance alerts)
- [ ] Implement robust rate limiting (Redis + IP tracking)
- [ ] Configure gas price strategies (EIP-1559 support)
- [ ] Add fallback to standard transactions if relayer is down
- [ ] Set up analytics for gas spending (Grafana/Datadog)
- [ ] Document user recovery flows
- [ ] Test with different wallet types (MetaMask, WalletConnect, etc.)

## 💡 Best Practices

1. **Always validate signatures on-chain** - Never trust relayer
2. **Use unique nonces** - Prevent replay attacks
3. **Include contract address + chain ID in signatures** - Prevent cross-contract/chain attacks
4. **Monitor relayer balance** - Auto-top-up or alert when low
5. **Fallback to standard txs** - If relayer is down, let users pay gas
6. **Batch when possible** - Save on signature requests
7. **Clear UX indicators** - Show "gasless" badge prominently

---

Built with 🛹 for skaters by skaters
