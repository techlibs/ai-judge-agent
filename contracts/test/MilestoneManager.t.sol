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
