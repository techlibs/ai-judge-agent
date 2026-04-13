// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ReputationRegistry {
    // --- Errors ---
    error AlreadyInitialized();
    error NotInitialized();
    error InvalidAgentId();
    error InvalidValueDecimals();
    error SelfFeedbackNotAllowed();
    error NotFeedbackSubmitter();
    error InvalidFeedbackIndex();
    error ClientsRequired();

    // --- Events ---
    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseURI,
        bytes32 responseHash
    );

    // --- Structs ---
    struct Feedback {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool isRevoked;
    }

    // --- State ---
    address private _identityRegistry;
    bool private _initialized;

    // agentId => clientAddress => feedbackIndex => Feedback
    mapping(uint256 => mapping(address => mapping(uint64 => Feedback))) private _feedback;
    // agentId => clientAddress => lastIndex
    mapping(uint256 => mapping(address => uint64)) private _lastIndex;
    // agentId => unique clients array
    mapping(uint256 => address[]) private _clients;
    // agentId => clientAddress => hasSubmitted (for unique tracking)
    mapping(uint256 => mapping(address => bool)) private _isClient;

    // --- Initialization ---

    function initialize(address identityRegistry_) external {
        if (_initialized) revert AlreadyInitialized();
        _identityRegistry = identityRegistry_;
        _initialized = true;
    }

    function getIdentityRegistry() external view returns (address) {
        return _identityRegistry;
    }

    // --- Feedback ---

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        _requireInitialized();
        _requireValidAgent(agentId);
        if (valueDecimals > 18) revert InvalidValueDecimals();

        // Self-feedback check: submitter must not be owner or approved operator
        address agentOwner = IERC721(_identityRegistry).ownerOf(agentId);
        if (msg.sender == agentOwner) revert SelfFeedbackNotAllowed();
        if (IERC721(_identityRegistry).isApprovedForAll(agentOwner, msg.sender)) {
            revert SelfFeedbackNotAllowed();
        }

        // Track unique clients
        if (!_isClient[agentId][msg.sender]) {
            _clients[agentId].push(msg.sender);
            _isClient[agentId][msg.sender] = true;
        }

        // Store feedback (1-indexed)
        uint64 feedbackIndex = ++_lastIndex[agentId][msg.sender];
        _feedback[agentId][msg.sender][feedbackIndex] = Feedback({
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            isRevoked: false
        });

        emit NewFeedback(
            agentId,
            msg.sender,
            feedbackIndex,
            value,
            valueDecimals,
            tag1,
            tag1,
            tag2,
            endpoint,
            feedbackURI,
            feedbackHash
        );
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        if (_feedback[agentId][msg.sender][feedbackIndex].valueDecimals == 0 &&
            _feedback[agentId][msg.sender][feedbackIndex].value == 0 &&
            bytes(_feedback[agentId][msg.sender][feedbackIndex].tag1).length == 0) {
            revert NotFeedbackSubmitter();
        }
        // Only the original submitter can revoke
        if (_lastIndex[agentId][msg.sender] < feedbackIndex) {
            revert NotFeedbackSubmitter();
        }

        _feedback[agentId][msg.sender][feedbackIndex].isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external {
        emit ResponseAppended(
            agentId,
            clientAddress,
            feedbackIndex,
            msg.sender,
            responseURI,
            responseHash
        );
    }

    // --- Read ---

    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    )
        external
        view
        returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked)
    {
        Feedback storage fb = _feedback[agentId][clientAddress][feedbackIndex];
        return (fb.value, fb.valueDecimals, fb.tag1, fb.tag2, fb.isRevoked);
    }

    function readAllFeedback(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2,
        bool includeRevoked
    )
        external
        view
        returns (
            address[] memory clients,
            uint64[] memory feedbackIndexes,
            int128[] memory values,
            uint8[] memory valueDecimals,
            string[] memory tag1s,
            string[] memory tag2s,
            bool[] memory revokedStatuses
        )
    {
        // Count matching entries first
        uint256 count = 0;
        for (uint256 i = 0; i < clientAddresses.length; i++) {
            uint64 lastIdx = _lastIndex[agentId][clientAddresses[i]];
            for (uint64 j = 1; j <= lastIdx; j++) {
                Feedback storage fb = _feedback[agentId][clientAddresses[i]][j];
                if (!includeRevoked && fb.isRevoked) continue;
                if (bytes(tag1).length > 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;
                count++;
            }
        }

        // Allocate arrays
        clients = new address[](count);
        feedbackIndexes = new uint64[](count);
        values = new int128[](count);
        valueDecimals = new uint8[](count);
        tag1s = new string[](count);
        tag2s = new string[](count);
        revokedStatuses = new bool[](count);

        // Fill arrays
        uint256 idx = 0;
        for (uint256 i = 0; i < clientAddresses.length; i++) {
            uint64 lastIdx = _lastIndex[agentId][clientAddresses[i]];
            for (uint64 j = 1; j <= lastIdx; j++) {
                Feedback storage fb = _feedback[agentId][clientAddresses[i]][j];
                if (!includeRevoked && fb.isRevoked) continue;
                if (bytes(tag1).length > 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;

                clients[idx] = clientAddresses[i];
                feedbackIndexes[idx] = j;
                values[idx] = fb.value;
                valueDecimals[idx] = fb.valueDecimals;
                tag1s[idx] = fb.tag1;
                tag2s[idx] = fb.tag2;
                revokedStatuses[idx] = fb.isRevoked;
                idx++;
            }
        }
    }

    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    )
        external
        view
        returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
    {
        if (clientAddresses.length == 0) revert ClientsRequired();

        int256 total = 0;
        uint64 matchCount = 0;
        uint8 maxDecimals = 0;

        for (uint256 i = 0; i < clientAddresses.length; i++) {
            uint64 lastIdx = _lastIndex[agentId][clientAddresses[i]];
            for (uint64 j = 1; j <= lastIdx; j++) {
                Feedback storage fb = _feedback[agentId][clientAddresses[i]][j];
                if (fb.isRevoked) continue;
                if (bytes(tag1).length > 0 && keccak256(bytes(fb.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(fb.tag2)) != keccak256(bytes(tag2))) continue;

                total += fb.value;
                if (fb.valueDecimals > maxDecimals) maxDecimals = fb.valueDecimals;
                matchCount++;
            }
        }

        if (matchCount > 0) {
            summaryValue = int128(total / int256(uint256(matchCount)));
        }
        count = matchCount;
        summaryValueDecimals = maxDecimals;
    }

    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    function getLastIndex(uint256 agentId, address clientAddress)
        external
        view
        returns (uint64)
    {
        return _lastIndex[agentId][clientAddress];
    }

    // --- Internal ---

    function _requireInitialized() internal view {
        if (!_initialized) revert NotInitialized();
    }

    function _requireValidAgent(uint256 agentId) internal view {
        // Will revert with ERC721NonexistentToken if not minted
        try IERC721(_identityRegistry).ownerOf(agentId) returns (address) {
            // exists
        } catch {
            revert InvalidAgentId();
        }
    }
}
