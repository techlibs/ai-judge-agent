// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

interface IIdentityRegistryValidation {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract ValidationRegistry is AccessControl, Pausable {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    uint256 public constant MAX_TAG_LENGTH = 64;

    IIdentityRegistryValidation public immutable identityRegistry;

    struct ValidationRequest {
        address requester;
        uint256 agentId;
        string requestURI;
        uint48 createdAt;
        bool responded;
    }

    struct ValidationResponse {
        address validator;
        uint8 score;
        string responseURI;
        bytes32 responseHash;
        string tag;
        uint48 respondedAt;
    }

    struct ValidationSummary {
        uint256 totalRequests;
        uint256 respondedRequests;
        uint256 averageScoreBps;
    }

    uint256 private _requestCount;
    mapping(uint256 => ValidationRequest) private _requests;
    mapping(uint256 => ValidationResponse) private _responses;

    event ValidationRequested(
        uint256 indexed requestId,
        uint256 indexed agentId,
        address indexed requester,
        string requestURI
    );

    event ValidationResponded(
        uint256 indexed requestId,
        uint256 indexed agentId,
        address indexed validator,
        uint8 score,
        string responseURI,
        bytes32 responseHash,
        string tag
    );

    error AgentNotRegistered(uint256 agentId);
    error RequestDoesNotExist(uint256 requestId);
    error AlreadyResponded(uint256 requestId);
    error TagTooLong(uint256 length);
    error InvalidScore(uint8 score);

    constructor(address identityRegistry_) {
        identityRegistry = IIdentityRegistryValidation(identityRegistry_);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
    }

    function validationRequest(
        uint256 agentId,
        string calldata requestURI
    ) external whenNotPaused returns (uint256) {
        // Cross-contract validation
        identityRegistry.ownerOf(agentId);

        uint256 requestId = _requestCount;
        _requestCount++;

        _requests[requestId] = ValidationRequest({
            requester: msg.sender,
            agentId: agentId,
            requestURI: requestURI,
            createdAt: uint48(block.timestamp),
            responded: false
        });

        emit ValidationRequested(requestId, agentId, msg.sender, requestURI);

        return requestId;
    }

    function validationResponse(
        uint256 requestId,
        uint8 score,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external onlyRole(VALIDATOR_ROLE) whenNotPaused {
        ValidationRequest storage req = _requests[requestId];

        if (req.createdAt == 0) {
            revert RequestDoesNotExist(requestId);
        }
        if (req.responded) {
            revert AlreadyResponded(requestId);
        }
        if (score > 100) {
            revert InvalidScore(score);
        }
        if (bytes(tag).length > MAX_TAG_LENGTH) {
            revert TagTooLong(bytes(tag).length);
        }

        req.responded = true;

        _responses[requestId] = ValidationResponse({
            validator: msg.sender,
            score: score,
            responseURI: responseURI,
            responseHash: responseHash,
            tag: tag,
            respondedAt: uint48(block.timestamp)
        });

        emit ValidationResponded(
            requestId,
            req.agentId,
            msg.sender,
            score,
            responseURI,
            responseHash,
            tag
        );
    }

    function getRequest(uint256 requestId) external view returns (ValidationRequest memory) {
        return _requests[requestId];
    }

    function getResponse(uint256 requestId) external view returns (ValidationResponse memory) {
        return _responses[requestId];
    }

    function getSummary(
        uint256 agentId
    ) external view returns (ValidationSummary memory) {
        uint256 totalRequests = 0;
        uint256 respondedRequests = 0;
        uint256 scoreSum = 0;

        for (uint256 i = 0; i < _requestCount; i++) {
            if (_requests[i].agentId == agentId) {
                totalRequests++;
                if (_requests[i].responded) {
                    respondedRequests++;
                    scoreSum += _responses[i].score;
                }
            }
        }

        uint256 averageScoreBps = 0;
        if (respondedRequests > 0) {
            averageScoreBps = (scoreSum * 10000) / respondedRequests;
        }

        return ValidationSummary({
            totalRequests: totalRequests,
            respondedRequests: respondedRequests,
            averageScoreBps: averageScoreBps
        });
    }

    function getRequestCount() external view returns (uint256) {
        return _requestCount;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
