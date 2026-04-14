// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/core/JudgeRegistry.sol";
import "../../src/core/ProposalRegistry.sol";
import "../../src/core/CriteriaRegistry.sol";
import "../../src/core/EvaluationStore.sol";
import "../../src/core/ConsensusEngine.sol";
import "../../src/core/GrantRouter.sol";

contract FullEvaluationFlowTest is Test {
    JudgeRegistry judgeRegistry;
    ProposalRegistry proposalRegistry;
    CriteriaRegistry criteriaRegistry;
    EvaluationStore evaluationStore;
    ConsensusEngine consensusEngine;
    GrantRouter router;

    address admin = makeAddr("admin");
    address proposer = makeAddr("proposer");

    bytes32 secCritId;
    bytes32 impCritId;
    bytes32 aliCritId;

    function setUp() public {
        vm.startPrank(admin);
        judgeRegistry = new JudgeRegistry();
        proposalRegistry = new ProposalRegistry();
        criteriaRegistry = new CriteriaRegistry();
        evaluationStore = new EvaluationStore();
        consensusEngine = new ConsensusEngine(150, 3);
        router = new GrantRouter(
            address(judgeRegistry), address(proposalRegistry), address(criteriaRegistry),
            address(evaluationStore), address(consensusEngine)
        );
        evaluationStore.transferOwnership(address(router));
        consensusEngine.transferOwnership(address(router));
        judgeRegistry.registerJudge(makeAddr("j1"), JudgeRegistry.JudgeRole.Security, "s");
        judgeRegistry.registerJudge(makeAddr("j2"), JudgeRegistry.JudgeRole.Impact, "i");
        judgeRegistry.registerJudge(makeAddr("j3"), JudgeRegistry.JudgeRole.Alignment, "a");
        secCritId = criteriaRegistry.addCriterion("Security", "Risk", 2500, true);
        impCritId = criteriaRegistry.addCriterion("Impact", "Outcomes", 3000, true);
        aliCritId = criteriaRegistry.addCriterion("Alignment", "Values", 2000, true);
        vm.stopPrank();
    }

    function _submit(string memory t) internal returns (bytes32) {
        vm.prank(proposer);
        return proposalRegistry.submitProposal(t, keccak256("c"), keccak256("r"), keccak256("d"), ProposalRegistry.ProposalDomain.Governance);
    }

    function _3crit() internal view returns (bytes32[] memory c) {
        c = new bytes32[](3);
        c[0] = secCritId; c[1] = impCritId; c[2] = aliCritId;
    }

    function _commitAndReveal3(bytes32 pid) internal {
        bytes32[] memory cids = _3crit();

        uint16[] memory s1 = new uint16[](3); s1[0]=800; s1[1]=750; s1[2]=700;
        uint16[] memory s2 = new uint16[](3); s2[0]=700; s2[1]=850; s2[2]=700;
        uint16[] memory s3 = new uint16[](3); s3[0]=700; s3[1]=750; s3[2]=900;

        bytes memory r1 = bytes("Security: solid threat model with clear mitigations for identified vectors across the proposal scope.");
        bytes memory r2 = bytes("Impact: strong potential with clear KPIs, measurable outcomes, and community benefit defined for review.");
        bytes memory r3 = bytes("Alignment: excellent fit with IPE City values and Pulse system integration for governance contribution.");

        bytes32 h1 = keccak256(abi.encodePacked(uint256(1), pid, cids, s1, uint16(750), r1, keccak256("a")));
        bytes32 h2 = keccak256(abi.encodePacked(uint256(2), pid, cids, s2, uint16(780), r2, keccak256("b")));
        bytes32 h3 = keccak256(abi.encodePacked(uint256(3), pid, cids, s3, uint16(770), r3, keccak256("c")));

        vm.startPrank(admin);
        router.commitJudgeEvaluation(pid, 1, h1);
        router.commitJudgeEvaluation(pid, 2, h2);
        router.commitJudgeEvaluation(pid, 3, h3);
        router.revealJudgeEvaluation(pid, 1, cids, s1, 750, r1, keccak256("a"));
        router.revealJudgeEvaluation(pid, 2, cids, s2, 780, r2, keccak256("b"));
        router.revealJudgeEvaluation(pid, 3, cids, s3, 770, r3, keccak256("c"));
        vm.stopPrank();
    }

    function test_fullFlow_consensus() public {
        bytes32 pid = _submit("Governance Dashboard");
        vm.prank(admin);
        proposalRegistry.setStatus(pid, ProposalRegistry.ProposalStatus.UnderReview);

        _commitAndReveal3(pid);

        assertEq(evaluationStore.getCommittedCount(pid), 3);
        assertEq(evaluationStore.getRevealedCount(pid), 3);

        uint16[] memory scores = new uint16[](3);
        scores[0] = 750; scores[1] = 780; scores[2] = 770;
        vm.prank(address(router));
        consensusEngine.resolveConsensus(pid, scores);

        ConsensusEngine.ConsensusRecord memory rec = consensusEngine.getRecord(pid);
        assertEq(uint8(rec.status), uint8(ConsensusEngine.ConsensusStatus.Agreed));
        assertEq(rec.finalScore, 766);
        assertEq(rec.spreadBps, 30);

        vm.prank(admin);
        proposalRegistry.setStatus(pid, ProposalRegistry.ProposalStatus.Evaluated);
    }

    function test_fullFlow_disagreement() public {
        bytes32 pid = _submit("Controversial");
        vm.prank(admin);
        proposalRegistry.setStatus(pid, ProposalRegistry.ProposalStatus.UnderReview);

        bytes32[] memory cids = new bytes32[](1);
        cids[0] = secCritId;

        uint16[] memory s1 = new uint16[](1); s1[0] = 300;
        uint16[] memory s2 = new uint16[](1); s2[0] = 900;
        uint16[] memory s3 = new uint16[](1); s3[0] = 700;

        bytes memory r1 = bytes("Critical vulnerabilities: reentrancy and missing access control on admin functions require attention.");
        bytes memory r2 = bytes("Exceptional impact: would transform IPE City governance and unlock new participation model entirely.");
        bytes memory r3 = bytes("Good alignment with IPE values. Pro-tech orientation clear but could better integrate Pulse system.");

        vm.startPrank(admin);
        router.commitJudgeEvaluation(pid, 1, keccak256(abi.encodePacked(uint256(1), pid, cids, s1, uint16(300), r1, keccak256("x"))));
        router.commitJudgeEvaluation(pid, 2, keccak256(abi.encodePacked(uint256(2), pid, cids, s2, uint16(900), r2, keccak256("y"))));
        router.commitJudgeEvaluation(pid, 3, keccak256(abi.encodePacked(uint256(3), pid, cids, s3, uint16(700), r3, keccak256("z"))));
        router.revealJudgeEvaluation(pid, 1, cids, s1, 300, r1, keccak256("x"));
        router.revealJudgeEvaluation(pid, 2, cids, s2, 900, r2, keccak256("y"));
        router.revealJudgeEvaluation(pid, 3, cids, s3, 700, r3, keccak256("z"));
        vm.stopPrank();

        uint16[] memory overall = new uint16[](3);
        overall[0] = 300; overall[1] = 900; overall[2] = 700;
        vm.prank(address(router));
        consensusEngine.resolveConsensus(pid, overall);

        ConsensusEngine.ConsensusRecord memory rec = consensusEngine.getRecord(pid);
        assertEq(uint8(rec.status), uint8(ConsensusEngine.ConsensusStatus.Disagreed));
        assertEq(rec.spreadBps, 600);
    }
}
