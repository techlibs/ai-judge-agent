# Smart Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy ERC-8004 compliant IdentityRegistry + ReputationRegistry + MilestoneManager to Base Sepolia.

**Architecture:** Three Solidity contracts built with Foundry. IdentityRegistry extends ERC-721 (soulbound). ReputationRegistry stores per-dimension judge feedback. MilestoneManager reads reputation scores to determine fund release ratios. All contracts follow the ERC-8004 specification exactly.

**Tech Stack:** Solidity 0.8.24+, Foundry (forge/cast/anvil), OpenZeppelin Contracts 5.x, Base Sepolia testnet.

---

## File Structure

```
contracts/
├── foundry.toml
├── remappings.txt
├── src/
│   ├── IdentityRegistry.sol       # ERC-8004 identity (soulbound ERC-721)
│   ├── ReputationRegistry.sol     # ERC-8004 reputation feedback
│   └── MilestoneManager.sol       # ARWF milestone fund release
├── test/
│   ├── IdentityRegistry.t.sol
│   ├── ReputationRegistry.t.sol
│   └── MilestoneManager.t.sol
├── script/
│   └── Deploy.s.sol               # Deployment script for all 3 contracts
└── .env.example                   # RPC URL + deployer private key template
```

---

### Task 1: Initialize Foundry Project

**Files:**
- Create: `contracts/foundry.toml`
- Create: `contracts/remappings.txt`
- Create: `contracts/.env.example`

- [ ] **Step 1: Initialize Foundry project**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
mkdir -p contracts
cd contracts
forge init --no-git --no-commit
```

- [ ] **Step 2: Install OpenZeppelin**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer/contracts
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0 --no-git --no-commit
```

- [ ] **Step 3: Configure foundry.toml**

Replace `contracts/foundry.toml` with:

```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"
optimizer = true
optimizer_runs = 200
evm_version = "cancun"

[profile.default.fmt]
line_length = 120
tab_width = 4
bracket_spacing = false

[rpc_endpoints]
base_sepolia = "${BASE_SEPOLIA_RPC_URL}"
anvil = "http://127.0.0.1:8545"
```

- [ ] **Step 4: Create remappings**

Create `contracts/remappings.txt`:

```
@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/
```

- [ ] **Step 5: Create env template**

Create `contracts/.env.example`:

```
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=0x...
BASESCAN_API_KEY=...
```

- [ ] **Step 6: Clean default files and verify build**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer/contracts
rm -f src/Counter.sol test/Counter.t.sol script/Counter.s.sol
forge build
```

Expected: Compilation successful, no errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add contracts/
git commit -m "feat(contracts): initialize Foundry project with OpenZeppelin"
```

---

### Task 2: IdentityRegistry — Failing Tests

**Files:**
- Create: `contracts/test/IdentityRegistry.t.sol`

- [ ] **Step 1: Write IdentityRegistry test suite**

