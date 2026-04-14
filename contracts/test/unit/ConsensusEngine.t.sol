// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/core/ConsensusEngine.sol";

contract ConsensusEngineTest is Test {
    ConsensusEngine engine;
    address owner = makeAddr("owner");
    bytes32 constant PROPOSAL_ID = keccak256("proposal-1");

    function setUp() public {
        vm.prank(owner);
        engine = new ConsensusEngine(150, 3); // 15% threshold, 3 judges required
    }

    function test_constructor_setsParams() public view {
        assertEq(engine.consensusThresholdBps(), 150);
        assertEq(engine.requiredJudgeCount(), 3);
    }

    function test_resolveConsensus_agreed() public {
        uint16[] memory scores = new uint16[](3);
        scores[0] = 750; // 7.5
        scores[1] = 780; // 7.8
        scores[2] = 720; // 7.2
        // spread = 60, threshold = 150, agreed

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit ConsensusEngine.ConsensusReached(PROPOSAL_ID, 750, 60);
        engine.resolveConsensus(PROPOSAL_ID, scores);

        ConsensusEngine.ConsensusRecord memory rec = engine.getRecord(PROPOSAL_ID);
        assertEq(uint8(rec.status), uint8(ConsensusEngine.ConsensusStatus.Agreed));
        assertEq(rec.finalScore, 750);
        assertEq(rec.spreadBps, 60);
        assertEq(rec.judgeCount, 3);
    }

    function test_resolveConsensus_disagreed() public {
        uint16[] memory scores = new uint16[](3);
        scores[0] = 900;
        scores[1] = 400;
        scores[2] = 700;
        // spread = 500, threshold = 150, disagreed

        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit ConsensusEngine.ConsensusDisagreement(PROPOSAL_ID, 500);
        engine.resolveConsensus(PROPOSAL_ID, scores);

        ConsensusEngine.ConsensusRecord memory rec = engine.getRecord(PROPOSAL_ID);
        assertEq(uint8(rec.status), uint8(ConsensusEngine.ConsensusStatus.Disagreed));
        assertEq(rec.spreadBps, 500);
    }

    function test_resolveConsensus_revertsIfAlreadyResolved() public {
        uint16[] memory scores = new uint16[](3);
        scores[0] = 750;
        scores[1] = 780;
        scores[2] = 720;

        vm.startPrank(owner);
        engine.resolveConsensus(PROPOSAL_ID, scores);

        vm.expectRevert(abi.encodeWithSelector(ConsensusEngine.AlreadyResolved.selector, PROPOSAL_ID));
        engine.resolveConsensus(PROPOSAL_ID, scores);
        vm.stopPrank();
    }

    function test_resolveConsensus_revertsIfInsufficientJudges() public {
        uint16[] memory scores = new uint16[](2);
        scores[0] = 750;
        scores[1] = 780;

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ConsensusEngine.InsufficientReveals.selector, 2, 3));
        engine.resolveConsensus(PROPOSAL_ID, scores);
    }

    function test_forceReconcile() public {
        uint16[] memory scores = new uint16[](3);
        scores[0] = 900;
        scores[1] = 400;
        scores[2] = 700;

        vm.startPrank(owner);
        engine.resolveConsensus(PROPOSAL_ID, scores);
        engine.forceReconcile(PROPOSAL_ID, 650);
        vm.stopPrank();

        ConsensusEngine.ConsensusRecord memory rec = engine.getRecord(PROPOSAL_ID);
        assertEq(uint8(rec.status), uint8(ConsensusEngine.ConsensusStatus.Reconciled));
        assertEq(rec.finalScore, 650);
    }

    function test_forceReconcile_revertsIfNotDisagreed() public {
        uint16[] memory scores = new uint16[](3);
        scores[0] = 750;
        scores[1] = 780;
        scores[2] = 720;

        vm.startPrank(owner);
        engine.resolveConsensus(PROPOSAL_ID, scores);

        vm.expectRevert(abi.encodeWithSelector(ConsensusEngine.NotDisagreed.selector, PROPOSAL_ID));
        engine.forceReconcile(PROPOSAL_ID, 750);
        vm.stopPrank();
    }

    function test_resolveConsensus_revertsIfNotOwner() public {
        uint16[] memory scores = new uint16[](3);
        scores[0] = 750;
        scores[1] = 780;
        scores[2] = 720;

        vm.prank(makeAddr("attacker"));
        vm.expectRevert();
        engine.resolveConsensus(PROPOSAL_ID, scores);
    }

    // --- Fuzz ---

    function testFuzz_finalScoreWithinBounds(uint16 s1, uint16 s2, uint16 s3) public {
        s1 = uint16(bound(s1, 0, 1000));
        s2 = uint16(bound(s2, 0, 1000));
        s3 = uint16(bound(s3, 0, 1000));

        bytes32 pid = keccak256(abi.encodePacked(s1, s2, s3));

        uint16[] memory scores = new uint16[](3);
        scores[0] = s1;
        scores[1] = s2;
        scores[2] = s3;

        vm.prank(owner);
        engine.resolveConsensus(pid, scores);

        ConsensusEngine.ConsensusRecord memory rec = engine.getRecord(pid);
        uint16 minScore = s1 < s2 ? (s1 < s3 ? s1 : s3) : (s2 < s3 ? s2 : s3);
        uint16 maxScore = s1 > s2 ? (s1 > s3 ? s1 : s3) : (s2 > s3 ? s2 : s3);

        assertGe(rec.finalScore, minScore, "Final score must be >= min");
        assertLe(rec.finalScore, maxScore, "Final score must be <= max");
        assertEq(rec.spreadBps, maxScore - minScore, "Spread must be max - min");
    }
}
