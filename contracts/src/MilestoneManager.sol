// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MilestoneManager is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant RELEASE_MANAGER_ROLE = keccak256("RELEASE_MANAGER_ROLE");

    uint16 public constant FUND_RELEASE_DIVISOR = 10;
    uint16 public constant BONUS_THRESHOLD = 900;
    uint256 private constant TRANSFER_GAS_CAP = 10000;

    struct Milestone {
        uint16 score;
        uint16 releasePercentage;
        bool released;
        uint256 totalAmount;
        uint256 releasedAmount;
    }

    mapping(bytes32 => mapping(uint8 => Milestone)) private _milestones;
    address public matchingPool;

    event FundReleased(
        bytes32 indexed projectId,
        uint8 milestoneIndex,
        uint256 amount,
        uint16 releasePercentage
    );

    event UnreleasedFundsWithdrawn(
        bytes32 indexed projectId,
        uint8 milestoneIndex,
        uint256 amount,
        address indexed recipient
    );

    event EmergencyWithdrawal(
        address indexed recipient,
        uint256 amount
    );

    event FundsForwarded(
        bytes32 indexed projectId,
        uint256 amount,
        address matchingPool
    );

    event BonusDistributed(
        bytes32 indexed projectId,
        uint256 amount,
        uint16 score
    );

    error MilestoneAlreadyReleased(bytes32 projectId, uint8 milestoneIndex);
    error InvalidScore(uint16 score);
    error NoFundsToRelease();
    error TransferFailed();
    error ZeroAddress();
    error MilestoneNotReleased();
    error NoUnreleasedFunds();

    constructor(address matchingPool_) {
        if (matchingPool_ == address(0)) {
            revert ZeroAddress();
        }
        matchingPool = matchingPool_;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(RELEASE_MANAGER_ROLE, msg.sender);
    }

    function releaseMilestone(
        bytes32 projectId,
        uint8 milestoneIndex,
        uint16 score,
        address payable recipient
    ) external onlyRole(RELEASE_MANAGER_ROLE) whenNotPaused nonReentrant {
        Milestone storage milestone = _milestones[projectId][milestoneIndex];

        if (milestone.released) {
            revert MilestoneAlreadyReleased(projectId, milestoneIndex);
        }
        if (score > 1000) {
            revert InvalidScore(score);
        }
        if (recipient == address(0)) {
            revert ZeroAddress();
        }
        if (milestone.totalAmount == 0) {
            revert NoFundsToRelease();
        }

        uint16 releasePercentage = score / FUND_RELEASE_DIVISOR;
        uint256 releaseAmount = (milestone.totalAmount * releasePercentage) / 1000;

        milestone.score = score;
        milestone.releasePercentage = releasePercentage;
        milestone.released = true;
        milestone.releasedAmount = releaseAmount;

        if (releaseAmount > 0) {
            (bool success, ) = recipient.call{value: releaseAmount, gas: TRANSFER_GAS_CAP}("");
            if (!success) {
                revert TransferFailed();
            }
        }

        emit FundReleased(projectId, milestoneIndex, releaseAmount, releasePercentage);

        uint256 unreleasedAmount = milestone.totalAmount - releaseAmount;
        if (unreleasedAmount > 0) {
            (bool forwardSuccess, ) = payable(matchingPool).call{value: unreleasedAmount, gas: TRANSFER_GAS_CAP}("");
            if (!forwardSuccess) {
                revert TransferFailed();
            }
            emit FundsForwarded(projectId, unreleasedAmount, matchingPool);
        }

        if (score >= BONUS_THRESHOLD) {
            emit BonusDistributed(projectId, releaseAmount, score);
        }
    }

    function fundMilestone(
        bytes32 projectId,
        uint8 milestoneIndex
    ) external payable {
        _milestones[projectId][milestoneIndex].totalAmount += msg.value;
    }

    function withdrawUnreleasedFunds(
        bytes32 projectId,
        uint8 milestoneIndex,
        address payable recipient
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }

        Milestone storage milestone = _milestones[projectId][milestoneIndex];
        if (!milestone.released) {
            revert MilestoneNotReleased();
        }

        uint256 unreleased = milestone.totalAmount - milestone.releasedAmount;
        if (unreleased == 0) {
            revert NoUnreleasedFunds();
        }

        milestone.releasedAmount = milestone.totalAmount;

        (bool success, ) = recipient.call{value: unreleased, gas: TRANSFER_GAS_CAP}("");
        if (!success) {
            revert TransferFailed();
        }

        emit UnreleasedFundsWithdrawn(projectId, milestoneIndex, unreleased, recipient);
    }

    function emergencyWithdraw(
        address payable recipient
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (recipient == address(0)) {
            revert ZeroAddress();
        }

        uint256 balance = address(this).balance;
        if (balance == 0) {
            revert NoFundsToRelease();
        }

        (bool success, ) = recipient.call{value: balance, gas: TRANSFER_GAS_CAP}("");
        if (!success) {
            revert TransferFailed();
        }

        emit EmergencyWithdrawal(recipient, balance);
    }

    function getMilestone(
        bytes32 projectId,
        uint8 milestoneIndex
    ) external view returns (Milestone memory) {
        return _milestones[projectId][milestoneIndex];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    receive() external payable {}
}
