# Contract Deployment Guide

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) installed (`forge`, `cast`, `anvil`)
- Deployer wallet funded with ETH on target network
- (Mainnet) `BASESCAN_API_KEY` for contract verification — get one at [basescan.org](https://basescan.org/myapikey)
- (Mainnet) Hardware wallet (Ledger) recommended

## Networks

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Local Anvil | 31337 | `http://127.0.0.1:8546` | — |
| Base Sepolia | 84532 | `https://sepolia.base.org` | [sepolia.basescan.org](https://sepolia.basescan.org) |
| Base Mainnet | 8453 | `https://mainnet.base.org` | [basescan.org](https://basescan.org) |

## Contracts Deployed

| Contract | Dependencies | Purpose |
|----------|-------------|---------|
| IdentityRegistry | — | ERC-721 soulbound agent identity |
| EvaluationRegistry | — | Store evaluation scores with IPFS CIDs |
| ReputationRegistry | IdentityRegistry | Agent reputation feedback |
| ValidationRegistry | IdentityRegistry | Cross-validation requests |
| MilestoneManager | matching pool address | Fund release with score-based bonus |
| DisputeRegistry | — | Dispute resolution with voting |

## Local Development (Anvil)

```bash
# Start local testnet (10 pre-funded accounts with 10000 ETH each)
anvil --port 8546 &

# Deploy using Anvil default account #0
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url local \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

## Base Sepolia (Testnet)

```bash
# Fund deployer via Coinbase CDP SDK faucet (see below)
# Or manually via https://faucets.chain.link/base-sepolia

cd contracts
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify
```

### CDP Faucet (Programmatic)

```javascript
const { Coinbase, ExternalAddress } = require("@coinbase/coinbase-sdk");
new Coinbase({
  apiKeyName: "YOUR_CDP_API_KEY_ID",
  privateKey: "YOUR_CDP_API_KEY_SECRET"
});
await new ExternalAddress("base-sepolia", "DEPLOYER_ADDRESS").faucet();
```

## Base Mainnet

### Cost Estimate

Total deployment: ~7.8M gas = **$0.02 to $0.10 USD** depending on gas conditions.
Fund the deployer with **0.001 ETH** (~$2.50) for ample margin.

Per-transaction costs (submitScore, register, etc.): ~$0.001-0.005 each.

### Deploy with Private Key

```bash
cd contracts
BASESCAN_API_KEY=your_key \
forge script script/Deploy.s.sol \
  --rpc-url base \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify
```

### Deploy with Hardware Wallet (Recommended)

```bash
cd contracts
BASESCAN_API_KEY=your_key \
forge script script/Deploy.s.sol \
  --rpc-url base \
  --ledger \
  --broadcast \
  --verify
```

### Custom Matching Pool (Multisig)

By default, MilestoneManager uses the deployer as the matching pool. For mainnet, set a multisig:

```bash
MATCHING_POOL=0xYourSafeMultisigAddress \
forge script script/Deploy.s.sol \
  --rpc-url base \
  --ledger \
  --broadcast \
  --verify
```

## Post-Deploy Checklist

1. **Update `.env.local`** with deployed contract addresses and set `NEXT_PUBLIC_CHAIN_ID`
2. **Verify contracts on Basescan** — should happen automatically with `--verify` flag
3. **Transfer admin roles** to a multisig (Safe) if not deploying from one:
   ```bash
   # Grant admin role to multisig
   cast send $CONTRACT --rpc-url base \
     "grantRole(bytes32,address)" \
     0x0000000000000000000000000000000000000000000000000000000000000000 \
     $MULTISIG_ADDRESS

   # Revoke admin from deployer
   cast send $CONTRACT --rpc-url base \
     "revokeRole(bytes32,address)" \
     0x0000000000000000000000000000000000000000000000000000000000000000 \
     $DEPLOYER_ADDRESS
   ```
4. **Test a read call** to confirm deployment:
   ```bash
   cast call $IDENTITY_REGISTRY --rpc-url base "totalSupply()(uint256)"
   ```

## Emergency Procedures

All contracts have `Pausable`. The `DEFAULT_ADMIN_ROLE` holder can pause:

```bash
cast send $CONTRACT --rpc-url base "pause()"
```

To unpause after resolving the issue:

```bash
cast send $CONTRACT --rpc-url base "unpause()"
```

## Environment Variables

After deployment, update `.env.local`:

```bash
# Switch to mainnet
NEXT_PUBLIC_CHAIN_ID=8453
BASE_SEPOLIA_RPC_URL=https://mainnet.base.org

# Contract addresses from deploy output
NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_EVALUATION_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_VALIDATION_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_MILESTONE_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_DISPUTE_REGISTRY_ADDRESS=0x...
```
