// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ConsensusEngine
 * @notice Determines multi-judge consensus. If score spread within threshold,
 *         consensus is automatic. Otherwise records disagreement.
 */
contract ConsensusEngine is Ownable {
    enum ConsensusStatus { Pending, Agreed, Disagreed, Reconciled }

    struct ConsensusRecord {
        ConsensusStatus status;
        uint16 finalScore;
        uint16 spreadBps;
        uint48 resolvedAt;
        uint8 judgeCount;
        uint8 revealedCount;
    }

    mapping(bytes32 => ConsensusRecord) public records;

    uint16 public consensusThresholdBps;
    uint8 public requiredJudgeCount;

    event ConsensusReached(bytes32 indexed proposalId, uint16 finalScore, uint16 spreadBps);
    event ConsensusDisagreement(bytes32 indexed proposalId, uint16 spreadBps);
    event ConsensusReconciled(bytes32 indexed proposalId, uint16 finalScore);

    error AlreadyResolved(bytes32 proposalId);
    error InsufficientReveals(uint256 revealed, uint256 required);
    error NotDisagreed(bytes32 proposalId);
    error EmptyScores();

    constructor(uint16 thresholdBps, uint8 requiredCount) Ownable(msg.sender) {
        consensusThresholdBps = thresholdBps;
        requiredJudgeCount = requiredCount;
    }

    /**
     * @notice Resolve consensus for a proposal given all judge scores.
     * @param proposalId The proposal to resolve
     * @param judgeScores Array of overall scores from each judge (0-1000)
     */
    function resolveConsensus(
        bytes32 proposalId,
        uint16[] calldata judgeScores
    ) external onlyOwner {
        if (records[proposalId].resolvedAt != 0) revert AlreadyResolved(proposalId);
        if (judgeScores.length < requiredJudgeCount) {
            revert InsufficientReveals(judgeScores.length, requiredJudgeCount);
        }
        if (judgeScores.length == 0) revert EmptyScores();

        (uint16 avg, uint16 spread) = _computeStats(judgeScores);

        ConsensusStatus status;
        if (spread <= consensusThresholdBps) {
            status = ConsensusStatus.Agreed;
            emit ConsensusReached(proposalId, avg, spread);
        } else {
            status = ConsensusStatus.Disagreed;
            emit ConsensusDisagreement(proposalId, spread);
        }

        records[proposalId] = ConsensusRecord({
            status: status,
            finalScore: avg,
            spreadBps: spread,
            resolvedAt: uint48(block.timestamp),
            judgeCount: uint8(judgeScores.length),
            revealedCount: uint8(judgeScores.length)
        });
    }

    /**
     * @notice Force-reconcile a disagreed proposal with a new final score.
     */
    function forceReconcile(bytes32 proposalId, uint16 finalScore) external onlyOwner {
        if (records[proposalId].status != ConsensusStatus.Disagreed) {
            revert NotDisagreed(proposalId);
        }

        records[proposalId].status = ConsensusStatus.Reconciled;
        records[proposalId].finalScore = finalScore;
        records[proposalId].resolvedAt = uint48(block.timestamp);

        emit ConsensusReconciled(proposalId, finalScore);
    }

    function updateThreshold(uint16 newThreshold) external onlyOwner {
        consensusThresholdBps = newThreshold;
    }

    function getRecord(bytes32 proposalId) external view returns (ConsensusRecord memory) {
        return records[proposalId];
    }

    function _computeStats(uint16[] calldata scores) internal pure returns (uint16 avg, uint16 spread) {
        uint256 sum;
        uint16 minScore = type(uint16).max;
        uint16 maxScore = 0;

        for (uint256 i = 0; i < scores.length; i++) {
            sum += scores[i];
            if (scores[i] < minScore) minScore = scores[i];
            if (scores[i] > maxScore) maxScore = scores[i];
        }

        avg = uint16(sum / scores.length);
        spread = maxScore - minScore;
    }
}
