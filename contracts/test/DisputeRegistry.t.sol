// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DisputeRegistry} from "../src/DisputeRegistry.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract DisputeRegistryTest is Test {
    DisputeRegistry public registry;
    address public admin;
    address public validator;
    address public validator2;
    address public unauthorized;
    address public initiator;

    bytes32 constant PROPOSAL_ID = keccak256("proposal-1");
    string constant EVIDENCE_CID = "bafybeig1234evidence";

    function setUp() public {
        admin = address(this);
        validator = makeAddr("validator");
        validator2 = makeAddr("validator2");
        unauthorized = makeAddr("unauthorized");
        initiator = makeAddr("initiator");

        registry = new DisputeRegistry();
        registry.grantRole(registry.VALIDATOR_ROLE(), validator);
        registry.grantRole(registry.VALIDATOR_ROLE(), validator2);

        vm.deal(initiator, 10 ether);
        vm.deal(validator, 10 ether);
        vm.deal(validator2, 10 ether);
    }

    function test_openDispute_success() public {
        vm.prank(initiator);
        uint256 disputeId = registry.openDispute{value: 0.01 ether}(
            PROPOSAL_ID,
            EVIDENCE_CID
        );

        assertEq(disputeId, 0);

        DisputeRegistry.Dispute memory d = registry.getDispute(0);
        assertEq(d.proposalId, PROPOSAL_ID);
        assertEq(d.initiator, initiator);
        assertEq(d.stakeAmount, 0.01 ether);
        assertEq(d.evidenceCid, EVIDENCE_CID);
        assertEq(uint8(d.status), uint8(DisputeRegistry.DisputeStatus.Open));
        assertGt(d.deadline, 0);
        assertGt(d.createdAt, 0);
    }

    function test_openDispute_emitsEvent() public {
        vm.prank(initiator);
        vm.expectEmit(true, true, true, true);
        emit DisputeRegistry.DisputeOpened(
            0,
            PROPOSAL_ID,
            initiator,
            0.05 ether,
            EVIDENCE_CID,
            uint48(block.timestamp + 3 days)
        );

        registry.openDispute{value: 0.05 ether}(PROPOSAL_ID, EVIDENCE_CID);
    }

    function test_openDispute_revertsInsufficientStake() public {
        vm.prank(initiator);
        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeRegistry.InsufficientStake.selector,
                0.005 ether,
                0.01 ether
            )
        );
        registry.openDispute{value: 0.005 ether}(PROPOSAL_ID, EVIDENCE_CID);
    }

    function test_openDispute_revertsEmptyEvidence() public {
        vm.prank(initiator);
        vm.expectRevert(DisputeRegistry.EmptyEvidenceCid.selector);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, "");
    }

    function test_openDispute_revertsWhenPaused() public {
        registry.pause();

        vm.prank(initiator);
        vm.expectRevert();
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);
    }

    function test_castVote_success() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.prank(validator);
        registry.castVote{value: 0.01 ether}(0, true);

        DisputeRegistry.Dispute memory d = registry.getDispute(0);
        assertEq(d.upholdVotes, 1);
        assertEq(d.overturnVotes, 0);

        DisputeRegistry.Vote[] memory votes = registry.getVotes(0);
        assertEq(votes.length, 1);
        assertEq(votes[0].validator, validator);
        assertTrue(votes[0].voteUphold);
    }

    function test_castVote_emitsEvent() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.prank(validator);
        vm.expectEmit(true, true, false, true);
        emit DisputeRegistry.DisputeVoteCast(0, validator, false, 0.02 ether);

        registry.castVote{value: 0.02 ether}(0, false);
    }

    function test_castVote_revertsUnauthorized() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.deal(unauthorized, 1 ether);
        vm.prank(unauthorized);
        vm.expectRevert();
        registry.castVote{value: 0.01 ether}(0, true);
    }

    function test_castVote_revertsAlreadyVoted() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.prank(validator);
        registry.castVote{value: 0.01 ether}(0, true);

        vm.prank(validator);
        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeRegistry.AlreadyVoted.selector,
                0,
                validator
            )
        );
        registry.castVote{value: 0.01 ether}(0, true);
    }

    function test_castVote_revertsInsufficientStake() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.prank(validator);
        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeRegistry.InsufficientStake.selector,
                0.005 ether,
                0.01 ether
            )
        );
        registry.castVote{value: 0.005 ether}(0, true);
    }

    function test_castVote_revertsAfterDeadline() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.warp(block.timestamp + 3 days + 1);

        vm.prank(validator);
        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeRegistry.VotingPeriodExpired.selector,
                0
            )
        );
        registry.castVote{value: 0.01 ether}(0, true);
    }

    function test_castVote_revertsDisputeNotOpen() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        // Vote to uphold
        vm.prank(validator);
        registry.castVote{value: 0.01 ether}(0, true);

        // Resolve
        vm.warp(block.timestamp + 3 days + 1);
        registry.resolveDispute(0, 0);

        vm.prank(validator2);
        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeRegistry.DisputeNotOpen.selector,
                0
            )
        );
        registry.castVote{value: 0.01 ether}(0, true);
    }

    function test_resolveDispute_upheld() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.prank(validator);
        registry.castVote{value: 0.01 ether}(0, true);

        vm.prank(validator2);
        registry.castVote{value: 0.01 ether}(0, false);

        // Majority upholds (1 uphold > 0 if equal, upholdVotes == overturnVotes => upheld)
        // Actually 1 uphold == 1 overturn, not overturned
        vm.warp(block.timestamp + 3 days + 1);
        registry.resolveDispute(0, 0);

        DisputeRegistry.Dispute memory d = registry.getDispute(0);
        assertEq(uint8(d.status), uint8(DisputeRegistry.DisputeStatus.Upheld));
        assertEq(d.newScore, 0);
    }

    function test_resolveDispute_overturned() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.prank(validator);
        registry.castVote{value: 0.01 ether}(0, false);

        vm.prank(validator2);
        registry.castVote{value: 0.01 ether}(0, false);

        vm.warp(block.timestamp + 3 days + 1);

        vm.expectEmit(true, false, false, true);
        emit DisputeRegistry.DisputeResolved(
            0,
            DisputeRegistry.DisputeStatus.Overturned,
            750
        );

        registry.resolveDispute(0, 750);

        DisputeRegistry.Dispute memory d = registry.getDispute(0);
        assertEq(uint8(d.status), uint8(DisputeRegistry.DisputeStatus.Overturned));
        assertEq(d.newScore, 750);
    }

    function test_resolveDispute_revertsVotingPeriodActive() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeRegistry.VotingPeriodActive.selector,
                0
            )
        );
        registry.resolveDispute(0, 0);
    }

    function test_resolveDispute_revertsNonAdmin() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.warp(block.timestamp + 3 days + 1);

        vm.prank(unauthorized);
        vm.expectRevert();
        registry.resolveDispute(0, 0);
    }

    function test_resolveDispute_revertsInvalidNewScore() public {
        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);

        vm.prank(validator);
        registry.castVote{value: 0.01 ether}(0, false);

        vm.warp(block.timestamp + 3 days + 1);

        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeRegistry.InvalidNewScore.selector,
                1001
            )
        );
        registry.resolveDispute(0, 1001);
    }

    function test_resolveDispute_revertsDoesNotExist() public {
        vm.warp(block.timestamp + 3 days + 1);
        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeRegistry.DisputeDoesNotExist.selector,
                999
            )
        );
        registry.resolveDispute(999, 0);
    }

    function test_pauseUnpause() public {
        registry.pause();
        assertTrue(registry.paused());

        registry.unpause();
        assertFalse(registry.paused());
    }

    function test_pause_revertsNonAdmin() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        registry.pause();
    }

    function test_disputeCount_increments() public {
        assertEq(registry.getDisputeCount(), 0);

        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(PROPOSAL_ID, EVIDENCE_CID);
        assertEq(registry.getDisputeCount(), 1);

        vm.prank(initiator);
        registry.openDispute{value: 0.01 ether}(keccak256("proposal-2"), EVIDENCE_CID);
        assertEq(registry.getDisputeCount(), 2);
    }

    function testFuzz_openDispute_validStake(uint256 stake) public {
        stake = bound(stake, 0.01 ether, 10 ether);
        vm.deal(initiator, stake);

        vm.prank(initiator);
        uint256 id = registry.openDispute{value: stake}(PROPOSAL_ID, EVIDENCE_CID);

        DisputeRegistry.Dispute memory d = registry.getDispute(id);
        assertEq(d.stakeAmount, stake);
    }
}
