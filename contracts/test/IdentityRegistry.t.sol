// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/IdentityRegistry.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry public registry;
    address public deployer;
    address public user1;
    address public user2;

    function setUp() public {
        deployer = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        registry = new IdentityRegistry();
    }

    function test_register_createsToken() public {
        uint256 tokenId = registry.register(user1, "ipfs://QmTest1");
        assertEq(tokenId, 1);
        assertEq(registry.ownerOf(1), user1);
    }

    function test_register_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit IdentityRegistry.ProjectRegistered(1, user1, "ipfs://QmTest1");
        registry.register(user1, "ipfs://QmTest1");
    }

    function test_register_incrementsTokenId() public {
        uint256 id1 = registry.register(user1, "ipfs://QmTest1");
        uint256 id2 = registry.register(user2, "ipfs://QmTest2");
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_register_revertsWithoutRole() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.register(user1, "ipfs://QmTest1");
    }

    function test_setAgentURI_byOwnerSucceeds() public {
        registry.register(user1, "ipfs://QmOld");
        vm.prank(user1);
        registry.setAgentURI(1, "ipfs://QmNew");
        (, string memory uri) = registry.getMetadata(1);
        assertEq(uri, "ipfs://QmNew");
    }

    function test_setAgentURI_emitsEvent() public {
        registry.register(user1, "ipfs://QmOld");
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit IdentityRegistry.AgentURIUpdated(1, "ipfs://QmNew");
        registry.setAgentURI(1, "ipfs://QmNew");
    }

    function test_setAgentURI_revertsForNonOwner() public {
        registry.register(user1, "ipfs://QmOld");
        vm.prank(user2);
        vm.expectRevert(
            abi.encodeWithSelector(IdentityRegistry.NotTokenOwner.selector, user2, 1)
        );
        registry.setAgentURI(1, "ipfs://QmNew");
    }

    function test_getMetadata_returnsCorrectData() public {
        registry.register(user1, "ipfs://QmTestMeta");
        (address owner, string memory uri) = registry.getMetadata(1);
        assertEq(owner, user1);
        assertEq(uri, "ipfs://QmTestMeta");
    }

    function test_tokenURI_returnsAgentURI() public {
        registry.register(user1, "ipfs://QmTokenURI");
        assertEq(registry.tokenURI(1), "ipfs://QmTokenURI");
    }

    function test_tokenURI_revertsForNonExistent() public {
        vm.expectRevert();
        registry.tokenURI(999);
    }

    function test_soulbound_blockTransfer() public {
        registry.register(user1, "ipfs://QmSoulbound");
        vm.prank(user1);
        vm.expectRevert(IdentityRegistry.SoulboundTransferBlocked.selector);
        registry.transferFrom(user1, user2, 1);
    }

    function test_pause_blocksRegister() public {
        registry.pause();
        vm.expectRevert();
        registry.register(user1, "ipfs://QmPaused");
    }

    function test_unpause_allowsRegister() public {
        registry.pause();
        registry.unpause();
        uint256 tokenId = registry.register(user1, "ipfs://QmUnpaused");
        assertEq(tokenId, 1);
    }

    function test_register_revertsOnURITooLong() public {
        // Create a URI that exceeds 256 bytes
        bytes memory longUri = new bytes(257);
        for (uint256 i; i < 257; ++i) {
            longUri[i] = "a";
        }
        vm.expectRevert(
            abi.encodeWithSelector(IdentityRegistry.URITooLong.selector, 257)
        );
        registry.register(user1, string(longUri));
    }
}
