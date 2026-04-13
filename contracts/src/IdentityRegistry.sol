// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract IdentityRegistry is ERC721, AccessControl, Pausable {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    uint256 public constant MAX_SUPPLY = 1000;
    uint256 private constant MAX_URI_LENGTH = 256;
    uint256 private constant MAX_METADATA_KEY_LENGTH = 64;
    uint256 private constant MAX_METADATA_VALUE_LENGTH = 1024;

    uint256 private _tokenCount;

    mapping(uint256 => string) private _agentURIs;
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    struct MetadataEntry {
        string key;
        bytes value;
    }

    event Registered(
        uint256 indexed agentId,
        string agentURI,
        address indexed owner
    );

    event URIUpdated(
        uint256 indexed agentId,
        string newURI,
        address indexed updatedBy
    );

    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );

    error MaxSupplyReached();
    error URITooLong(uint256 length);
    error MetadataKeyTooLong(uint256 length);
    error MetadataValueTooLong(uint256 length);
    error NotOwnerOrApproved(uint256 agentId);
    error SoulboundTransferDisabled();

    constructor() ERC721("ARWF Agent Identity", "ARWF-ID") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadata
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused returns (uint256) {
        if (_tokenCount >= MAX_SUPPLY) {
            revert MaxSupplyReached();
        }
        if (bytes(agentURI).length > MAX_URI_LENGTH) {
            revert URITooLong(bytes(agentURI).length);
        }

        uint256 agentId = _tokenCount;
        _tokenCount++;

        _safeMint(msg.sender, agentId);
        _agentURIs[agentId] = agentURI;

        for (uint256 i = 0; i < metadata.length; i++) {
            _setMetadataUnchecked(agentId, metadata[i].key, metadata[i].value);
        }

        emit Registered(agentId, agentURI, msg.sender);
        return agentId;
    }

    function register(
        string calldata agentURI
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused returns (uint256) {
        if (_tokenCount >= MAX_SUPPLY) {
            revert MaxSupplyReached();
        }
        if (bytes(agentURI).length > MAX_URI_LENGTH) {
            revert URITooLong(bytes(agentURI).length);
        }

        uint256 agentId = _tokenCount;
        _tokenCount++;

        _safeMint(msg.sender, agentId);
        _agentURIs[agentId] = agentURI;

        emit Registered(agentId, agentURI, msg.sender);
        return agentId;
    }

    function register() external onlyRole(REGISTRAR_ROLE) whenNotPaused returns (uint256) {
        if (_tokenCount >= MAX_SUPPLY) {
            revert MaxSupplyReached();
        }

        uint256 agentId = _tokenCount;
        _tokenCount++;

        _safeMint(msg.sender, agentId);

        emit Registered(agentId, "", msg.sender);
        return agentId;
    }

    function setAgentURI(
        uint256 agentId,
        string calldata newURI
    ) external whenNotPaused {
        if (!_isApprovedOrOwner(msg.sender, agentId)) {
            revert NotOwnerOrApproved(agentId);
        }
        if (bytes(newURI).length > MAX_URI_LENGTH) {
            revert URITooLong(bytes(newURI).length);
        }

        _agentURIs[agentId] = newURI;
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    function getMetadata(
        uint256 agentId,
        string calldata metadataKey
    ) external view returns (bytes memory) {
        return _metadata[agentId][metadataKey];
    }

    function setMetadata(
        uint256 agentId,
        string calldata metadataKey,
        bytes calldata metadataValue
    ) external whenNotPaused {
        if (!_isApprovedOrOwner(msg.sender, agentId)) {
            revert NotOwnerOrApproved(agentId);
        }

        _setMetadataUnchecked(agentId, metadataKey, metadataValue);
    }

    function getAgentURI(uint256 agentId) external view returns (string memory) {
        return _agentURIs[agentId];
    }

    function totalSupply() external view returns (uint256) {
        return _tokenCount;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert SoulboundTransferDisabled();
        }
        return super._update(to, tokenId, auth);
    }

    function _isApprovedOrOwner(
        address spender,
        uint256 tokenId
    ) internal view returns (bool) {
        address tokenOwner = ownerOf(tokenId);
        return (spender == tokenOwner ||
            isApprovedForAll(tokenOwner, spender) ||
            getApproved(tokenId) == spender);
    }

    function _setMetadataUnchecked(
        uint256 agentId,
        string calldata metadataKey,
        bytes calldata metadataValue
    ) private {
        if (bytes(metadataKey).length > MAX_METADATA_KEY_LENGTH) {
            revert MetadataKeyTooLong(bytes(metadataKey).length);
        }
        if (metadataValue.length > MAX_METADATA_VALUE_LENGTH) {
            revert MetadataValueTooLong(metadataValue.length);
        }

        _metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }
}
