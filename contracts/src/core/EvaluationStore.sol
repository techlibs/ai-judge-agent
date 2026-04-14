// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../periphery/TextStorage.sol";

/**
 * @title EvaluationStore
 * @notice Per-judge evaluation storage with commit-reveal pattern.
 *         Judges commit a hash first, then reveal scores + reasoning.
 */
contract EvaluationStore is Ownable {
    struct EvaluationCommit {
        bytes32 commitHash;
        uint48 committedAt;
    }

    struct Evaluation {
        uint256 judgeId;
        bytes32 proposalId;
        uint48 evaluatedAt;
        bytes32 reasoningHash;
        uint16 overallScore;
        bool revealed;
    }

    // proposalId => judgeId => commit
    mapping(bytes32 => mapping(uint256 => EvaluationCommit)) public commits;
    // proposalId => judgeId => evaluation
    mapping(bytes32 => mapping(uint256 => Evaluation)) public evaluations;
    // proposalId => judgeId => criterionId => score
    mapping(bytes32 => mapping(uint256 => mapping(bytes32 => uint16))) public criterionScores;
    // proposalId => list of judge IDs that committed
    mapping(bytes32 => uint256[]) public committedJudges;
    // proposalId => list of judge IDs that revealed
    mapping(bytes32 => uint256[]) public revealedJudges;

    event EvaluationCommitted(bytes32 indexed proposalId, uint256 indexed judgeId, uint48 committedAt);
    event EvaluationRevealed(
        bytes32 indexed proposalId,
        uint256 indexed judgeId,
        uint16 overallScore,
        uint48 evaluatedAt
    );
    event CriterionScoreSet(
        bytes32 indexed proposalId,
        uint256 indexed judgeId,
        bytes32 indexed criterionId,
        uint16 score
    );

    error AlreadyCommitted(bytes32 proposalId, uint256 judgeId);
    error NotCommitted(bytes32 proposalId, uint256 judgeId);
    error AlreadyRevealed(bytes32 proposalId, uint256 judgeId);
    error CommitHashMismatch();
    error ScoreOutOfRange(uint16 score);
    error EmptyScores();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Judge commits a hash of their evaluation (prevents seeing others' work).
     */
    function commitEvaluation(
        bytes32 proposalId,
        uint256 judgeId,
        bytes32 commitHash
    ) external onlyOwner {
        if (commits[proposalId][judgeId].committedAt != 0) {
            revert AlreadyCommitted(proposalId, judgeId);
        }

        commits[proposalId][judgeId] = EvaluationCommit({
            commitHash: commitHash,
            committedAt: uint48(block.timestamp)
        });

        committedJudges[proposalId].push(judgeId);

        emit EvaluationCommitted(proposalId, judgeId, uint48(block.timestamp));
    }

    /**
     * @notice Judge reveals their evaluation. Contract verifies against commit.
     * @param criterionIds Array of criterion IDs scored
     * @param scores Array of scores (0-1000) matching criterionIds
     * @param overallScore Weighted overall score (0-1000)
     * @param reasoning Full reasoning text (emitted in events)
     * @param salt Random salt used in commit hash
     */
    function revealEvaluation(
        bytes32 proposalId,
        uint256 judgeId,
        bytes32[] calldata criterionIds,
        uint16[] calldata scores,
        uint16 overallScore,
        bytes calldata reasoning,
        bytes32 salt
    ) external onlyOwner {
        if (commits[proposalId][judgeId].committedAt == 0) {
            revert NotCommitted(proposalId, judgeId);
        }
        if (evaluations[proposalId][judgeId].revealed) {
            revert AlreadyRevealed(proposalId, judgeId);
        }
        if (criterionIds.length == 0) revert EmptyScores();
        if (overallScore > 1000) revert ScoreOutOfRange(overallScore);

        // Verify commit hash
        bytes32 expectedHash = keccak256(
            abi.encodePacked(judgeId, proposalId, criterionIds, scores, overallScore, reasoning, salt)
        );
        if (expectedHash != commits[proposalId][judgeId].commitHash) {
            revert CommitHashMismatch();
        }

        // Store criterion scores
        for (uint256 i = 0; i < criterionIds.length; i++) {
            if (scores[i] > 1000) revert ScoreOutOfRange(scores[i]);
            criterionScores[proposalId][judgeId][criterionIds[i]] = scores[i];
            emit CriterionScoreSet(proposalId, judgeId, criterionIds[i], scores[i]);
        }

        // Emit reasoning text in event logs
        bytes32 reasoningHash = TextStorage.emitText(
            proposalId,
            bytes32(judgeId),
            reasoning
        );

        evaluations[proposalId][judgeId] = Evaluation({
            judgeId: judgeId,
            proposalId: proposalId,
            evaluatedAt: uint48(block.timestamp),
            reasoningHash: reasoningHash,
            overallScore: overallScore,
            revealed: true
        });

        revealedJudges[proposalId].push(judgeId);

        emit EvaluationRevealed(proposalId, judgeId, overallScore, uint48(block.timestamp));
    }

    function getCommittedCount(bytes32 proposalId) external view returns (uint256) {
        return committedJudges[proposalId].length;
    }

    function getRevealedCount(bytes32 proposalId) external view returns (uint256) {
        return revealedJudges[proposalId].length;
    }

    function getRevealedJudges(bytes32 proposalId) external view returns (uint256[] memory) {
        return revealedJudges[proposalId];
    }

    function isRevealed(bytes32 proposalId, uint256 judgeId) external view returns (bool) {
        return evaluations[proposalId][judgeId].revealed;
    }
}
