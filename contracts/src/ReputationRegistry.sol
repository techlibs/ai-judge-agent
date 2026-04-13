// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface IIdentityRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract ReputationRegistry is AccessControl, Pausable {
    bytes32 public constant EVALUATOR_ROLE = keccak256("EVALUATOR_ROLE");

    uint8 public constant VALUE_DECIMALS = 2;
    uint256 public constant MAX_FEEDBACK_PER_AGENT = 10000;
    uint256 public constant MAX_TAG_LENGTH = 64;
    uint256 public constant MAX_PAGINATION_LIMIT = 100;
    uint256 public constant MAX_CLIENT_ADDRESSES = 50;
    uint256 public constant BASIS_POINTS = 10000;

    IIdentityRegistry public immutable identityRegistry;

    struct Feedback {
        address clientAddress;
        uint256 value;
        string tag1;
        string tag2;
        string feedbackURI;
        bytes32 feedbackHash;
        bool exists;
        bool isRevoked;
        uint48 timestamp;
    }

    struct FeedbackSummary {
        uint256 totalFeedback;
        uint256 activeFeedback;
        uint256 averageValueBps;
    }

    mapping(uint256 => Feedback[]) private _feedback;
    mapping(uint256 => mapping(address => mapping(string => bool))) private _hasGivenFeedback;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint256 feedbackIndex,
        uint256 value,
        string tag1,
        string tag2,
        string feedbackURI,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        uint256 feedbackIndex
    );

    event FeedbackResponseAppended(
        uint256 indexed agentId,
        uint256 feedbackIndex,
        address indexed responder,
        string responseURI,
        bytes32 responseHash
    );

    error AgentNotRegistered(uint256 agentId);
    error MaxFeedbackReached(uint256 agentId);
    error TagTooLong(uint256 length);
    error FeedbackDoesNotExist(uint256 agentId, uint256 feedbackIndex);
    error FeedbackAlreadyRevoked(uint256 agentId, uint256 feedbackIndex);
    error NotFeedbackAuthor(uint256 agentId, uint256 feedbackIndex);
    error DuplicateFeedback(uint256 agentId, address clientAddress, string tag1);
    error PaginationLimitExceeded(uint256 limit);
    error ClientAddressLimitExceeded(uint256 count);

    constructor(address identityRegistry_) {
        identityRegistry = IIdentityRegistry(identityRegistry_);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(EVALUATOR_ROLE, msg.sender);
    }

    function giveFeedback(
        uint256 agentId,
        uint256 value,
        string calldata tag1,
        string calldata tag2,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external onlyRole(EVALUATOR_ROLE) whenNotPaused {
        // Cross-contract validation
        identityRegistry.ownerOf(agentId);

        if (_feedback[agentId].length >= MAX_FEEDBACK_PER_AGENT) {
            revert MaxFeedbackReached(agentId);
        }
        if (bytes(tag1).length > MAX_TAG_LENGTH) {
            revert TagTooLong(bytes(tag1).length);
        }
        if (bytes(tag2).length > MAX_TAG_LENGTH) {
            revert TagTooLong(bytes(tag2).length);
        }

        // Anti-Sybil: one feedback per (client, agent, tag1)
        if (_hasGivenFeedback[agentId][msg.sender][tag1]) {
            revert DuplicateFeedback(agentId, msg.sender, tag1);
        }

        uint256 feedbackIndex = _feedback[agentId].length;

        _feedback[agentId].push(Feedback({
            clientAddress: msg.sender,
            value: value,
            tag1: tag1,
            tag2: tag2,
            feedbackURI: feedbackURI,
            feedbackHash: feedbackHash,
            exists: true,
            isRevoked: false,
            timestamp: uint48(block.timestamp)
        }));

        _hasGivenFeedback[agentId][msg.sender][tag1] = true;

        emit NewFeedback(
            agentId,
            msg.sender,
            feedbackIndex,
            value,
            tag1,
            tag2,
            feedbackURI,
            feedbackHash
        );
    }

    function revokeFeedback(
        uint256 agentId,
        uint256 feedbackIndex
    ) external whenNotPaused {
        if (feedbackIndex >= _feedback[agentId].length) {
            revert FeedbackDoesNotExist(agentId, feedbackIndex);
        }

        Feedback storage fb = _feedback[agentId][feedbackIndex];

        if (!fb.exists) {
            revert FeedbackDoesNotExist(agentId, feedbackIndex);
        }
        if (fb.isRevoked) {
            revert FeedbackAlreadyRevoked(agentId, feedbackIndex);
        }
        if (fb.clientAddress != msg.sender) {
            revert NotFeedbackAuthor(agentId, feedbackIndex);
        }

        fb.isRevoked = true;

        emit FeedbackRevoked(agentId, feedbackIndex);
    }

    function appendResponse(
        uint256 agentId,
        uint256 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external whenNotPaused {
        if (feedbackIndex >= _feedback[agentId].length) {
            revert FeedbackDoesNotExist(agentId, feedbackIndex);
        }

        Feedback storage fb = _feedback[agentId][feedbackIndex];
        if (!fb.exists) {
            revert FeedbackDoesNotExist(agentId, feedbackIndex);
        }

        // Only agent owner can respond
        address agentOwner = identityRegistry.ownerOf(agentId);
        if (msg.sender != agentOwner) {
            revert NotFeedbackAuthor(agentId, feedbackIndex);
        }

        emit FeedbackResponseAppended(
            agentId,
            feedbackIndex,
            msg.sender,
            responseURI,
            responseHash
        );
    }

    function readAllFeedback(
        uint256 agentId,
        uint256 offset,
        uint256 limit
    ) external view returns (Feedback[] memory) {
        if (limit > MAX_PAGINATION_LIMIT) {
            revert PaginationLimitExceeded(limit);
        }

        Feedback[] storage allFeedback = _feedback[agentId];
        if (offset >= allFeedback.length) {
            return new Feedback[](0);
        }

        uint256 end = offset + limit;
        if (end > allFeedback.length) {
            end = allFeedback.length;
        }

        uint256 resultLength = end - offset;
        Feedback[] memory result = new Feedback[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            result[i] = allFeedback[offset + i];
        }

        return result;
    }

    function getSummary(
        uint256 agentId
    ) external view returns (FeedbackSummary memory) {
        Feedback[] storage allFeedback = _feedback[agentId];
        uint256 total = allFeedback.length;
        uint256 active = 0;
        uint256 valueSum = 0;

        for (uint256 i = 0; i < total; i++) {
            if (!allFeedback[i].isRevoked) {
                active++;
                valueSum += allFeedback[i].value;
            }
        }

        uint256 averageValueBps = 0;
        if (active > 0) {
            averageValueBps = (valueSum * BASIS_POINTS) / active;
        }

        return FeedbackSummary({
            totalFeedback: total,
            activeFeedback: active,
            averageValueBps: averageValueBps
        });
    }

    function getFeedbackCount(uint256 agentId) external view returns (uint256) {
        return _feedback[agentId].length;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
