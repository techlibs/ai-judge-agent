// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ProposalRegistry} from "../../src/core/ProposalRegistry.sol";
import {JudgeRegistry} from "../../src/core/JudgeRegistry.sol";
import {CriteriaRegistry} from "../../src/core/CriteriaRegistry.sol";
import {EvaluationStore} from "../../src/core/EvaluationStore.sol";
import {ConsensusEngine} from "../../src/core/ConsensusEngine.sol";
import {GrantRouter} from "../../src/core/GrantRouter.sol";

/// @title ProposalLifecycleTest
/// @notice Integration tests validating the full proposal lifecycle through GrantRouter
/// @dev Deploys all 6 core contracts and exercises submit -> startEvaluation -> finalizeEvaluation
contract ProposalLifecycleTest is Test {
    ProposalRegistry proposalRegistry;
    JudgeRegistry judgeRegistry;
    CriteriaRegistry criteriaRegistry;
    EvaluationStore evaluationStore;
    ConsensusEngine consensusEngine;
    GrantRouter router;

    address deployer = makeAddr("deployer");
    address proposer = makeAddr("proposer");
    address judge1Wallet = makeAddr("judge1");

    function setUp() public {
        vm.startPrank(deployer);

        // Deploy all registries
        proposalRegistry = new ProposalRegistry();
        judgeRegistry = new JudgeRegistry();
        criteriaRegistry = new CriteriaRegistry();
        evaluationStore = new EvaluationStore();
        // threshold=500 bps (5%), requiredCount=1 judge
        consensusEngine = new ConsensusEngine(500, 1);

        // Deploy router with all registry addresses
        router = new GrantRouter(
            address(judgeRegistry),
            address(proposalRegistry),
            address(criteriaRegistry),
            address(evaluationStore),
            address(consensusEngine)
        );

        // Transfer ProposalRegistry ownership to GrantRouter
        // ProposalRegistry uses a simple `owner` slot (slot 0 after enums/structs)
        // We use vm.store to set owner = address(router) since there's no transferOwnership
        vm.store(address(proposalRegistry), bytes32(0), bytes32(uint256(uint160(address(router)))));

        // Transfer ConsensusEngine ownership to GrantRouter (OZ Ownable)
        consensusEngine.transferOwnership(address(router));

        // Transfer EvaluationStore ownership to GrantRouter (OZ Ownable)
        evaluationStore.transferOwnership(address(router));

        // Register a judge for startEvaluation
        judgeRegistry.registerJudge(judge1Wallet, JudgeRegistry.JudgeRole.Security, "test judge");

        vm.stopPrank();
    }

    /// @notice Full lifecycle: submit -> startEvaluation (UnderReview) -> finalizeEvaluation (Evaluated)
    function test_fullLifecycle_submitToEvaluated() public {
        // 1. Submit proposal (anyone can call -- NOT through router)
        vm.prank(proposer);
        bytes32 proposalId = proposalRegistry.submitProposal(
            "Test Lifecycle Proposal",
            bytes32(uint256(0xCAFE)),
            keccak256("https://github.com/test/repo"),
            keccak256("https://demo.test.com"),
            ProposalRegistry.ProposalDomain.DeFi
        );

        // Verify Submitted status
        (, , ProposalRegistry.ProposalStatus status, , , , ) = proposalRegistry.proposals(proposalId);
        assertEq(uint8(status), uint8(ProposalRegistry.ProposalStatus.Submitted), "should be Submitted");

        // 2. Start evaluation via GrantRouter
        uint256[] memory judgeIds = new uint256[](1);
        judgeIds[0] = 1;
        vm.prank(deployer);
        router.startEvaluation(proposalId, judgeIds);

        // Verify UnderReview status
        (, , status, , , , ) = proposalRegistry.proposals(proposalId);
        assertEq(uint8(status), uint8(ProposalRegistry.ProposalStatus.UnderReview), "should be UnderReview");

        // 3. Finalize evaluation via GrantRouter
        uint16[] memory scores = new uint16[](1);
        scores[0] = 85;
        vm.prank(deployer);
        router.finalizeEvaluation(proposalId, scores);

        // Verify Evaluated status
        (, , status, , , , ) = proposalRegistry.proposals(proposalId);
        assertEq(uint8(status), uint8(ProposalRegistry.ProposalStatus.Evaluated), "should be Evaluated");
    }

    /// @notice startEvaluation reverts for non-existent proposal
    function test_grantRouter_rejectsNonExistentProposal() public {
        bytes32 fakeId = bytes32(uint256(999));
        uint256[] memory judgeIds = new uint256[](1);
        judgeIds[0] = 1;

        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSelector(GrantRouter.ProposalNotSubmitted.selector, fakeId));
        router.startEvaluation(fakeId, judgeIds);
    }

    /// @notice ProposalSubmitted event contains correct indexed and non-indexed data
    function test_proposalSubmittedEvent_containsIndexingData() public {
        bytes32 contentCid = bytes32(uint256(0xBEEF));

        // Calculate expected proposalId
        bytes32 expectedId = keccak256(abi.encodePacked(proposer, "Event Test", uint256(block.timestamp)));

        vm.expectEmit(true, true, false, true);
        emit ProposalRegistry.ProposalSubmitted(
            expectedId,
            proposer,
            contentCid,
            ProposalRegistry.ProposalDomain.Governance,
            uint48(block.timestamp)
        );

        vm.prank(proposer);
        proposalRegistry.submitProposal(
            "Event Test",
            contentCid,
            keccak256("https://github.com/test"),
            keccak256("https://demo.test.com"),
            ProposalRegistry.ProposalDomain.Governance
        );
    }
}
