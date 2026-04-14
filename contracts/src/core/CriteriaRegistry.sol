// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CriteriaRegistry
 * @notice Defines evaluation criteria with weights in basis points.
 *         Core criteria are always applied; adaptive criteria are per-proposal.
 */
contract CriteriaRegistry is Ownable {
    struct Criterion {
        string name;
        string description;
        uint16 weight; // basis points (0-10000)
        bool isCore;
        bool active;
    }

    mapping(bytes32 => Criterion) public criteria;
    bytes32[] public criterionIds;
    bytes32[] public coreCriterionIds;

    event CriterionAdded(bytes32 indexed criterionId, string name, uint16 weight, bool isCore);
    event CriterionUpdated(bytes32 indexed criterionId, uint16 newWeight, bool active);

    error CriterionAlreadyExists(bytes32 criterionId);
    error CriterionNotFound(bytes32 criterionId);
    error InvalidWeight(uint16 weight);

    constructor() Ownable(msg.sender) {}

    function addCriterion(
        string calldata name,
        string calldata description,
        uint16 weight,
        bool isCore
    ) external onlyOwner returns (bytes32 criterionId) {
        if (weight > 10000) revert InvalidWeight(weight);

        criterionId = keccak256(abi.encodePacked(name));
        if (bytes(criteria[criterionId].name).length != 0) revert CriterionAlreadyExists(criterionId);

        criteria[criterionId] = Criterion({
            name: name,
            description: description,
            weight: weight,
            isCore: isCore,
            active: true
        });

        criterionIds.push(criterionId);
        if (isCore) {
            coreCriterionIds.push(criterionId);
        }

        emit CriterionAdded(criterionId, name, weight, isCore);
    }

    function updateCriterion(bytes32 criterionId, uint16 newWeight, bool active) external onlyOwner {
        if (bytes(criteria[criterionId].name).length == 0) revert CriterionNotFound(criterionId);
        if (newWeight > 10000) revert InvalidWeight(newWeight);

        criteria[criterionId].weight = newWeight;
        criteria[criterionId].active = active;

        emit CriterionUpdated(criterionId, newWeight, active);
    }

    function getCriterion(bytes32 criterionId) external view returns (Criterion memory) {
        return criteria[criterionId];
    }

    function totalCriteria() external view returns (uint256) {
        return criterionIds.length;
    }

    function totalCoreCriteria() external view returns (uint256) {
        return coreCriterionIds.length;
    }
}
