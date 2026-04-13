// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title IdentityRegistry
/// @notice ERC-8004 identity registry for project registration. Soulbound (non-transferable).
contract IdentityRegistry is ERC721, AccessControl, Pausable {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 private constant MAX_URI_LENGTH = 256;

    uint256 private _tokenCount;
    mapping(uint256 => string) private _agentURIs;

    event ProjectRegistered(uint256 indexed tokenId, address indexed owner, string agentURI);
    event AgentURIUpdated(uint256 indexed tokenId, string agentURI);

    error MaxSupplyReached();
    error URITooLong(uint256 length);
    error NotTokenOwner(address caller, uint256 tokenId);
    error SoulboundTransferBlocked();

    constructor() ERC721("IPE City Projects", "IPEP") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REGISTRAR_ROLE, msg.sender);
    }

    /// @notice Register a new project identity
    /// @param owner The address that will own the project token
    /// @param agentURI IPFS CID for project metadata
    /// @return tokenId The newly minted token ID
    function register(address owner, string calldata agentURI)
        external
        onlyRole(REGISTRAR_ROLE)
        whenNotPaused
        returns (uint256 tokenId)
    {
        if (_tokenCount >= MAX_SUPPLY) revert MaxSupplyReached();
        if (bytes(agentURI).length > MAX_URI_LENGTH) revert URITooLong(bytes(agentURI).length);

        _tokenCount++;
        tokenId = _tokenCount;
        _safeMint(owner, tokenId);
        _agentURIs[tokenId] = agentURI;

        emit ProjectRegistered(tokenId, owner, agentURI);
    }

    /// @notice Update the agent URI for a project (owner only)
    /// @param tokenId The token to update
    /// @param agentURI New IPFS CID
    function setAgentURI(uint256 tokenId, string calldata agentURI) external whenNotPaused {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner(msg.sender, tokenId);
        if (bytes(agentURI).length > MAX_URI_LENGTH) revert URITooLong(bytes(agentURI).length);

        _agentURIs[tokenId] = agentURI;
        emit AgentURIUpdated(tokenId, agentURI);
    }

    /// @notice Get project metadata
    /// @param tokenId The token to query
    /// @return owner The token owner address
    /// @return agentURI The IPFS CID for project metadata
    function getMetadata(uint256 tokenId) external view returns (address owner, string memory agentURI) {
        owner = ownerOf(tokenId);
        agentURI = _agentURIs[tokenId];
    }

    /// @notice Returns the agent URI as the token URI
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId); // reverts if token doesn't exist
        return _agentURIs[tokenId];
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Soulbound: block transfers between non-zero addresses
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert SoulboundTransferBlocked();
        return super._update(to, tokenId, auth);
    }

    /// @notice Required override for AccessControl + ERC721
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