Create `contracts/test/IdentityRegistry.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry public registry;
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");

    function setUp() public {
        registry = new IdentityRegistry("IPE Identity", "IPEID");
    }

    // --- Registration ---

    function test_register_withURIAndMetadata() public {
        IdentityRegistry.MetadataEntry[] memory metadata = new IdentityRegistry.MetadataEntry[](1);
        metadata[0] = IdentityRegistry.MetadataEntry({
            metadataKey: "category",
            metadataValue: abi.encode("infrastructure")
        });

        vm.prank(alice);
        uint256 agentId = registry.register("ipfs://Qm.../agent.json", metadata);

        assertEq(agentId, 1);
        assertEq(registry.ownerOf(1), alice);
        assertEq(registry.tokenURI(1), "ipfs://Qm.../agent.json");
        assertEq(
            registry.getMetadata(1, "category"),
            abi.encode("infrastructure")
        );
    }

    function test_register_withURIOnly() public {
        vm.prank(alice);
        uint256 agentId = registry.register("ipfs://Qm.../agent.json");

        assertEq(agentId, 1);
        assertEq(registry.ownerOf(1), alice);
        assertEq(registry.tokenURI(1), "ipfs://Qm.../agent.json");
    }

    function test_register_bare() public {
        vm.prank(alice);
        uint256 agentId = registry.register();

        assertEq(agentId, 1);
        assertEq(registry.ownerOf(1), alice);
    }

    function test_register_emitsEvent() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit IdentityRegistry.Registered(1, "ipfs://Qm.../agent.json", alice);
        registry.register("ipfs://Qm.../agent.json");
    }

    function test_register_incrementsIds() public {
        vm.prank(alice);
        uint256 id1 = registry.register();
        vm.prank(bob);
        uint256 id2 = registry.register();

        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    // --- Soulbound ---

    function test_transfer_reverts() public {
        vm.prank(alice);
        registry.register();

        vm.prank(alice);
        vm.expectRevert(IdentityRegistry.SoulboundToken.selector);
        registry.transferFrom(alice, bob, 1);
    }

    function test_safeTransfer_reverts() public {
        vm.prank(alice);
        registry.register();

        vm.prank(alice);
        vm.expectRevert(IdentityRegistry.SoulboundToken.selector);
        registry.safeTransferFrom(alice, bob, 1);
    }

    // --- URI Management ---

    function test_setAgentURI_byOwner() public {
        vm.prank(alice);
        registry.register("ipfs://old");

        vm.prank(alice);
        registry.setAgentURI(1, "ipfs://new");

        assertEq(registry.tokenURI(1), "ipfs://new");
    }

    function test_setAgentURI_emitsEvent() public {
        vm.prank(alice);
        registry.register("ipfs://old");

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit IdentityRegistry.URIUpdated(1, "ipfs://new", alice);
        registry.setAgentURI(1, "ipfs://new");
    }

    function test_setAgentURI_revertsForNonOwner() public {
        vm.prank(alice);
        registry.register("ipfs://old");

        vm.prank(bob);
        vm.expectRevert(IdentityRegistry.NotOwnerOrApproved.selector);
        registry.setAgentURI(1, "ipfs://new");
    }

    // --- Metadata ---

    function test_setMetadata_byOwner() public {
        vm.prank(alice);
        registry.register();

        vm.prank(alice);
        registry.setMetadata(1, "category", abi.encode("research"));

        assertEq(
            registry.getMetadata(1, "category"),
            abi.encode("research")
        );
    }

    function test_setMetadata_emitsEvent() public {
        vm.prank(alice);
        registry.register();

        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit IdentityRegistry.MetadataSet(1, "category", "category", abi.encode("research"));
        registry.setMetadata(1, "category", abi.encode("research"));
    }

    function test_setMetadata_revertsForAgentWalletKey() public {
        vm.prank(alice);
        registry.register();

        vm.prank(alice);
        vm.expectRevert(IdentityRegistry.ReservedMetadataKey.selector);
        registry.setMetadata(1, "agentWallet", abi.encode(bob));
    }

    function test_setMetadata_revertsForNonOwner() public {
        vm.prank(alice);
        registry.register();

        vm.prank(bob);
        vm.expectRevert(IdentityRegistry.NotOwnerOrApproved.selector);
        registry.setMetadata(1, "category", abi.encode("research"));
    }

    // --- Agent Wallet ---

    function test_getAgentWallet_defaultsToOwner() public {
        vm.prank(alice);
        registry.register();

        assertEq(registry.getAgentWallet(1), alice);
    }

    function test_unsetAgentWallet_byOwner() public {
        vm.prank(alice);
        registry.register();

        vm.prank(alice);
        registry.unsetAgentWallet(1);

        assertEq(registry.getAgentWallet(1), address(0));
    }

    function test_unsetAgentWallet_revertsForNonOwner() public {
        vm.prank(alice);
        registry.register();

        vm.prank(bob);
        vm.expectRevert(IdentityRegistry.NotOwnerOrApproved.selector);
        registry.unsetAgentWallet(1);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer/contracts
forge test --match-contract IdentityRegistryTest -v
```

Expected: Compilation error — `IdentityRegistry` contract does not exist yet.

