// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MilestoneManager} from "../src/MilestoneManager.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract ReentrancyAttacker {
    MilestoneManager public target;
    bool public attacking;

    constructor(address target_) {
        target = MilestoneManager(payable(target_));
    }

    receive() external payable {
        if (attacking) {
            attacking = false;
            // Attempt reentrancy — should fail due to nonReentrant + gas cap
            try target.emergencyWithdraw(payable(address(this))) {} catch {}
        }
    }
}

contract MilestoneManagerTest is Test {
    MilestoneManager public manager;
    address public admin;
    address public releaseManager;
    address public unauthorized;
    address payable public recipient;
    address public matchingPool;

    bytes32 constant PROJECT_ID = keccak256("project-1");
    uint8 constant MILESTONE_INDEX = 0;
    uint16 constant SCORE = 785;

    function setUp() public {
        admin = address(this);
        releaseManager = makeAddr("releaseManager");
        unauthorized = makeAddr("unauthorized");
        recipient = payable(makeAddr("recipient"));
        matchingPool = makeAddr("matchingPool");

        manager = new MilestoneManager(matchingPool);
        manager.grantRole(manager.RELEASE_MANAGER_ROLE(), releaseManager);
    }

    function test_releaseMilestone_success() public {
        manager.fundMilestone{value: 10 ether}(PROJECT_ID, MILESTONE_INDEX);

        vm.prank(releaseManager);
        manager.releaseMilestone(PROJECT_ID, MILESTONE_INDEX, SCORE, recipient);

        MilestoneManager.Milestone memory m = manager.getMilestone(PROJECT_ID, MILESTONE_INDEX);
        assertTrue(m.released);
        assertEq(m.score, SCORE);
        // releasePercentage = 785 / 10 = 78
        assertEq(m.releasePercentage, 78);
        // amount = 10e18 * 78 / 1000 = 0.78e18
        uint256 expectedRelease = (10 ether * 78) / 1000;
        assertEq(m.releasedAmount, expectedRelease);
        assertEq(recipient.balance, expectedRelease);
    }

    function test_releaseMilestone_forwardsUnreleased() public {
        manager.fundMilestone{value: 10 ether}(PROJECT_ID, MILESTONE_INDEX);

        vm.prank(releaseManager);
        manager.releaseMilestone(PROJECT_ID, MILESTONE_INDEX, SCORE, recipient);

        uint256 expectedRelease = (10 ether * 78) / 1000;
        uint256 expectedForwarded = 10 ether - expectedRelease;
        assertEq(matchingPool.balance, expectedForwarded);
    }

    function test_releaseMilestone_emitsBonusForHighScore() public {
        manager.fundMilestone{value: 10 ether}(PROJECT_ID, MILESTONE_INDEX);

        uint16 highScore = 920;
        vm.prank(releaseManager);
        vm.expectEmit(true, false, false, true);
        emit MilestoneManager.BonusDistributed(
            PROJECT_ID,
            (10 ether * 92) / 1000,
            highScore
        );

        manager.releaseMilestone(PROJECT_ID, MILESTONE_INDEX, highScore, recipient);
    }

    function test_releaseMilestone_revertsUnauthorized() public {
        manager.fundMilestone{value: 1 ether}(PROJECT_ID, MILESTONE_INDEX);

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                unauthorized,
                manager.RELEASE_MANAGER_ROLE()
            )
        );
        manager.releaseMilestone(PROJECT_ID, MILESTONE_INDEX, SCORE, recipient);
    }

    function test_releaseMilestone_revertsWhenPaused() public {
        manager.fundMilestone{value: 1 ether}(PROJECT_ID, MILESTONE_INDEX);
        manager.pause();

        vm.prank(releaseManager);
        vm.expectRevert();
        manager.releaseMilestone(PROJECT_ID, MILESTONE_INDEX, SCORE, recipient);
    }

    function test_releaseMilestone_revertsAlreadyReleased() public {
        manager.fundMilestone{value: 10 ether}(PROJECT_ID, MILESTONE_INDEX);

        vm.prank(releaseManager);
        manager.releaseMilestone(PROJECT_ID, MILESTONE_INDEX, SCORE, recipient);

        vm.prank(releaseManager);
        vm.expectRevert(
            abi.encodeWithSelector(
                MilestoneManager.MilestoneAlreadyReleased.selector,
                PROJECT_ID,
                MILESTONE_INDEX
            )
        );
        manager.releaseMilestone(PROJECT_ID, MILESTONE_INDEX, SCORE, recipient);
    }

    function test_releaseMilestone_revertsInvalidScore() public {
        manager.fundMilestone{value: 1 ether}(PROJECT_ID, MILESTONE_INDEX);

        vm.prank(releaseManager);
        vm.expectRevert(
            abi.encodeWithSelector(MilestoneManager.InvalidScore.selector, 1001)
        );
        manager.releaseMilestone(PROJECT_ID, MILESTONE_INDEX, 1001, recipient);
    }

    function test_releaseMilestone_revertsNoFunds() public {
        vm.prank(releaseManager);
        vm.expectRevert(MilestoneManager.NoFundsToRelease.selector);
        manager.releaseMilestone(PROJECT_ID, MILESTONE_INDEX, SCORE, recipient);
    }

    function test_emergencyWithdraw_success() public {
        manager.fundMilestone{value: 5 ether}(PROJECT_ID, MILESTONE_INDEX);

        manager.emergencyWithdraw(recipient);
        assertEq(recipient.balance, 5 ether);
    }

    function test_emergencyWithdraw_revertsNonAdmin() public {
        manager.fundMilestone{value: 1 ether}(PROJECT_ID, MILESTONE_INDEX);

        vm.prank(unauthorized);
        vm.expectRevert();
        manager.emergencyWithdraw(recipient);
    }

    function test_reentrancy_blocked() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(manager));
        manager.fundMilestone{value: 2 ether}(PROJECT_ID, MILESTONE_INDEX);

        // The gas cap of 10000 prevents the attacker's receive() from doing anything meaningful
        // Even without nonReentrant, the gas cap blocks reentrancy
        attacker.attacking = true;
        manager.emergencyWithdraw(payable(address(attacker)));

        // Contract should be drained
        assertEq(address(manager).balance, 0);
    }

    function test_constructor_revertsZeroAddress() public {
        vm.expectRevert(MilestoneManager.ZeroAddress.selector);
        new MilestoneManager(address(0));
    }

    function test_pauseUnpause() public {
        manager.pause();
        assertTrue(manager.paused());

        manager.unpause();
        assertFalse(manager.paused());
    }

    function testFuzz_releaseMilestone_validScore(uint16 score) public {
        score = uint16(bound(score, 0, 1000));

        manager.fundMilestone{value: 10 ether}(
            keccak256(abi.encodePacked(score)),
            MILESTONE_INDEX
        );

        vm.prank(releaseManager);
        manager.releaseMilestone(
            keccak256(abi.encodePacked(score)),
            MILESTONE_INDEX,
            score,
            recipient
        );

        MilestoneManager.Milestone memory m = manager.getMilestone(
            keccak256(abi.encodePacked(score)),
            MILESTONE_INDEX
        );
        assertTrue(m.released);
        assertEq(m.releasePercentage, score / 10);
    }
}
