// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title TextStorage
/// @notice Gas-optimized library for emitting text as chunked events for on-chain indexability
/// @dev Splits large text into chunks and emits events. Does not write to storage.
library TextStorage {
    /// @notice Maximum bytes per chunk (16 KB)
    uint16 public constant MAX_CHUNK_SIZE = 16_384;

    /// @notice Emitted for each chunk of text stored
    event TextChunk(
        bytes32 indexed entityId,
        bytes32 indexed contextId,
        bytes32 textHash,
        uint16 chunkIndex,
        uint16 totalChunks,
        bytes chunk
    );

    /// @notice Emit text as chunked events, returning the keccak256 hash of the full content
    /// @param entityId The entity this text belongs to (e.g., proposalId)
    /// @param contextId Additional context identifier
    /// @param text The full text content to emit
    /// @return textHash The keccak256 hash of the full text
    function emitText(bytes32 entityId, bytes32 contextId, bytes calldata text) internal returns (bytes32 textHash) {
        textHash = keccak256(text);
        uint16 totalChunks = uint16((text.length + MAX_CHUNK_SIZE - 1) / MAX_CHUNK_SIZE);
        if (totalChunks == 0) totalChunks = 1;

        for (uint16 i = 0; i < totalChunks; i++) {
            uint256 start = uint256(i) * MAX_CHUNK_SIZE;
            uint256 end = start + MAX_CHUNK_SIZE;
            if (end > text.length) end = text.length;

            emit TextChunk(entityId, contextId, textHash, i, totalChunks, text[start:end]);
        }
    }
}
