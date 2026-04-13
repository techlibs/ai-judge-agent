// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IIdentityRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
}

/// @title ReputationRegistry
/// @notice Stores evaluation feedback scores for registered projects.
contract ReputationRegistry is AccessControl, Pausable {
    bytes32 public constant EVALUATOR_ROLE = keccak256("EVALUATOR_ROLE");
    uint256 private constant MAX_SCORE = 100;

    IIdentityRegistry public immutable identityRegistry;

    struct Feedback {
        bool exists;
        address evaluator;
        uint256 score;
        string contentHash;
        uint256 timestamp;
    }

    mapping(uint256 => Feedback[]) private _feedbacks;
    mapping(uint256 => uint256) private _totalScore;
    mapping(uint256 => uint256) private _feedbackCount;

    event FeedbackGiven(
        uint256 indexed tokenId,
        address indexed evaluator,
        uint256 score,
        string contentHash
    );

    error InvalidScore(uint256 score);
    error FeedbackIndexOutOfBounds(uint256 index, uint256 length);
    error InvalidIdentityRegistry();
    error ProjectNotRegistered(uint256 tokenId);
    error ContentHashTooLong(uint256 length);

    constructor(address identityRegistry_) {
        if (identityRegistry_ == address(0)) revert InvalidIdentityRegistry();

        identityRegistry = IIdentityRegistry(identityRegistry_);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EVALUATOR_ROLE, msg.sender);
    }

    /// @notice Submit evaluation feedback for a project
    /// @param tokenId The project token ID (must exist in IdentityRegistry)
    /// @param score Evaluation score 0-100
    /// @param contentHash IPFS CID of the full evaluation content
    function giveFeedback(uint256 tokenId, uint256 score, string calldata contentHash)
        external
        onlyRole(EVALUATOR_ROLE)
        whenNotPaused
    {
        if (score > MAX_SCORE) revert InvalidScore(score);
        if (bytes(contentHash).length > 256) revert ContentHashTooLong(bytes(contentHash).length);

        // Verify project exists in IdentityRegistry
        try identityRegistry.ownerOf(tokenId) returns (address) {
            // Project exists, proceed
        } catch {
            revert ProjectNotRegistered(tokenId);
        }

        _feedbacks[tokenId].push(
            Feedback({
                exists: true,
                evaluator: msg.sender,
                score: score,
                contentHash: contentHash,
                timestamp: block.timestamp
            })
        );

        _totalScore[tokenId] += score;
        _feedbackCount[tokenId]++;

        emit FeedbackGiven(tokenId, msg.sender, score, contentHash);
    }

    /// @notice Get summary statistics for a project
    /// @param tokenId The project token ID
    /// @return feedbackCount Number of feedback entries
    /// @return averageScore Average score across all feedback (0 if none)
    function getSummary(uint256 tokenId)
        external
        view
        returns (uint256 feedbackCount, uint256 averageScore)
    {
        feedbackCount = _feedbackCount[tokenId];

        if (feedbackCount == 0) {
            return (0, 0);
        }

        averageScore = _totalScore[tokenId] / feedbackCount;
    }

    /// @notice Read a single feedback entry
    /// @param tokenId The project token ID
    /// @param index The feedback index
    function readFeedback(uint256 tokenId, uint256 index)
        external
        view
        returns (address evaluator, uint256 score, string memory contentHash, uint256 timestamp)
    {
        Feedback[] storage feedbacks = _feedbacks[tokenId];
        if (index >= feedbacks.length) {
            revert FeedbackIndexOutOfBounds(index, feedbacks.length);
        }

        Feedback storage fb = feedbacks[index];
        return (fb.evaluator, fb.score, fb.contentHash, fb.timestamp);
    }

    /// @notice Get the number of feedback entries for a project
    /// @param tokenId The project token ID
    function getFeedbackCount(uint256 tokenId) external view returns (uint256) {
        return _feedbacks[tokenId].length;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
