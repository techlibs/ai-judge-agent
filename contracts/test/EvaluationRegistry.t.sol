// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EvaluationRegistry} from "../src/EvaluationRegistry.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract EvaluationRegistryTest is Test {
    EvaluationRegistry public registry;
    address public admin;
    address public scorer;
    address public unauthorized;

    bytes32 constant PROPOSAL_ID = keccak256("proposal-1");
    bytes32 constant FUNDING_ROUND_ID = keccak256("round-1");
    uint16 constant FINAL_SCORE = 785;
    uint16 constant REPUTATION_MULTIPLIER = 10200;
    string constant PROPOSAL_CID = "bafybeig1234";
    string constant EVALUATION_CID = "bafybeih5678";

    function setUp() public {
        admin = address(this);
        scorer = makeAddr("scorer");
        unauthorized = makeAddr("unauthorized");

        registry = new EvaluationRegistry();
        registry.grantRole(registry.SCORER_ROLE(), scorer);
    }

    function test_submitScore_success() public {
        vm.prank(scorer);
        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            REPUTATION_MULTIPLIER,
            PROPOSAL_CID,
            EVALUATION_CID
        );

        EvaluationRegistry.Evaluation memory eval = registry.getEvaluation(PROPOSAL_ID);
        assertEq(eval.proposalId, PROPOSAL_ID);
        assertEq(eval.fundingRoundId, FUNDING_ROUND_ID);
        assertEq(eval.finalScore, FINAL_SCORE);
        assertEq(eval.reputationMultiplier, REPUTATION_MULTIPLIER);
        // adjustedScore = 785 * 10200 / 10000 = 800
        assertEq(eval.adjustedScore, 800);
        assertGt(eval.timestamp, 0);
    }

    function test_submitScore_emitsEvent() public {
        vm.prank(scorer);
        vm.expectEmit(true, true, false, true);
        emit EvaluationRegistry.EvaluationSubmitted(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            800, // adjustedScore
            PROPOSAL_CID,
            EVALUATION_CID
        );

        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            REPUTATION_MULTIPLIER,
            PROPOSAL_CID,
            EVALUATION_CID
        );
    }

    function test_submitScore_revertsForUnauthorized() public {
        bytes32 scorerRole = registry.SCORER_ROLE();
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                unauthorized,
                scorerRole
            )
        );
        vm.prank(unauthorized);
        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            REPUTATION_MULTIPLIER,
            PROPOSAL_CID,
            EVALUATION_CID
        );
    }

    function test_submitScore_revertsWhenPaused() public {
        registry.pause();

        vm.prank(scorer);
        vm.expectRevert();
        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            REPUTATION_MULTIPLIER,
            PROPOSAL_CID,
            EVALUATION_CID
        );
    }

    function test_submitScore_revertsDuplicate() public {
        vm.prank(scorer);
        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            REPUTATION_MULTIPLIER,
            PROPOSAL_CID,
            EVALUATION_CID
        );

        vm.prank(scorer);
        vm.expectRevert(
            abi.encodeWithSelector(
                EvaluationRegistry.EvaluationAlreadyExists.selector,
                PROPOSAL_ID
            )
        );
        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            REPUTATION_MULTIPLIER,
            PROPOSAL_CID,
            EVALUATION_CID
        );
    }

    function test_submitScore_revertsInvalidScore() public {
        vm.prank(scorer);
        vm.expectRevert(
            abi.encodeWithSelector(
                EvaluationRegistry.InvalidScore.selector,
                1001
            )
        );
        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            1001,
            REPUTATION_MULTIPLIER,
            PROPOSAL_CID,
            EVALUATION_CID
        );
    }

    function test_submitScore_revertsInvalidReputationMultiplier_low() public {
        vm.prank(scorer);
        vm.expectRevert(
            abi.encodeWithSelector(
                EvaluationRegistry.InvalidReputationMultiplier.selector,
                9999
            )
        );
        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            9999,
            PROPOSAL_CID,
            EVALUATION_CID
        );
    }

    function test_submitScore_revertsInvalidReputationMultiplier_high() public {
        vm.prank(scorer);
        vm.expectRevert(
            abi.encodeWithSelector(
                EvaluationRegistry.InvalidReputationMultiplier.selector,
                10501
            )
        );
        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            10501,
            PROPOSAL_CID,
            EVALUATION_CID
        );
    }

    function test_submitScore_revertsEmptyCids() public {
        vm.prank(scorer);
        vm.expectRevert(EvaluationRegistry.EmptyProposalContentCid.selector);
        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            REPUTATION_MULTIPLIER,
            "",
            EVALUATION_CID
        );

        vm.prank(scorer);
        vm.expectRevert(EvaluationRegistry.EmptyEvaluationContentCid.selector);
        registry.submitScore(
            PROPOSAL_ID,
            FUNDING_ROUND_ID,
            FINAL_SCORE,
            REPUTATION_MULTIPLIER,
            PROPOSAL_CID,
            ""
        );
    }

    function test_pauseUnpause() public {
        registry.pause();
        assertTrue(registry.paused());

        registry.unpause();
        assertFalse(registry.paused());
    }

    function test_pause_revertsForNonAdmin() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        registry.pause();
    }

    function test_constants() public view {
        assertEq(registry.SCORE_PRECISION(), 100);
        assertEq(registry.REPUTATION_BASE(), 10000);
        assertEq(registry.REPUTATION_MAX(), 10500);
    }

    function testFuzz_submitScore_validRange(uint16 score, uint16 multiplier) public {
        score = uint16(bound(score, 0, 1000));
        multiplier = uint16(bound(multiplier, 10000, 10500));

        vm.prank(scorer);
        registry.submitScore(
            keccak256(abi.encodePacked(score, multiplier)),
            FUNDING_ROUND_ID,
            score,
            multiplier,
            PROPOSAL_CID,
            EVALUATION_CID
        );

        EvaluationRegistry.Evaluation memory eval = registry.getEvaluation(
            keccak256(abi.encodePacked(score, multiplier))
        );
        uint16 expectedAdjusted = uint16(
            (uint256(score) * uint256(multiplier)) / 10000
        );
        assertEq(eval.adjustedScore, expectedAdjusted);
    }
}
