// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IReputationRegistry {
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);
}

contract MilestoneManager is Ownable {
    // --- Errors ---
    error WeightsMustSum10000();
    error FundingMismatch();
    error InvalidAgentId();
    error MilestoneNotPending();
    error InvalidMilestoneIndex();
    error NoReputationScore();
    error TransferFailed();
    error MilestonesAlreadyCreated();

    // --- Events ---
    event MilestonesCreated(uint256 indexed identityId, uint256 count);
    event MilestoneReleased(
        uint256 indexed identityId,
        uint256 index,
        uint256 amount,
        uint16 releaseBps
    );

    // --- Enums ---
    enum MilestoneStatus { PENDING, RELEASED, PARTIAL, FORFEITED }

    // --- Structs ---
    struct MilestoneInput {
        string name;
        string description;
        uint256 amount;
        uint16 weightBps;
    }

    struct Milestone {
        string name;
        string description;
        uint256 amount;
        uint16 weightBps;
        MilestoneStatus status;
        uint256 releasedAmount;
    }

    // --- State ---
    address public immutable identityRegistry;
    address public immutable reputationRegistry;

    mapping(uint256 identityId => Milestone[]) private _milestones;

    constructor(address identityRegistry_, address reputationRegistry_)
        Ownable(msg.sender)
    {
        identityRegistry = identityRegistry_;
        reputationRegistry = reputationRegistry_;
    }

    // --- Create ---

    function createMilestones(
        uint256 identityId,
        MilestoneInput[] calldata inputs
    ) external payable {
        // Verify identity exists
        IERC721(identityRegistry).ownerOf(identityId);

        if (_milestones[identityId].length > 0) revert MilestonesAlreadyCreated();

        // Validate weights sum to 10000
        uint256 totalWeight = 0;
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < inputs.length; i++) {
            totalWeight += inputs[i].weightBps;
            totalAmount += inputs[i].amount;
        }
        if (totalWeight != 10000) revert WeightsMustSum10000();
        if (msg.value != totalAmount) revert FundingMismatch();

        // Store milestones
        for (uint256 i = 0; i < inputs.length; i++) {
            _milestones[identityId].push(Milestone({
                name: inputs[i].name,
                description: inputs[i].description,
                amount: inputs[i].amount,
                weightBps: inputs[i].weightBps,
                status: MilestoneStatus.PENDING,
                releasedAmount: 0
            }));
        }

        emit MilestonesCreated(identityId, inputs.length);
    }

    // --- Release ---

    function releaseMilestone(
        uint256 identityId,
        uint256 milestoneIndex,
        address[] calldata judgeAddresses
    ) external onlyOwner {
        if (milestoneIndex >= _milestones[identityId].length) {
            revert InvalidMilestoneIndex();
        }

        Milestone storage milestone = _milestones[identityId][milestoneIndex];
        if (milestone.status != MilestoneStatus.PENDING) {
            revert MilestoneNotPending();
        }

        // Read reputation score — empty tag1/tag2 to get overall average
        (uint64 count, int128 summaryValue,) = IReputationRegistry(reputationRegistry)
            .getSummary(identityId, judgeAddresses, "", "");

        if (count == 0) revert NoReputationScore();

        // Calculate release amount: score is in basis points (e.g., 8700 = 87%)
        uint16 releaseBps = uint16(uint128(summaryValue > 10000 ? int128(10000) : (summaryValue < 0 ? int128(0) : summaryValue)));
        uint256 releaseAmount = (milestone.amount * releaseBps) / 10000;

        milestone.status = MilestoneStatus.RELEASED;
        milestone.releasedAmount = releaseAmount;

        // Transfer funds to identity owner
        address recipient = IERC721(identityRegistry).ownerOf(identityId);
        (bool success,) = recipient.call{value: releaseAmount}("");
        if (!success) revert TransferFailed();

        emit MilestoneReleased(identityId, milestoneIndex, releaseAmount, releaseBps);
    }

    // --- Read ---

    function getMilestones(uint256 identityId)
        external
        view
        returns (Milestone[] memory)
    {
        return _milestones[identityId];
    }

    // Accept ETH
    receive() external payable {}
}