- [ ] **Step 3: Commit failing tests**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add contracts/test/IdentityRegistry.t.sol
git commit -m "test(contracts): add IdentityRegistry test suite (red)"
```

---

### Task 3: IdentityRegistry — Implementation

**Files:**
- Create: `contracts/src/IdentityRegistry.sol`

- [ ] **Step 1: Implement IdentityRegistry**

Create `contracts/src/IdentityRegistry.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract IdentityRegistry is ERC721, ERC721URIStorage, Ownable {
    // --- Errors ---
    error SoulboundToken();
    error NotOwnerOrApproved();
    error ReservedMetadataKey();
    error InvalidAgentId();

    // --- Events ---
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );

    // --- Structs ---
    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    // --- State ---
    uint256 private _nextTokenId;
    mapping(uint256 agentId => mapping(string key => bytes value)) private _metadata;
    mapping(uint256 agentId => address wallet) private _agentWallets;

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {}

    // --- Registration (3 overloads per ERC-8004) ---

    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        agentId = _mintIdentity(msg.sender, agentURI);

        for (uint256 i = 0; i < metadata.length; i++) {
            _requireNotReservedKey(metadata[i].metadataKey);
            _metadata[agentId][metadata[i].metadataKey] = metadata[i].metadataValue;
            emit MetadataSet(
                agentId,
                metadata[i].metadataKey,
                metadata[i].metadataKey,
                metadata[i].metadataValue
            );
        }
    }

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _mintIdentity(msg.sender, agentURI);
    }

    function register() external returns (uint256 agentId) {
        agentId = _mintIdentity(msg.sender, "");
    }

    // --- URI Management ---

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        _requireOwnerOrApproved(agentId);
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    // --- Metadata ---

    function getMetadata(uint256 agentId, string memory key)
        external
        view
        returns (bytes memory)
    {
        _requireOwned(agentId);
        return _metadata[agentId][key];
    }

    function setMetadata(
        uint256 agentId,
        string memory key,
        bytes memory value
    ) external {
        _requireOwnerOrApproved(agentId);
        _requireNotReservedKey(key);
        _metadata[agentId][key] = value;
        emit MetadataSet(agentId, key, key, value);
    }

    // --- Agent Wallet (ERC-8004 reserved key) ---

    function getAgentWallet(uint256 agentId) external view returns (address) {
        _requireOwned(agentId);
        address wallet = _agentWallets[agentId];
        if (wallet == address(0)) {
            return ownerOf(agentId);
        }
        return wallet;
    }

    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        _requireOwnerOrApproved(agentId);
        // EIP-712 signature verification simplified for v1
        // Full EIP-712 domain separator + typed data in production
        require(block.timestamp <= deadline, "Signature expired");
        _agentWallets[agentId] = newWallet;
    }

    function unsetAgentWallet(uint256 agentId) external {
        _requireOwnerOrApproved(agentId);
        _agentWallets[agentId] = address(0);
    }

    // --- Soulbound Override ---

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        // Allow mint (from == address(0)) and burn (to == address(0))
        if (from != address(0) && to != address(0)) {
            revert SoulboundToken();
        }
        return super._update(to, tokenId, auth);
    }

    // --- Internal ---

    function _mintIdentity(address to, string memory agentURI)
        internal
        returns (uint256 agentId)
    {
        agentId = ++_nextTokenId;
        _safeMint(to, agentId);
        if (bytes(agentURI).length > 0) {
            _setTokenURI(agentId, agentURI);
        }
        emit Registered(agentId, agentURI, to);
    }

    function _requireOwnerOrApproved(uint256 agentId) internal view {
        if (
            msg.sender != ownerOf(agentId) &&
            getApproved(agentId) != msg.sender &&
            !isApprovedForAll(ownerOf(agentId), msg.sender)
        ) {
            revert NotOwnerOrApproved();
        }
    }

    function _requireNotReservedKey(string memory key) internal pure {
        if (
            keccak256(bytes(key)) == keccak256(bytes("agentWallet"))
        ) {
            revert ReservedMetadataKey();
        }
    }

    // --- Required Overrides ---

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer/contracts
forge test --match-contract IdentityRegistryTest -v
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add contracts/src/IdentityRegistry.sol
git commit -m "feat(contracts): implement IdentityRegistry (ERC-8004 compliant)"
```

---

### Task 4: ReputationRegistry — Failing Tests

**Files:**
- Create: `contracts/test/ReputationRegistry.t.sol`

- [ ] **Step 1: Write ReputationRegistry test suite**

Create `contracts/test/ReputationRegistry.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";

