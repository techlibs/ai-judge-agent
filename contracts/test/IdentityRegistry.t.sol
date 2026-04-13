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
