// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract DisputeRegistry is AccessControl, Pausable {
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    uint256 public constant MIN_STAKE = 0.01 ether;
    uint256 public constant DISPUTE_WINDOW = 7 days;
    uint256 public constant VOTING_PERIOD = 3 days;

    enum DisputeStatus {
        Open,
        Upheld,
        Overturned
    }

    struct Dispute {
        bytes32 proposalId;
        address initiator;
        uint256 stakeAmount;
        string evidenceCid;
        DisputeStatus status;
        uint16 newScore;
        uint48 deadline;
        uint48 createdAt;
        uint32 upholdVotes;
        uint32 overturnVotes;
    }

    struct Vote {
        address validator;
        uint256 stakeAmount;
        bool voteUphold;
        uint48 timestamp;
    }

    uint256 private _disputeCount;
    mapping(uint256 => Dispute) private _disputes;
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    mapping(uint256 => Vote[]) private _votes;

    event DisputeOpened(
        uint256 indexed disputeId,
        bytes32 indexed proposalId,
        address indexed initiator,
        uint256 stakeAmount,
        string evidenceCid,
        uint48 deadline
    );

    event DisputeVoteCast(
        uint256 indexed disputeId,
        address indexed validator,
        bool voteUphold,
        uint256 stakeAmount
    );

    event DisputeResolved(
        uint256 indexed disputeId,
        DisputeStatus status,
        uint16 newScore
    );

    error InsufficientStake(uint256 provided, uint256 required);
    error DisputeNotOpen(uint256 disputeId);
    error VotingPeriodExpired(uint256 disputeId);
    error VotingPeriodActive(uint256 disputeId);
    error AlreadyVoted(uint256 disputeId, address validator);
    error EmptyEvidenceCid();
    error InvalidNewScore(uint16 score);
    error DisputeDoesNotExist(uint256 disputeId);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VALIDATOR_ROLE, msg.sender);
    }

    function openDispute(
        bytes32 proposalId,
        string calldata evidenceCid
    ) external payable whenNotPaused returns (uint256) {
        if (msg.value < MIN_STAKE) {
            revert InsufficientStake(msg.value, MIN_STAKE);
        }
        if (bytes(evidenceCid).length == 0) {
            revert EmptyEvidenceCid();
        }

        uint256 disputeId = _disputeCount;
        _disputeCount++;

        uint48 deadline = uint48(block.timestamp + VOTING_PERIOD);

        _disputes[disputeId] = Dispute({
            proposalId: proposalId,
            initiator: msg.sender,
            stakeAmount: msg.value,
            evidenceCid: evidenceCid,
            status: DisputeStatus.Open,
            newScore: 0,
            deadline: deadline,
            createdAt: uint48(block.timestamp),
            upholdVotes: 0,
            overturnVotes: 0
        });

        emit DisputeOpened(
            disputeId,
            proposalId,
            msg.sender,
            msg.value,
            evidenceCid,
            deadline
        );

        return disputeId;
    }

    function castVote(
        uint256 disputeId,
        bool voteUphold
    ) external payable onlyRole(VALIDATOR_ROLE) whenNotPaused {
        Dispute storage dispute = _disputes[disputeId];

        if (dispute.createdAt == 0) {
            revert DisputeDoesNotExist(disputeId);
        }
        if (dispute.status != DisputeStatus.Open) {
            revert DisputeNotOpen(disputeId);
        }
        if (block.timestamp > dispute.deadline) {
            revert VotingPeriodExpired(disputeId);
        }
        if (_hasVoted[disputeId][msg.sender]) {
            revert AlreadyVoted(disputeId, msg.sender);
        }
        if (msg.value < MIN_STAKE) {
            revert InsufficientStake(msg.value, MIN_STAKE);
        }

        _hasVoted[disputeId][msg.sender] = true;

        _votes[disputeId].push(Vote({
            validator: msg.sender,
            stakeAmount: msg.value,
            voteUphold: voteUphold,
            timestamp: uint48(block.timestamp)
        }));

        if (voteUphold) {
            dispute.upholdVotes++;
        } else {
            dispute.overturnVotes++;
        }

        emit DisputeVoteCast(disputeId, msg.sender, voteUphold, msg.value);
    }

    function resolveDispute(
        uint256 disputeId,
        uint16 newScore
    ) external onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        Dispute storage dispute = _disputes[disputeId];

        if (dispute.createdAt == 0) {
            revert DisputeDoesNotExist(disputeId);
        }
        if (dispute.status != DisputeStatus.Open) {
            revert DisputeNotOpen(disputeId);
        }
        if (block.timestamp <= dispute.deadline) {
            revert VotingPeriodActive(disputeId);
        }

        bool overturned = dispute.overturnVotes > dispute.upholdVotes;

        if (overturned) {
            if (newScore > 1000) {
                revert InvalidNewScore(newScore);
            }
            dispute.status = DisputeStatus.Overturned;
            dispute.newScore = newScore;
        } else {
            dispute.status = DisputeStatus.Upheld;
        }

        emit DisputeResolved(disputeId, dispute.status, dispute.newScore);
    }

    function getDispute(uint256 disputeId) external view returns (Dispute memory) {
        return _disputes[disputeId];
    }

    function getVotes(uint256 disputeId) external view returns (Vote[] memory) {
        return _votes[disputeId];
    }

    function getDisputeCount() external view returns (uint256) {
        return _disputeCount;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