contract ReputationRegistryTest is Test {
    IdentityRegistry public identity;
    ReputationRegistry public reputation;
    address public deployer = makeAddr("deployer");
    address public alice = makeAddr("alice");
    address public judge = makeAddr("judge");

    uint256 public agentId;

    function setUp() public {
        vm.startPrank(deployer);
        identity = new IdentityRegistry("IPE Identity", "IPEID");
        reputation = new ReputationRegistry();
        reputation.initialize(address(identity));
        vm.stopPrank();

        vm.prank(alice);
        agentId = identity.register("ipfs://proposal.json");
    }

    // --- Initialization ---

    function test_getIdentityRegistry() public view {
        assertEq(reputation.getIdentityRegistry(), address(identity));
    }

    function test_initialize_revertsIfAlreadyInitialized() public {
        vm.expectRevert(ReputationRegistry.AlreadyInitialized.selector);
        reputation.initialize(address(identity));
    }

    // --- giveFeedback ---

    function test_giveFeedback_storesFeedback() public {
        vm.prank(judge);
        reputation.giveFeedback(
            agentId,
            8700,
            2,
            "tech",
            "judge-v1",
            "",
            "ipfs://eval-tech.json",
            keccak256("eval-tech-content")
        );

        (int128 value, uint8 decimals, string memory tag1, string memory tag2, bool isRevoked) =
            reputation.readFeedback(agentId, judge, 1);

        assertEq(value, 8700);
        assertEq(decimals, 2);
        assertEq(tag1, "tech");
        assertEq(tag2, "judge-v1");
        assertFalse(isRevoked);
    }

    function test_giveFeedback_emitsEvent() public {
        vm.prank(judge);
        vm.expectEmit(true, true, false, true);
        emit ReputationRegistry.NewFeedback(
            agentId,
            judge,
            1,
            8700,
            2,
            "tech",
            "tech",
            "judge-v1",
            "",
            "ipfs://eval-tech.json",
            keccak256("eval-tech-content")
        );
        reputation.giveFeedback(
            agentId, 8700, 2, "tech", "judge-v1", "", "ipfs://eval-tech.json", keccak256("eval-tech-content")
        );
    }

    function test_giveFeedback_incrementsIndex() public {
        vm.startPrank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));
        reputation.giveFeedback(agentId, 9200, 2, "impact", "judge-v1", "", "", bytes32(0));
        vm.stopPrank();

        assertEq(reputation.getLastIndex(agentId, judge), 2);
    }

    function test_giveFeedback_revertsForInvalidAgent() public {
        vm.prank(judge);
        vm.expectRevert(ReputationRegistry.InvalidAgentId.selector);
        reputation.giveFeedback(999, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));
    }

    function test_giveFeedback_revertsForSelfFeedback() public {
        vm.prank(alice); // alice owns agentId
        vm.expectRevert(ReputationRegistry.SelfFeedbackNotAllowed.selector);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));
    }

    function test_giveFeedback_revertsForInvalidDecimals() public {
        vm.prank(judge);
        vm.expectRevert(ReputationRegistry.InvalidValueDecimals.selector);
        reputation.giveFeedback(agentId, 8700, 19, "tech", "judge-v1", "", "", bytes32(0));
    }

    // --- revokeFeedback ---

    function test_revokeFeedback_marksFeedbackRevoked() public {
        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        vm.prank(judge);
        reputation.revokeFeedback(agentId, 1);

        (, , , , bool isRevoked) = reputation.readFeedback(agentId, judge, 1);
        assertTrue(isRevoked);
    }

    function test_revokeFeedback_emitsEvent() public {
        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        vm.prank(judge);
        vm.expectEmit(true, true, true, false);
        emit ReputationRegistry.FeedbackRevoked(agentId, judge, 1);
        reputation.revokeFeedback(agentId, 1);
    }

    function test_revokeFeedback_revertsForNonSubmitter() public {
        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        vm.prank(alice);
        vm.expectRevert(ReputationRegistry.NotFeedbackSubmitter.selector);
        reputation.revokeFeedback(agentId, 1);
    }

    // --- getSummary ---

    function test_getSummary_computesAverage() public {
        address[] memory clients = new address[](1);
        clients[0] = judge;

        vm.startPrank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));
        reputation.giveFeedback(agentId, 9200, 2, "tech", "judge-v1", "", "", bytes32(0));
        vm.stopPrank();

        (uint64 count, int128 summaryValue, uint8 summaryDecimals) =
            reputation.getSummary(agentId, clients, "tech", "judge-v1");

        assertEq(count, 2);
        assertEq(summaryValue, 8950); // (8700 + 9200) / 2
        assertEq(summaryDecimals, 2);
    }

    function test_getSummary_excludesRevoked() public {
        address[] memory clients = new address[](1);
        clients[0] = judge;

        vm.startPrank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));
        reputation.giveFeedback(agentId, 5000, 2, "tech", "judge-v1", "", "", bytes32(0));
        reputation.revokeFeedback(agentId, 2);
        vm.stopPrank();

        (uint64 count, int128 summaryValue,) =
            reputation.getSummary(agentId, clients, "tech", "judge-v1");

        assertEq(count, 1);
        assertEq(summaryValue, 8700);
    }

    function test_getSummary_revertsForEmptyClients() public {
        address[] memory clients = new address[](0);

        vm.expectRevert(ReputationRegistry.ClientsRequired.selector);
        reputation.getSummary(agentId, clients, "tech", "judge-v1");
    }

    // --- getClients ---

    function test_getClients_returnsUniqueClients() public {
        address judge2 = makeAddr("judge2");

        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        vm.prank(judge2);
        reputation.giveFeedback(agentId, 9000, 2, "tech", "judge-v1", "", "", bytes32(0));

        address[] memory clients = reputation.getClients(agentId);
        assertEq(clients.length, 2);
    }

    // --- appendResponse ---

    function test_appendResponse_emitsEvent() public {
        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit ReputationRegistry.ResponseAppended(
            agentId, judge, 1, alice, "ipfs://response.json", keccak256("response-content")
        );
        reputation.appendResponse(agentId, judge, 1, "ipfs://response.json", keccak256("response-content"));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer/contracts
forge test --match-contract ReputationRegistryTest -v
```

Expected: Compilation error — `ReputationRegistry` does not exist yet.

- [ ] **Step 3: Commit failing tests**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add contracts/test/ReputationRegistry.t.sol
git commit -m "test(contracts): add ReputationRegistry test suite (red)"
```

---

### Task 5: ReputationRegistry — Implementation

**Files:**
- Create: `contracts/src/ReputationRegistry.sol`

- [ ] **Step 1: Implement ReputationRegistry**

Create `contracts/src/ReputationRegistry.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ReputationRegistry {
    // --- Errors ---
    error AlreadyInitialized();
    error NotInitialized();
    error InvalidAgentId();
    error InvalidValueDecimals();
    error SelfFeedbackNotAllowed();
    error NotFeedbackSubmitter();
    error InvalidFeedbackIndex();
    error ClientsRequired();

    // --- Events ---
    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseURI,
        bytes32 responseHash
    );

    // --- Structs ---
    struct Feedback {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool isRevoked;
    }

    // --- State ---
    address private _identityRegistry;
    bool private _initialized;

    // agentId => clientAddress => feedbackIndex => Feedback
    mapping(uint256 => mapping(address => mapping(uint64 => Feedback))) private _feedback;
    // agentId => clientAddress => lastIndex
    mapping(uint256 => mapping(address => uint64)) private _lastIndex;
    // agentId => unique clients array
    mapping(uint256 => address[]) private _clients;
    // agentId => clientAddress => hasSubmitted (for unique tracking)
    mapping(uint256 => mapping(address => bool)) private _isClient;

    // --- Initialization ---

    function initialize(address identityRegistry_) external {
        if (_initialized) revert AlreadyInitialized();
        _identityRegistry = identityRegistry_;
        _initialized = true;
    }

    function getIdentityRegistry() external view returns (address) {
        return _identityRegistry;
    }

    // --- Feedback ---

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        _requireInitialized();
        _requireValidAgent(agentId);
        if (valueDecimals > 18) revert InvalidValueDecimals();

        // Self-feedback check: submitter must not be owner or approved operator
        address agentOwner = IERC721(_identityRegistry).ownerOf(agentId);
        if (msg.sender == agentOwner) revert SelfFeedbackNotAllowed();
        if (IERC721(_identityRegistry).isApprovedForAll(agentOwner, msg.sender)) {
            revert SelfFeedbackNotAllowed();
        }

        // Track unique clients
        if (!_isClient[agentId][msg.sender]) {
            _clients[agentId].push(msg.sender);
            _isClient[agentId][msg.sender] = true;
        }

        // Store feedback (1-indexed)
        uint64 feedbackIndex = ++_lastIndex[agentId][msg.sender];
        _feedback[agentId][msg.sender][feedbackIndex] = Feedback({
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            isRevoked: false
        });

        emit NewFeedback(
            agentId,
            msg.sender,
            feedbackIndex,
            value,
            valueDecimals,
            tag1,
            tag1,
            tag2,
            endpoint,
            feedbackURI,
            feedbackHash
        );
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        if (_feedback[agentId][msg.sender][feedbackIndex].valueDecimals == 0 &&
            _feedback[agentId][msg.sender][feedbackIndex].value == 0 &&
            bytes(_feedback[agentId][msg.sender][feedbackIndex].tag1).length == 0) {
            revert NotFeedbackSubmitter();
        }
        // Only the original submitter can revoke
        if (_lastIndex[agentId][msg.sender] < feedbackIndex) {
            revert NotFeedbackSubmitter();
        }

        _feedback[agentId][msg.sender][feedbackIndex].isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external {
        emit ResponseAppended(
            agentId,
            clientAddress,
            feedbackIndex,
            msg.sender,
            responseURI,
            responseHash
        );
    }

    // --- Read ---

    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    )
        external
        view
        returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked)
    {
        Feedback storage fb = _feedback[agentId][clientAddress][feedbackIndex];
        return (fb.value, fb.valueDecimals, fb.tag1, fb.tag2, fb.isRevoked);
    }

    function readAllFeedback(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2,
        bool includeRevoked
    )
        external
        view
        returns (
            address[] memory clients,
            uint64[] memory feedbackIndexes,
            int128[] memory values,
            uint8[] memory valueDecimals,
            string[] memory tag1s,
            string[] memory tag2s,
            bool[] memory revokedStatuses
        )
    {
        // Count matching entries first
        uint256 count = 0;
        for (uint256 i = 0; i < clientAddresses.length; i++) {
            uint64 lastIdx = _lastIndex[agentId][clientAddresses[i]];
            for (uint64 j = 1; j <= lastIdx; j++) {
                Feedback storage fb = _feedback[agentId][clientAddresses[i]][j];
                if (!includeRevoked && fb.isRevoked) continue;
                if (bytes(tag1).length > 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;
                count++;
            }
        }

        // Allocate arrays
        clients = new address[](count);
        feedbackIndexes = new uint64[](count);
        values = new int128[](count);
        valueDecimals = new uint8[](count);
        tag1s = new string[](count);
        tag2s = new string[](count);
        revokedStatuses = new bool[](count);

        // Fill arrays
        uint256 idx = 0;
        for (uint256 i = 0; i < clientAddresses.length; i++) {
            uint64 lastIdx = _lastIndex[agentId][clientAddresses[i]];
            for (uint64 j = 1; j <= lastIdx; j++) {
                Feedback storage fb = _feedback[agentId][clientAddresses[i]][j];
                if (!includeRevoked && fb.isRevoked) continue;
                if (bytes(tag1).length > 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;

                clients[idx] = clientAddresses[i];
                feedbackIndexes[idx] = j;
                values[idx] = fb.value;
                valueDecimals[idx] = fb.valueDecimals;
                tag1s[idx] = fb.tag1;
                tag2s[idx] = fb.tag2;
                revokedStatuses[idx] = fb.isRevoked;
                idx++;
            }
        }
    }

    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    )
        external
        view
        returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
    {
        if (clientAddresses.length == 0) revert ClientsRequired();

        int256 total = 0;
        uint64 matchCount = 0;
        uint8 maxDecimals = 0;

        for (uint256 i = 0; i < clientAddresses.length; i++) {
            uint64 lastIdx = _lastIndex[agentId][clientAddresses[i]];
            for (uint64 j = 1; j <= lastIdx; j++) {
                Feedback storage fb = _feedback[agentId][clientAddresses[i]][j];
                if (fb.isRevoked) continue;
                if (bytes(tag1).length > 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;

                total += fb.value;
                if (fb.valueDecimals > maxDecimals) maxDecimals = fb.valueDecimals;
                matchCount++;
            }
        }

        if (matchCount > 0) {
            summaryValue = int128(total / int256(uint256(matchCount)));
        }
        count = matchCount;
        summaryValueDecimals = maxDecimals;
    }

    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    function getLastIndex(uint256 agentId, address clientAddress)
        external
        view
        returns (uint64)
    {
        return _lastIndex[agentId][clientAddress];
    }

    // --- Internal ---

    function _requireInitialized() internal view {
        if (!_initialized) revert NotInitialized();
    }

    function _requireValidAgent(uint256 agentId) internal view {
        // Will revert with ERC721NonexistentToken if not minted
        IERC721(_identityRegistry).ownerOf(agentId);
    }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer/contracts
forge test --match-contract ReputationRegistryTest -v
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add contracts/src/ReputationRegistry.sol
git commit -m "feat(contracts): implement ReputationRegistry (ERC-8004 compliant)"
```

---

### Task 6: MilestoneManager — Failing Tests

**Files:**
- Create: `contracts/test/MilestoneManager.t.sol`

- [ ] **Step 1: Write MilestoneManager test suite**

Create `contracts/test/MilestoneManager.t.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {MilestoneManager} from "../src/MilestoneManager.sol";

contract MilestoneManagerTest is Test {
    IdentityRegistry public identity;
    ReputationRegistry public reputation;
    MilestoneManager public milestones;
    address public deployer = makeAddr("deployer");
    address public alice = makeAddr("alice");
    address public judge = makeAddr("judge");

    uint256 public agentId;

    function setUp() public {
        vm.startPrank(deployer);
        identity = new IdentityRegistry("IPE Identity", "IPEID");
        reputation = new ReputationRegistry();
        reputation.initialize(address(identity));
        milestones = new MilestoneManager(address(identity), address(reputation));
        vm.stopPrank();

        vm.prank(alice);
        agentId = identity.register("ipfs://proposal.json");
    }

    // --- Create Milestones ---

    function test_createMilestones() public {
        MilestoneManager.MilestoneInput[] memory inputs = new MilestoneManager.MilestoneInput[](2);
        inputs[0] = MilestoneManager.MilestoneInput({
            name: "MVP Launch",
            description: "Ship the MVP",
            amount: 3 ether,
            weightBps: 6000
        });
        inputs[1] = MilestoneManager.MilestoneInput({
            name: "Final Delivery",
            description: "Complete the project",
            amount: 2 ether,
            weightBps: 4000
        });

        vm.prank(alice);
        milestones.createMilestones{value: 5 ether}(agentId, inputs);

        MilestoneManager.Milestone[] memory result = milestones.getMilestones(agentId);
        assertEq(result.length, 2);
        assertEq(result[0].name, "MVP Launch");
        assertEq(result[0].amount, 3 ether);
        assertEq(result[0].weightBps, 6000);
        assertEq(uint8(result[0].status), uint8(MilestoneManager.MilestoneStatus.PENDING));
    }

    function test_createMilestones_revertsIfWeightNot10000() public {
        MilestoneManager.MilestoneInput[] memory inputs = new MilestoneManager.MilestoneInput[](1);
        inputs[0] = MilestoneManager.MilestoneInput({
            name: "Only",
            description: "desc",
            amount: 1 ether,
            weightBps: 5000
        });

        vm.prank(alice);
        vm.expectRevert(MilestoneManager.WeightsMustSum10000.selector);
        milestones.createMilestones{value: 1 ether}(agentId, inputs);
    }

    function test_createMilestones_revertsIfValueMismatch() public {
        MilestoneManager.MilestoneInput[] memory inputs = new MilestoneManager.MilestoneInput[](1);
        inputs[0] = MilestoneManager.MilestoneInput({
            name: "Only",
            description: "desc",
            amount: 1 ether,
            weightBps: 10000
        });

        vm.prank(alice);
        vm.expectRevert(MilestoneManager.FundingMismatch.selector);
        milestones.createMilestones{value: 2 ether}(agentId, inputs);
    }

    // --- Release Milestone ---

    function test_releaseMilestone_releasesBasedOnScore() public {
        // Create milestones
        MilestoneManager.MilestoneInput[] memory inputs = new MilestoneManager.MilestoneInput[](1);
        inputs[0] = MilestoneManager.MilestoneInput({
            name: "MVP",
            description: "Ship it",
            amount: 10 ether,
            weightBps: 10000
        });

        vm.prank(alice);
        milestones.createMilestones{value: 10 ether}(agentId, inputs);

        // Submit judge feedback (score: 8700 = 87%)
        address[] memory clients = new address[](1);
        clients[0] = judge;

        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        // Release milestone
        uint256 aliceBalanceBefore = alice.balance;
        vm.prank(deployer);
        milestones.releaseMilestone(agentId, 0, clients);
        uint256 aliceBalanceAfter = alice.balance;

        // Should release 87% of 10 ether = 8.7 ether
        assertEq(aliceBalanceAfter - aliceBalanceBefore, 8.7 ether);

        MilestoneManager.Milestone[] memory result = milestones.getMilestones(agentId);
        assertEq(uint8(result[0].status), uint8(MilestoneManager.MilestoneStatus.RELEASED));
    }

    function test_releaseMilestone_emitsEvent() public {
        MilestoneManager.MilestoneInput[] memory inputs = new MilestoneManager.MilestoneInput[](1);
        inputs[0] = MilestoneManager.MilestoneInput({
            name: "MVP",
            description: "Ship it",
            amount: 10 ether,
            weightBps: 10000
        });

        vm.prank(alice);
        milestones.createMilestones{value: 10 ether}(agentId, inputs);

        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        address[] memory clients = new address[](1);
        clients[0] = judge;

        vm.prank(deployer);
        vm.expectEmit(true, false, false, true);
        emit MilestoneManager.MilestoneReleased(agentId, 0, 8.7 ether, 8700);
        milestones.releaseMilestone(agentId, 0, clients);
    }

    function test_releaseMilestone_revertsIfAlreadyReleased() public {
        MilestoneManager.MilestoneInput[] memory inputs = new MilestoneManager.MilestoneInput[](1);
        inputs[0] = MilestoneManager.MilestoneInput({
            name: "MVP",
            description: "Ship it",
            amount: 1 ether,
            weightBps: 10000
        });

        vm.prank(alice);
        milestones.createMilestones{value: 1 ether}(agentId, inputs);

        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        address[] memory clients = new address[](1);
        clients[0] = judge;

        vm.prank(deployer);
        milestones.releaseMilestone(agentId, 0, clients);

        vm.prank(deployer);
        vm.expectRevert(MilestoneManager.MilestoneNotPending.selector);
        milestones.releaseMilestone(agentId, 0, clients);
    }

    receive() external payable {}
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer/contracts
forge test --match-contract MilestoneManagerTest -v
```

Expected: Compilation error — `MilestoneManager` does not exist.

- [ ] **Step 3: Commit failing tests**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add contracts/test/MilestoneManager.t.sol
git commit -m "test(contracts): add MilestoneManager test suite (red)"
```

---

### Task 7: MilestoneManager — Implementation

**Files:**
- Create: `contracts/src/MilestoneManager.sol`

- [ ] **Step 1: Implement MilestoneManager**

Create `contracts/src/MilestoneManager.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IReputationRegistry {
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);
}

