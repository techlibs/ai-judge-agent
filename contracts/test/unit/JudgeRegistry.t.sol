// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/core/JudgeRegistry.sol";

contract JudgeRegistryTest is Test {
    JudgeRegistry registry;
    address owner = makeAddr("owner");
    address judge1 = makeAddr("judge1");
    address judge2 = makeAddr("judge2");
    address nonOwner = makeAddr("nonOwner");

    function setUp() public {
        vm.prank(owner);
        registry = new JudgeRegistry();
    }

    // --- Registration ---

    function test_registerJudge_success() public {
        vm.prank(owner);
        uint256 id = registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "Smart contract auditing");

        assertEq(id, 1);
        assertEq(registry.ownerOf(1), judge1);
        assertEq(registry.judgeByWallet(judge1), 1);
        assertTrue(registry.isActiveJudge(1));
        assertEq(registry.totalJudges(), 1);
    }

    function test_registerJudge_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit JudgeRegistry.JudgeRegistered(1, judge1, JudgeRegistry.JudgeRole.Security, "Auditing");
        registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "Auditing");
    }

    function test_registerJudge_incrementsId() public {
        vm.startPrank(owner);
        uint256 id1 = registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "");
        uint256 id2 = registry.registerJudge(judge2, JudgeRegistry.JudgeRole.Impact, "");
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(registry.totalJudges(), 2);
    }

    function test_registerJudge_revertsIfAlreadyRegistered() public {
        vm.startPrank(owner);
        registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "");
        vm.expectRevert(abi.encodeWithSelector(JudgeRegistry.AlreadyRegistered.selector, judge1));
        registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Impact, "Different role");
        vm.stopPrank();
    }

    function test_registerJudge_revertsIfNotOwner() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "");
    }

    // --- Activation/Deactivation ---

    function test_deactivateJudge() public {
        vm.startPrank(owner);
        uint256 id = registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "");
        registry.deactivateJudge(id);
        vm.stopPrank();

        assertFalse(registry.isActiveJudge(id));
    }

    function test_activateJudge() public {
        vm.startPrank(owner);
        uint256 id = registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "");
        registry.deactivateJudge(id);
        registry.activateJudge(id);
        vm.stopPrank();

        assertTrue(registry.isActiveJudge(id));
    }

    function test_deactivateJudge_revertsIfNotFound() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(JudgeRegistry.JudgeNotFound.selector, 999));
        registry.deactivateJudge(999);
    }

    function test_deactivateJudge_revertsIfNotOwner() public {
        vm.prank(owner);
        registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "");

        vm.prank(nonOwner);
        vm.expectRevert();
        registry.deactivateJudge(1);
    }

    // --- Soulbound ---

    function test_transferFrom_reverts() public {
        vm.prank(owner);
        registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "");

        vm.prank(judge1);
        vm.expectRevert(JudgeRegistry.SoulboundTransfer.selector);
        registry.transferFrom(judge1, judge2, 1);
    }

    function test_safeTransferFrom_reverts() public {
        vm.prank(owner);
        registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "");

        vm.prank(judge1);
        vm.expectRevert(JudgeRegistry.SoulboundTransfer.selector);
        registry.safeTransferFrom(judge1, judge2, 1);
    }

    function test_approve_reverts() public {
        vm.prank(owner);
        registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "");

        vm.prank(judge1);
        vm.expectRevert(JudgeRegistry.SoulboundTransfer.selector);
        registry.approve(judge2, 1);
    }

    function test_setApprovalForAll_reverts() public {
        vm.prank(owner);
        registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Security, "");

        vm.prank(judge1);
        vm.expectRevert(JudgeRegistry.SoulboundTransfer.selector);
        registry.setApprovalForAll(judge2, true);
    }

    // --- Judge data ---

    function test_judgeDataStoredCorrectly() public {
        vm.prank(owner);
        registry.registerJudge(judge1, JudgeRegistry.JudgeRole.Alignment, "IPE City values");

        (JudgeRegistry.JudgeRole role, string memory spec, uint48 regAt, bool active) = registry.judges(1);
        assertEq(uint8(role), uint8(JudgeRegistry.JudgeRole.Alignment));
        assertEq(spec, "IPE City values");
        assertGt(regAt, 0);
        assertTrue(active);
    }
}
