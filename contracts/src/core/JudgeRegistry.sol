// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title JudgeRegistry
 * @notice Soulbound ERC-721 for AI judge identity. Tokens cannot be transferred.
 */
contract JudgeRegistry is ERC721, Ownable {
    enum JudgeRole { Security, Impact, Alignment, Adaptive }

    struct Judge {
        JudgeRole role;
        string specialization;
        uint48 registeredAt;
        bool active;
    }

    uint256 private _nextTokenId;
    mapping(uint256 => Judge) public judges;
    mapping(address => uint256) public judgeByWallet;

    event JudgeRegistered(uint256 indexed judgeId, address indexed wallet, JudgeRole role, string specialization);
    event JudgeDeactivated(uint256 indexed judgeId);
    event JudgeActivated(uint256 indexed judgeId);

    error AlreadyRegistered(address wallet);
    error JudgeNotFound(uint256 judgeId);
    error SoulboundTransfer();

    constructor() ERC721("IPE Judge", "JUDGE") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    function registerJudge(
        address wallet,
        JudgeRole role,
        string calldata specialization
    ) external onlyOwner returns (uint256 judgeId) {
        if (judgeByWallet[wallet] != 0) revert AlreadyRegistered(wallet);

        judgeId = _nextTokenId++;
        _mint(wallet, judgeId);

        judges[judgeId] = Judge({
            role: role,
            specialization: specialization,
            registeredAt: uint48(block.timestamp),
            active: true
        });

        judgeByWallet[wallet] = judgeId;

        emit JudgeRegistered(judgeId, wallet, role, specialization);
    }

    function deactivateJudge(uint256 judgeId) external onlyOwner {
        if (judges[judgeId].registeredAt == 0) revert JudgeNotFound(judgeId);
        judges[judgeId].active = false;
        emit JudgeDeactivated(judgeId);
    }

    function activateJudge(uint256 judgeId) external onlyOwner {
        if (judges[judgeId].registeredAt == 0) revert JudgeNotFound(judgeId);
        judges[judgeId].active = true;
        emit JudgeActivated(judgeId);
    }

    function isActiveJudge(uint256 judgeId) external view returns (bool) {
        return judges[judgeId].active;
    }

    function totalJudges() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    // --- Soulbound overrides ---

    function transferFrom(address, address, uint256) public pure override {
        revert SoulboundTransfer();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert SoulboundTransfer();
    }

    function approve(address, uint256) public pure override {
        revert SoulboundTransfer();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert SoulboundTransfer();
    }
}
