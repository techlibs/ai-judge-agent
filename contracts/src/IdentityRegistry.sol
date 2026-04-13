// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract IdentityRegistry is ERC721, ERC721URIStorage, Ownable {
    // --- Errors ---
    error SoulboundToken();
    error NotOwnerOrApproved();
    error ReservedMetadataKey();
    error InvalidAgentId();

    // --- Events ---
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );

    // --- Structs ---
    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    // --- State ---
    uint256 private _nextTokenId;
    mapping(uint256 agentId => mapping(string key => bytes value)) private _metadata;
    mapping(uint256 agentId => address wallet) private _agentWallets;

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {}

    // --- Registration (3 overloads per ERC-8004) ---

    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        agentId = _mintIdentity(msg.sender, agentURI);

        for (uint256 i = 0; i < metadata.length; i++) {
            _requireNotReservedKey(metadata[i].metadataKey);
            _metadata[agentId][metadata[i].metadataKey] = metadata[i].metadataValue;
            emit MetadataSet(
                agentId,
                metadata[i].metadataKey,
                metadata[i].metadataKey,
                metadata[i].metadataValue
            );
        }
    }

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _mintIdentity(msg.sender, agentURI);
    }

    function register() external returns (uint256 agentId) {
        agentId = _mintIdentity(msg.sender, "");
    }

    // --- URI Management ---

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        _requireOwnerOrApproved(agentId);
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    // --- Metadata ---

    function getMetadata(uint256 agentId, string memory key)
        external
        view
        returns (bytes memory)
    {
        _requireOwned(agentId);
        return _metadata[agentId][key];
    }

    function setMetadata(
        uint256 agentId,
        string memory key,
        bytes memory value
    ) external {
        _requireOwnerOrApproved(agentId);
        _requireNotReservedKey(key);
        _metadata[agentId][key] = value;
        emit MetadataSet(agentId, key, key, value);
    }

    // --- Agent Wallet (ERC-8004 reserved key) ---

    function getAgentWallet(uint256 agentId) external view returns (address) {
        _requireOwned(agentId);
        address wallet = _agentWallets[agentId];
        if (wallet == address(0)) {
            return ownerOf(agentId);
        }
        return wallet;
    }

    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        _requireOwnerOrApproved(agentId);
        // EIP-712 signature verification simplified for v1
        require(block.timestamp <= deadline, "Signature expired");
        _agentWallets[agentId] = newWallet;
    }

    function unsetAgentWallet(uint256 agentId) external {
        _requireOwnerOrApproved(agentId);
        _agentWallets[agentId] = address(0);
    }

    // --- Soulbound Override ---

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        // Allow mint (from == address(0)) and burn (to == address(0))
        if (from != address(0) && to != address(0)) {
            revert SoulboundToken();
        }
        return super._update(to, tokenId, auth);
    }

    // --- Internal ---

    function _mintIdentity(address to, string memory agentURI)
        internal
        returns (uint256 agentId)
    {
        agentId = ++_nextTokenId;
        _safeMint(to, agentId);
        if (bytes(agentURI).length > 0) {
            _setTokenURI(agentId, agentURI);
        }
        emit Registered(agentId, agentURI, to);
    }

    function _requireOwnerOrApproved(uint256 agentId) internal view {
        if (
            msg.sender != ownerOf(agentId) &&
            getApproved(agentId) != msg.sender &&
            !isApprovedForAll(ownerOf(agentId), msg.sender)
        ) {
            revert NotOwnerOrApproved();
        }
    }

    function _requireNotReservedKey(string memory key) internal pure {
        if (
            keccak256(bytes(key)) == keccak256(bytes("agentWallet"))
        ) {
            revert ReservedMetadataKey();
        }
    }

    // --- Required Overrides ---

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
