// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {TextStorage} from "../periphery/TextStorage.sol";

/// @title ProposalRegistry
/// @notice Manages grant proposal submissions for IPE City
/// @dev Stores minimal data on-chain (IPFS CID model). Full proposal content lives on IPFS.
contract ProposalRegistry {
    // --- Enums ---
    enum ProposalStatus { Submitted, UnderReview, Evaluated, Disputed }
    enum ProposalDomain { DeFi, Governance, Education, Health, Infrastructure, Other }

    // --- Structs ---
    struct Proposal {
        address submitter;
        uint48 submittedAt;
        ProposalStatus status;
        bytes32 contentCid;
        bytes32 repoUrlHash;
        bytes32 demoUrlHash;
        ProposalDomain domain;
    }

    // --- Errors ---
    error InvalidContentCid();
    error ProposalAlreadyExists(bytes32 proposalId);
    error ProposalNotFound(bytes32 proposalId);
    error InvalidStatusTransition(ProposalStatus from, ProposalStatus to);
    error Unauthorized();

    // --- Events ---
    event ProposalSubmitted(
        bytes32 indexed proposalId,
        address indexed submitter,
        bytes32 contentCid,
        ProposalDomain domain,
        uint48 submittedAt
    );

    // --- State ---
    address public owner;
    mapping(bytes32 => Proposal) public proposals;
    bytes32[] public proposalIds;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    // --- External Functions ---

    /// @notice Submit a new grant proposal
    /// @param title The proposal title (used for deterministic ID generation)
    /// @param contentCid IPFS content hash (32-byte SHA-256 digest)
    /// @param repoUrlHash keccak256 of the code repository URL
    /// @param demoUrlHash keccak256 of the working demo URL
    /// @param domain The proposal domain category
    /// @return proposalId Deterministic proposal identifier
    function submitProposal(
        string calldata title,
        bytes32 contentCid,
        bytes32 repoUrlHash,
        bytes32 demoUrlHash,
        ProposalDomain domain
    ) external returns (bytes32 proposalId) {
        if (contentCid == bytes32(0)) revert InvalidContentCid();

        proposalId = keccak256(abi.encodePacked(msg.sender, title, block.timestamp));
        if (proposals[proposalId].submittedAt != 0) revert ProposalAlreadyExists(proposalId);

        proposals[proposalId] = Proposal({
            submitter: msg.sender,
            submittedAt: uint48(block.timestamp),
            status: ProposalStatus.Submitted,
            contentCid: contentCid,
            repoUrlHash: repoUrlHash,
            demoUrlHash: demoUrlHash,
            domain: domain
        });
        proposalIds.push(proposalId);

        emit ProposalSubmitted(proposalId, msg.sender, contentCid, domain, uint48(block.timestamp));
    }

    /// @notice Transition a proposal's status (owner only)
    /// @param proposalId The proposal to update
    /// @param newStatus The target status
    function setStatus(bytes32 proposalId, ProposalStatus newStatus) external onlyOwner {
        Proposal storage proposal = proposals[proposalId];
        if (proposal.submittedAt == 0) revert ProposalNotFound(proposalId);

        ProposalStatus currentStatus = proposal.status;
        if (!_isValidTransition(currentStatus, newStatus)) {
            revert InvalidStatusTransition(currentStatus, newStatus);
        }

        proposal.status = newStatus;
    }

    /// @notice Check if a proposal exists
    /// @param proposalId The proposal identifier
    /// @return True if the proposal has been submitted
    function proposalExists(bytes32 proposalId) external view returns (bool) {
        return proposals[proposalId].submittedAt != 0;
    }

    /// @notice Get the total number of submitted proposals
    /// @return The proposal count
    function proposalCount() external view returns (uint256) {
        return proposalIds.length;
    }

    /// @notice Emit proposal text as chunked events for on-chain backup (optional)
    /// @param proposalId The proposal this text belongs to
    /// @param content The full proposal text content
    function backupProposalText(bytes32 proposalId, bytes calldata content) external {
        if (proposals[proposalId].submittedAt == 0) revert ProposalNotFound(proposalId);
        TextStorage.emitText(proposalId, bytes32(0), content);
    }

    // --- Internal Functions ---

    /// @notice Validate status transitions follow the linear progression
    /// @dev Submitted -> UnderReview -> Evaluated -> Disputed
    function _isValidTransition(ProposalStatus from, ProposalStatus to) internal pure returns (bool) {
        if (from == ProposalStatus.Submitted && to == ProposalStatus.UnderReview) return true;
        if (from == ProposalStatus.UnderReview && to == ProposalStatus.Evaluated) return true;
        if (from == ProposalStatus.Evaluated && to == ProposalStatus.Disputed) return true;
        return false;
    }
}
