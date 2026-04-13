// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ValidationRegistry} from "../src/ValidationRegistry.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract ValidationRegistryTest is Test {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    ValidationRegistry public registry;
    IdentityRegistry public identityReg;
    address public admin;
    address public validator;
    address public requester;
    address public unauthorized;

    uint256 public agentId;

    function setUp() public {
        admin = address(this);
        validator = makeAddr("validator");
        requester = makeAddr("requester");
        unauthorized = makeAddr("unauthorized");

        identityReg = new IdentityRegistry();
        registry = new ValidationRegistry(address(identityReg));
        registry.grantRole(registry.VALIDATOR_ROLE(), validator);

        agentId = identityReg.register("ipfs://agent-uri");
    }

    function test_validationRequest_success() public {
        vm.prank(requester);
        uint256 requestId = registry.validationRequest(agentId, "ipfs://request");

        assertEq(requestId, 0);

        ValidationRegistry.ValidationRequest memory req = registry.getRequest(0);
        assertEq(req.requester, requester);
        assertEq(req.agentId, agentId);
        assertEq(req.requestURI, "ipfs://request");
        assertGt(req.createdAt, 0);
        assertFalse(req.responded);
    }

    function test_validationRequest_emitsEvent() public {
        vm.prank(requester);
        vm.expectEmit(true, true, true, true);
        emit ValidationRegistry.ValidationRequested(0, agentId, requester, "ipfs://request");

        registry.validationRequest(agentId, "ipfs://request");
    }

    function test_validationRequest_revertsWhenPaused() public {
        registry.pause();

        vm.prank(requester);
        vm.expectRevert();
        registry.validationRequest(agentId, "ipfs://request");
    }

    function test_validationResponse_success() public {
        vm.prank(requester);
        registry.validationRequest(agentId, "ipfs://request");

        vm.prank(validator);
        registry.validationResponse(
            0,
            85,
            "ipfs://response",
            keccak256("response-content"),
            "technical"
        );

        ValidationRegistry.ValidationRequest memory req = registry.getRequest(0);
        assertTrue(req.responded);

        ValidationRegistry.ValidationResponse memory resp = registry.getResponse(0);
        assertEq(resp.validator, validator);
        assertEq(resp.score, 85);
        assertEq(resp.responseURI, "ipfs://response");
        assertEq(resp.tag, "technical");
    }

    function test_validationResponse_emitsEvent() public {
        vm.prank(requester);
        registry.validationRequest(agentId, "ipfs://request");

        vm.prank(validator);
        vm.expectEmit(true, true, true, true);
        emit ValidationRegistry.ValidationResponded(
            0,
            agentId,
            validator,
            85,
            "ipfs://response",
            keccak256("response-content"),
            "technical"
        );

        registry.validationResponse(
            0,
            85,
            "ipfs://response",
            keccak256("response-content"),
            "technical"
        );
    }

    function test_validationResponse_revertsUnauthorized() public {
        vm.prank(requester);
        registry.validationRequest(agentId, "ipfs://request");

        vm.prank(unauthorized);
        vm.expectRevert();
        registry.validationResponse(
            0,
            85,
            "ipfs://response",
            keccak256("content"),
            "tag"
        );
    }

    function test_validationResponse_revertsAlreadyResponded() public {
        vm.prank(requester);
        registry.validationRequest(agentId, "ipfs://request");

        vm.prank(validator);
        registry.validationResponse(0, 85, "ipfs://r1", keccak256("c1"), "t1");

        vm.prank(validator);
        vm.expectRevert(
            abi.encodeWithSelector(
                ValidationRegistry.AlreadyResponded.selector,
                0
            )
        );
        registry.validationResponse(0, 90, "ipfs://r2", keccak256("c2"), "t2");
    }

    function test_validationResponse_revertsInvalidScore() public {
        vm.prank(requester);
        registry.validationRequest(agentId, "ipfs://request");

        vm.prank(validator);
        vm.expectRevert(
            abi.encodeWithSelector(
                ValidationRegistry.InvalidScore.selector,
                101
            )
        );
        registry.validationResponse(0, 101, "ipfs://r", keccak256("c"), "t");
    }

    function test_validationResponse_revertsTagTooLong() public {
        vm.prank(requester);
        registry.validationRequest(agentId, "ipfs://request");

        // 67 chars exceeds MAX_TAG_LENGTH of 64
        string memory longTag = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

        vm.prank(validator);
        vm.expectRevert(
            abi.encodeWithSelector(
                ValidationRegistry.TagTooLong.selector,
                67
            )
        );
        registry.validationResponse(0, 85, "ipfs://r", keccak256("c"), longTag);
    }

    function test_validationResponse_revertsDoesNotExist() public {
        vm.prank(validator);
        vm.expectRevert(
            abi.encodeWithSelector(
                ValidationRegistry.RequestDoesNotExist.selector,
                999
            )
        );
        registry.validationResponse(999, 85, "ipfs://r", keccak256("c"), "t");
    }

    function test_getSummary() public {
        vm.prank(requester);
        registry.validationRequest(agentId, "ipfs://r1");
        vm.prank(requester);
        registry.validationRequest(agentId, "ipfs://r2");

        vm.prank(validator);
        registry.validationResponse(0, 80, "ipfs://resp1", keccak256("c1"), "t1");

        ValidationRegistry.ValidationSummary memory summary = registry.getSummary(agentId);
        assertEq(summary.totalRequests, 2);
        assertEq(summary.respondedRequests, 1);
        // averageScoreBps = 80 * 10000 / 1 = 800000
        assertEq(summary.averageScoreBps, 800000);
    }

    function test_pauseUnpause() public {
        registry.pause();
        assertTrue(registry.paused());

        registry.unpause();
        assertFalse(registry.paused());
    }

    function test_requestCount_increments() public {
        assertEq(registry.getRequestCount(), 0);

        vm.prank(requester);
        registry.validationRequest(agentId, "ipfs://r1");
        assertEq(registry.getRequestCount(), 1);

        vm.prank(requester);
        registry.validationRequest(agentId, "ipfs://r2");
        assertEq(registry.getRequestCount(), 2);
    }

    function testFuzz_validationResponse_validScore(uint8 score) public {
        score = uint8(bound(score, 0, 100));

        vm.prank(requester);
        uint256 reqId = registry.validationRequest(agentId, "ipfs://request");

        vm.prank(validator);
        registry.validationResponse(
            reqId,
            score,
            "ipfs://response",
            keccak256(abi.encodePacked(score)),
            "tag"
        );

        ValidationRegistry.ValidationResponse memory resp = registry.getResponse(reqId);
        assertEq(resp.score, score);
    }
}
