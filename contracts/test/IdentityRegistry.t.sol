// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry public registry;
    address public admin;
    address public registrar;
    address public unauthorized;

    string constant AGENT_URI = "bafybeig1234abcd";

    function setUp() public {
        admin = address(this);
        registrar = makeAddr("registrar");
        unauthorized = makeAddr("unauthorized");

        registry = new IdentityRegistry();
        registry.grantRole(registry.REGISTRAR_ROLE(), registrar);
    }

    function test_register_withURI_success() public {
        vm.prank(registrar);
        uint256 agentId = registry.register(AGENT_URI);

        assertEq(agentId, 0);
        assertEq(registry.ownerOf(0), registrar);
        assertEq(registry.getAgentURI(0), AGENT_URI);
        assertEq(registry.totalSupply(), 1);
    }

    function test_register_withURIAndMetadata_success() public {
        IdentityRegistry.MetadataEntry[] memory metadata = new IdentityRegistry.MetadataEntry[](2);
        metadata[0] = IdentityRegistry.MetadataEntry("scoringDimension", bytes("technical_feasibility"));
        metadata[1] = IdentityRegistry.MetadataEntry("promptVersion", bytes("v1.0"));

        vm.prank(registrar);
        uint256 agentId = registry.register(AGENT_URI, metadata);

        assertEq(agentId, 0);
        assertEq(registry.getMetadata(0, "scoringDimension"), bytes("technical_feasibility"));
        assertEq(registry.getMetadata(0, "promptVersion"), bytes("v1.0"));
    }

    function test_register_noArgs_success() public {
        vm.prank(registrar);
        uint256 agentId = registry.register();

        assertEq(agentId, 0);
        assertEq(registry.ownerOf(0), registrar);
    }

    function test_register_emitsEvent() public {
        vm.prank(registrar);
        vm.expectEmit(true, true, false, true);
        emit IdentityRegistry.Registered(0, AGENT_URI, registrar);

        registry.register(AGENT_URI);
    }

    function test_register_autoIncrements() public {
        vm.startPrank(registrar);
        uint256 id0 = registry.register(AGENT_URI);
        uint256 id1 = registry.register("bafybeig5678");
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(registry.totalSupply(), 2);
    }

    function test_register_revertsForUnauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                unauthorized,
                registry.REGISTRAR_ROLE()
            )
        );
        registry.register(AGENT_URI);
    }

    function test_register_revertsWhenPaused() public {
        registry.pause();

        vm.prank(registrar);
        vm.expectRevert();
        registry.register(AGENT_URI);
    }

    function test_register_revertsMaxSupply() public {
        vm.startPrank(registrar);
        for (uint256 i = 0; i < 1000; i++) {
            registry.register();
        }

        vm.expectRevert(IdentityRegistry.MaxSupplyReached.selector);
        registry.register();
        vm.stopPrank();
    }

    function test_register_revertsURITooLong() public {
        bytes memory longURI = new bytes(257);
        for (uint256 i = 0; i < 257; i++) {
            longURI[i] = "a";
        }

        vm.prank(registrar);
        vm.expectRevert(
            abi.encodeWithSelector(IdentityRegistry.URITooLong.selector, 257)
        );
        registry.register(string(longURI));
    }

    function test_soulbound_transferBlocked() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        vm.prank(registrar);
        vm.expectRevert(IdentityRegistry.SoulboundTransferDisabled.selector);
        registry.transferFrom(registrar, unauthorized, 0);
    }

    function test_soulbound_safeTransferBlocked() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        vm.prank(registrar);
        vm.expectRevert(IdentityRegistry.SoulboundTransferDisabled.selector);
        registry.safeTransferFrom(registrar, unauthorized, 0);
    }

    function test_setAgentURI_success() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        string memory newURI = "bafybeig9999";
        vm.prank(registrar);
        registry.setAgentURI(0, newURI);

        assertEq(registry.getAgentURI(0), newURI);
    }

    function test_setAgentURI_emitsEvent() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        string memory newURI = "bafybeig9999";
        vm.prank(registrar);
        vm.expectEmit(true, true, false, true);
        emit IdentityRegistry.URIUpdated(0, newURI, registrar);

        registry.setAgentURI(0, newURI);
    }

    function test_setAgentURI_revertsURITooLong() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        bytes memory longURI = new bytes(257);
        for (uint256 i = 0; i < 257; i++) {
            longURI[i] = "a";
        }

        vm.prank(registrar);
        vm.expectRevert(
            abi.encodeWithSelector(IdentityRegistry.URITooLong.selector, 257)
        );
        registry.setAgentURI(0, string(longURI));
    }

    function test_setAgentURI_revertsNotOwner() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(IdentityRegistry.NotOwnerOrApproved.selector, 0)
        );
        registry.setAgentURI(0, "new");
    }

    function test_setMetadata_success() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        vm.prank(registrar);
        registry.setMetadata(0, "scoringDimension", bytes("impact_potential"));

        assertEq(
            registry.getMetadata(0, "scoringDimension"),
            bytes("impact_potential")
        );
    }

    function test_setMetadata_emitsEvent() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        vm.prank(registrar);
        vm.expectEmit(true, false, false, true);
        emit IdentityRegistry.MetadataSet(
            0,
            "scoringDimension",
            "scoringDimension",
            bytes("impact_potential")
        );

        registry.setMetadata(0, "scoringDimension", bytes("impact_potential"));
    }

    function test_setMetadata_revertsKeyTooLong() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        bytes memory longKey = new bytes(65);
        for (uint256 i = 0; i < 65; i++) {
            longKey[i] = "a";
        }

        vm.prank(registrar);
        vm.expectRevert(
            abi.encodeWithSelector(IdentityRegistry.MetadataKeyTooLong.selector, 65)
        );
        registry.setMetadata(0, string(longKey), bytes("value"));
    }

    function test_setMetadata_revertsValueTooLong() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        bytes memory longValue = new bytes(1025);
        for (uint256 i = 0; i < 1025; i++) {
            longValue[i] = "a";
        }

        vm.prank(registrar);
        vm.expectRevert(
            abi.encodeWithSelector(IdentityRegistry.MetadataValueTooLong.selector, 1025)
        );
        registry.setMetadata(0, "key", longValue);
    }

    function test_setMetadata_revertsNotOwner() public {
        vm.prank(registrar);
        registry.register(AGENT_URI);

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(IdentityRegistry.NotOwnerOrApproved.selector, 0)
        );
        registry.setMetadata(0, "key", bytes("value"));
    }

    function test_pauseUnpause() public {
        registry.pause();
        assertTrue(registry.paused());

        registry.unpause();
        assertFalse(registry.paused());
    }

    function test_supportsInterface() public view {
        // ERC-721
        assertTrue(registry.supportsInterface(0x80ac58cd));
        // AccessControl
        assertTrue(registry.supportsInterface(0x7965db0b));
    }
}
