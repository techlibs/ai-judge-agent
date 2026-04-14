// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/periphery/TextStorage.sol";

contract TextStorageHarness {
    function emitText(bytes32 entityId, bytes32 contextId, bytes calldata text) external returns (bytes32) {
        return TextStorage.emitText(entityId, contextId, text);
    }
}

contract TextStorageTest is Test {
    TextStorageHarness harness;
    bytes32 constant ENTITY_ID = keccak256("proposal-1");
    bytes32 constant CONTEXT_ID = keccak256("judge-security");

    function setUp() public {
        harness = new TextStorageHarness();
    }

    function test_emitText_shortText() public {
        bytes memory text = bytes("This is a short evaluation reasoning text for testing.");
        bytes32 expectedHash = keccak256(text);
        bytes32 resultHash = harness.emitText(ENTITY_ID, CONTEXT_ID, text);
        assertEq(resultHash, expectedHash);
    }

    function test_emitText_emitsCorrectEvent() public {
        bytes memory text = bytes("Short reasoning text.");
        bytes32 textHash = keccak256(text);
        vm.expectEmit(true, true, false, true);
        emit TextStorage.TextChunk(ENTITY_ID, CONTEXT_ID, textHash, 0, 1, text);
        harness.emitText(ENTITY_ID, CONTEXT_ID, text);
    }

    function test_emitText_emptyTextProducesOneChunk() public {
        vm.recordLogs();
        harness.emitText(ENTITY_ID, CONTEXT_ID, "");
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1);
    }

    function test_emitText_singleChunk() public {
        bytes memory text = new bytes(1000);
        for (uint256 i = 0; i < 1000; i++) {
            text[i] = bytes1(uint8(65 + (i % 26)));
        }
        vm.recordLogs();
        harness.emitText(ENTITY_ID, CONTEXT_ID, text);
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 1);
    }

    function test_emitText_multipleChunks() public {
        uint256 textSize = 32_769;
        bytes memory text = new bytes(textSize);
        for (uint256 i = 0; i < textSize; i++) {
            text[i] = bytes1(uint8(65 + (i % 26)));
        }
        vm.recordLogs();
        bytes32 resultHash = harness.emitText(ENTITY_ID, CONTEXT_ID, text);
        Vm.Log[] memory entries = vm.getRecordedLogs();
        assertEq(entries.length, 3, "32769 bytes should produce 3 chunks");
        assertEq(resultHash, keccak256(text));
    }

    function testFuzz_emitTextHashConsistency(bytes calldata text) public {
        vm.assume(text.length > 0);
        vm.assume(text.length < 50_000);
        bytes32 resultHash = harness.emitText(ENTITY_ID, CONTEXT_ID, text);
        assertEq(resultHash, keccak256(text));
    }
}
