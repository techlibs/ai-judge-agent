// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./JudgeRegistry.sol";
import "./ProposalRegistry.sol";
import "./CriteriaRegistry.sol";
import "./EvaluationStore.sol";
import "./ConsensusEngine.sol";

/**
 * @title GrantRouter
 * @notice Central coordinator wiring all registries together.
 *         Provides convenience methods spanning multiple contracts.
 */
contract GrantRouter is Ownable {
    JudgeRegistry public judgeRegistry;
    ProposalRegistry public proposalRegistry;
    CriteriaRegistry public criteriaRegistry;
    EvaluationStore public evaluationStore;
    ConsensusEngine public consensusEngine;

    event EvaluationStarted(bytes32 indexed proposalId, uint256[] judgeIds);

    error JudgeNotActive(uint256 judgeId);
    error ProposalNotSubmitted(bytes32 proposalId);

    constructor(
        address _judgeRegistry,
        address _proposalRegistry,
        address _criteriaRegistry,
        address _evaluationStore,
        address _consensusEngine
    ) Ownable(msg.sender) {
        judgeRegistry = JudgeRegistry(_judgeRegistry);
        proposalRegistry = ProposalRegistry(_proposalRegistry);
        criteriaRegistry = CriteriaRegistry(_criteriaRegistry);
        evaluationStore = EvaluationStore(_evaluationStore);
        consensusEngine = ConsensusEngine(_consensusEngine);
    }

    /**
     * @notice Start evaluation: move proposal to UnderReview.
     * @param proposalId The proposal to evaluate
     * @param judgeIds The judges assigned to evaluate
     */
    function startEvaluation(
        bytes32 proposalId,
        uint256[] calldata judgeIds
    ) external onlyOwner {
        if (!proposalRegistry.proposalExists(proposalId)) {
            revert ProposalNotSubmitted(proposalId);
        }

        for (uint256 i = 0; i < judgeIds.length; i++) {
            if (!judgeRegistry.isActiveJudge(judgeIds[i])) {
                revert JudgeNotActive(judgeIds[i]);
            }
        }

        proposalRegistry.setStatus(proposalId, ProposalRegistry.ProposalStatus.UnderReview);

        emit EvaluationStarted(proposalId, judgeIds);
    }

    /**
     * @notice Submit a judge's commit hash.
     */
    function commitJudgeEvaluation(
        bytes32 proposalId,
        uint256 judgeId,
        bytes32 commitHash
    ) external onlyOwner {
        evaluationStore.commitEvaluation(proposalId, judgeId, commitHash);
    }

    /**
     * @notice Reveal a judge's evaluation.
     */
    function revealJudgeEvaluation(
        bytes32 proposalId,
        uint256 judgeId,
        bytes32[] calldata criterionIds,
        uint16[] calldata scores,
        uint16 overallScore,
        bytes calldata reasoning,
        bytes32 salt
    ) external onlyOwner {
        evaluationStore.revealEvaluation(
            proposalId, judgeId, criterionIds, scores, overallScore, reasoning, salt
        );
    }

    /**
     * @notice Finalize evaluation: resolve consensus and update proposal status.
     */
    function finalizeEvaluation(
        bytes32 proposalId,
        uint16[] calldata judgeScores
    ) external onlyOwner {
        consensusEngine.resolveConsensus(proposalId, judgeScores);
        proposalRegistry.setStatus(proposalId, ProposalRegistry.ProposalStatus.Evaluated);
    }
}