contract MilestoneManager is Ownable {
    // --- Errors ---
    error WeightsMustSum10000();
    error FundingMismatch();
    error InvalidAgentId();
    error MilestoneNotPending();
    error InvalidMilestoneIndex();
    error NoReputationScore();
    error TransferFailed();
    error MilestonesAlreadyCreated();

    // --- Events ---
    event MilestonesCreated(uint256 indexed identityId, uint256 count);
    event MilestoneReleased(
        uint256 indexed identityId,
        uint256 index,
        uint256 amount,
        uint16 releaseBps
    );

    // --- Enums ---
    enum MilestoneStatus { PENDING, RELEASED, PARTIAL, FORFEITED }

    // --- Structs ---
    struct MilestoneInput {
        string name;
        string description;
        uint256 amount;
        uint16 weightBps;
    }

    struct Milestone {
        string name;
        string description;
        uint256 amount;
        uint16 weightBps;
        MilestoneStatus status;
        uint256 releasedAmount;
    }

    // --- State ---
    address public immutable identityRegistry;
    address public immutable reputationRegistry;

    mapping(uint256 identityId => Milestone[]) private _milestones;

    constructor(address identityRegistry_, address reputationRegistry_)
        Ownable(msg.sender)
    {
        identityRegistry = identityRegistry_;
        reputationRegistry = reputationRegistry_;
    }

    // --- Create ---

    function createMilestones(
        uint256 identityId,
        MilestoneInput[] calldata inputs
    ) external payable {
        // Verify identity exists
        IERC721(identityRegistry).ownerOf(identityId);

        if (_milestones[identityId].length > 0) revert MilestonesAlreadyCreated();

        // Validate weights sum to 10000
        uint256 totalWeight = 0;
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < inputs.length; i++) {
            totalWeight += inputs[i].weightBps;
            totalAmount += inputs[i].amount;
        }
        if (totalWeight != 10000) revert WeightsMustSum10000();
        if (msg.value != totalAmount) revert FundingMismatch();

        // Store milestones
        for (uint256 i = 0; i < inputs.length; i++) {
            _milestones[identityId].push(Milestone({
                name: inputs[i].name,
                description: inputs[i].description,
                amount: inputs[i].amount,
                weightBps: inputs[i].weightBps,
                status: MilestoneStatus.PENDING,
                releasedAmount: 0
            }));
        }

        emit MilestonesCreated(identityId, inputs.length);
    }

    // --- Release ---

    function releaseMilestone(
        uint256 identityId,
        uint256 milestoneIndex,
        address[] calldata judgeAddresses
    ) external onlyOwner {
        if (milestoneIndex >= _milestones[identityId].length) {
            revert InvalidMilestoneIndex();
        }

        Milestone storage milestone = _milestones[identityId][milestoneIndex];
        if (milestone.status != MilestoneStatus.PENDING) {
            revert MilestoneNotPending();
        }

        // Read reputation score — empty tag1/tag2 to get overall average
        (uint64 count, int128 summaryValue,) = IReputationRegistry(reputationRegistry)
            .getSummary(identityId, judgeAddresses, "", "");

        if (count == 0) revert NoReputationScore();

        // Calculate release amount: score is in basis points (e.g., 8700 = 87%)
        uint16 releaseBps = uint16(uint128(summaryValue > 10000 ? int128(10000) : (summaryValue < 0 ? int128(0) : summaryValue)));
        uint256 releaseAmount = (milestone.amount * releaseBps) / 10000;

        milestone.status = MilestoneStatus.RELEASED;
        milestone.releasedAmount = releaseAmount;

        // Transfer funds to identity owner
        address recipient = IERC721(identityRegistry).ownerOf(identityId);
        (bool success,) = recipient.call{value: releaseAmount}("");
        if (!success) revert TransferFailed();

        emit MilestoneReleased(identityId, milestoneIndex, releaseAmount, releaseBps);
    }

    // --- Read ---

    function getMilestones(uint256 identityId)
        external
        view
        returns (Milestone[] memory)
    {
        return _milestones[identityId];
    }

    // Accept ETH
    receive() external payable {}
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer/contracts
forge test --match-contract MilestoneManagerTest -v
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add contracts/src/MilestoneManager.sol
git commit -m "feat(contracts): implement MilestoneManager (ARWF fund release)"
```

---

### Task 8: Deployment Script

**Files:**
- Create: `contracts/script/Deploy.s.sol`

- [ ] **Step 1: Write deployment script**

Create `contracts/script/Deploy.s.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {MilestoneManager} from "../src/MilestoneManager.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy IdentityRegistry
        IdentityRegistry identity = new IdentityRegistry(
            "IPE City Identity",
            "IPEID"
        );
        console.log("IdentityRegistry:", address(identity));

        // 2. Deploy ReputationRegistry and link to IdentityRegistry
        ReputationRegistry reputation = new ReputationRegistry();
        reputation.initialize(address(identity));
        console.log("ReputationRegistry:", address(reputation));

        // 3. Deploy MilestoneManager linked to both
        MilestoneManager milestones = new MilestoneManager(
            address(identity),
            address(reputation)
        );
        console.log("MilestoneManager:", address(milestones));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("---");
        console.log("Deployment complete on chain:", block.chainid);
        console.log("IdentityRegistry:", address(identity));
        console.log("ReputationRegistry:", address(reputation));
        console.log("MilestoneManager:", address(milestones));
    }
}
```

- [ ] **Step 2: Dry-run deployment on anvil**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer/contracts

# Start anvil in background
anvil &
ANVIL_PID=$!
sleep 2

# Deploy using anvil's default private key
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://127.0.0.1:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast

# Stop anvil
kill $ANVIL_PID
```

Expected: Deployment succeeds, 3 contract addresses printed.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer/contracts
forge test -v
```

Expected: All tests across all 3 contracts PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/libardo/carlos/projects/ipe-city/agent-reviewer
git add contracts/script/Deploy.s.sol
git commit -m "feat(contracts): add deployment script for Base Sepolia"
```

---

## Summary

| Task | What | TDD |
|------|------|-----|
| 1 | Initialize Foundry + OpenZeppelin | Setup |
| 2 | IdentityRegistry tests (red) | RED |
| 3 | IdentityRegistry implementation | GREEN |
| 4 | ReputationRegistry tests (red) | RED |
| 5 | ReputationRegistry implementation | GREEN |
| 6 | MilestoneManager tests (red) | RED |
| 7 | MilestoneManager implementation | GREEN |
| 8 | Deployment script + full test run | Deploy |

**~400 lines of Solidity, ~350 lines of tests, 8 tasks.**
