// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract EvaluationRegistry is AccessControl, Pausable {
    bytes32 public constant SCORER_ROLE = keccak256("SCORER_ROLE");

    uint16 public constant SCORE_PRECISION = 100;
    uint16 public constant REPUTATION_BASE = 10000;
    uint16 public constant REPUTATION_MAX = 10500;

    struct Evaluation {
        bytes32 proposalId;
        bytes32 fundingRoundId;
        uint16 finalScore;
        uint16 reputationMultiplier;
        uint16 adjustedScore;
        uint48 timestamp;
        string proposalContentCid;
        string evaluationContentCid;
    }

    mapping(bytes32 => Evaluation) private _evaluations;

    event EvaluationSubmitted(
        bytes32 indexed proposalId,
        bytes32 indexed fundingRoundId,
        uint16 finalScore,
        uint16 adjustedScore,
        string proposalContentCid,
        string evaluationContentCid
    );

    error Unauthorized();
    error EvaluationAlreadyExists(bytes32 proposalId);
    error InvalidScore(uint16 score);
    error InvalidReputationMultiplier(uint16 multiplier);
    error EmptyProposalContentCid();
    error EmptyEvaluationContentCid();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(SCORER_ROLE, msg.sender);
    }

    function submitScore(
        bytes32 proposalId,
        bytes32 fundingRoundId,
        uint16 finalScore,
        uint16 reputationMultiplier,
        string calldata proposalContentCid,
        string calldata evaluationContentCid
    ) external onlyRole(SCORER_ROLE) whenNotPaused {
        if (_evaluations[proposalId].timestamp != 0) {
            revert EvaluationAlreadyExists(proposalId);
        }
        if (finalScore > 1000) {
            revert InvalidScore(finalScore);
        }
        if (reputationMultiplier < REPUTATION_BASE || reputationMultiplier > REPUTATION_MAX) {
            revert InvalidReputationMultiplier(reputationMultiplier);
        }
        if (bytes(proposalContentCid).length == 0) {
            revert EmptyProposalContentCid();
        }
        if (bytes(evaluationContentCid).length == 0) {
            revert EmptyEvaluationContentCid();
        }

        uint16 adjustedScore = uint16(
            (uint256(finalScore) * uint256(reputationMultiplier)) / REPUTATION_BASE
        );

        _evaluations[proposalId] = Evaluation({
            proposalId: proposalId,
            fundingRoundId: fundingRoundId,
            finalScore: finalScore,
            reputationMultiplier: reputationMultiplier,
            adjustedScore: adjustedScore,
            timestamp: uint48(block.timestamp),
            proposalContentCid: proposalContentCid,
            evaluationContentCid: evaluationContentCid
        });

        emit EvaluationSubmitted(
            proposalId,
            fundingRoundId,
            finalScore,
            adjustedScore,
            proposalContentCid,
            evaluationContentCid
        );
    }

    function getEvaluation(bytes32 proposalId) external view returns (Evaluation memory) {
        return _evaluations[proposalId];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
