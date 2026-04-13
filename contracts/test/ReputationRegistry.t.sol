// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";

contract ReputationRegistryTest is Test {
    IdentityRegistry public identity;
    ReputationRegistry public reputation;
    address public deployer = makeAddr("deployer");
    address public alice = makeAddr("alice");
    address public judge = makeAddr("judge");

    uint256 public agentId;

    function setUp() public {
        vm.startPrank(deployer);
        identity = new IdentityRegistry("IPE Identity", "IPEID");
        reputation = new ReputationRegistry();
        reputation.initialize(address(identity));
        vm.stopPrank();

        vm.prank(alice);
        agentId = identity.register("ipfs://proposal.json");
    }

    // --- Initialization ---

    function test_getIdentityRegistry() public view {
        assertEq(reputation.getIdentityRegistry(), address(identity));
    }

    function test_initialize_revertsIfAlreadyInitialized() public {
        vm.expectRevert(ReputationRegistry.AlreadyInitialized.selector);
        reputation.initialize(address(identity));
    }

    // --- giveFeedback ---

    function test_giveFeedback_storesFeedback() public {
        vm.prank(judge);
        reputation.giveFeedback(
            agentId,
            8700,
            2,
            "tech",
            "judge-v1",
            "",
            "ipfs://eval-tech.json",
            keccak256("eval-tech-content")
        );

        (int128 value, uint8 decimals, string memory tag1, string memory tag2, bool isRevoked) =
            reputation.readFeedback(agentId, judge, 1);

        assertEq(value, 8700);
        assertEq(decimals, 2);
        assertEq(tag1, "tech");
        assertEq(tag2, "judge-v1");
        assertFalse(isRevoked);
    }

    function test_giveFeedback_emitsEvent() public {
        vm.prank(judge);
        vm.expectEmit(true, true, false, true);
        emit ReputationRegistry.NewFeedback(
            agentId,
            judge,
            1,
            8700,
            2,
            "tech",
            "tech",
            "judge-v1",
            "",
            "ipfs://eval-tech.json",
            keccak256("eval-tech-content")
        );
        reputation.giveFeedback(
            agentId, 8700, 2, "tech", "judge-v1", "", "ipfs://eval-tech.json", keccak256("eval-tech-content")
        );
    }

    function test_giveFeedback_incrementsIndex() public {
        vm.startPrank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));
        reputation.giveFeedback(agentId, 9200, 2, "impact", "judge-v1", "", "", bytes32(0));
        vm.stopPrank();

        assertEq(reputation.getLastIndex(agentId, judge), 2);
    }

    function test_giveFeedback_revertsForInvalidAgent() public {
        vm.prank(judge);
        vm.expectRevert(ReputationRegistry.InvalidAgentId.selector);
        reputation.giveFeedback(999, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));
    }

    function test_giveFeedback_revertsForSelfFeedback() public {
        vm.prank(alice); // alice owns agentId
        vm.expectRevert(ReputationRegistry.SelfFeedbackNotAllowed.selector);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));
    }

    function test_giveFeedback_revertsForInvalidDecimals() public {
        vm.prank(judge);
        vm.expectRevert(ReputationRegistry.InvalidValueDecimals.selector);
        reputation.giveFeedback(agentId, 8700, 19, "tech", "judge-v1", "", "", bytes32(0));
    }

    // --- revokeFeedback ---

    function test_revokeFeedback_marksFeedbackRevoked() public {
        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        vm.prank(judge);
        reputation.revokeFeedback(agentId, 1);

        (, , , , bool isRevoked) = reputation.readFeedback(agentId, judge, 1);
        assertTrue(isRevoked);
    }

    function test_revokeFeedback_emitsEvent() public {
        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        vm.prank(judge);
        vm.expectEmit(true, true, true, false);
        emit ReputationRegistry.FeedbackRevoked(agentId, judge, 1);
        reputation.revokeFeedback(agentId, 1);
    }

    function test_revokeFeedback_revertsForNonSubmitter() public {
        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        vm.prank(alice);
        vm.expectRevert(ReputationRegistry.NotFeedbackSubmitter.selector);
        reputation.revokeFeedback(agentId, 1);
    }

    // --- getSummary ---

    function test_getSummary_computesAverage() public {
        address[] memory clients = new address[](1);
        clients[0] = judge;

        vm.startPrank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));
        reputation.giveFeedback(agentId, 9200, 2, "tech", "judge-v1", "", "", bytes32(0));
        vm.stopPrank();

        (uint64 count, int128 summaryValue, uint8 summaryDecimals) =
            reputation.getSummary(agentId, clients, "tech", "judge-v1");

        assertEq(count, 2);
        assertEq(summaryValue, 8950); // (8700 + 9200) / 2
        assertEq(summaryDecimals, 2);
    }

    function test_getSummary_excludesRevoked() public {
        address[] memory clients = new address[](1);
        clients[0] = judge;

        vm.startPrank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));
        reputation.giveFeedback(agentId, 5000, 2, "tech", "judge-v1", "", "", bytes32(0));
        reputation.revokeFeedback(agentId, 2);
        vm.stopPrank();

        (uint64 count, int128 summaryValue,) =
            reputation.getSummary(agentId, clients, "tech", "judge-v1");

        assertEq(count, 1);
        assertEq(summaryValue, 8700);
    }

    function test_getSummary_revertsForEmptyClients() public {
        address[] memory clients = new address[](0);

        vm.expectRevert(ReputationRegistry.ClientsRequired.selector);
        reputation.getSummary(agentId, clients, "tech", "judge-v1");
    }

    // --- getClients ---

    function test_getClients_returnsUniqueClients() public {
        address judge2 = makeAddr("judge2");

        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        vm.prank(judge2);
        reputation.giveFeedback(agentId, 9000, 2, "tech", "judge-v1", "", "", bytes32(0));

        address[] memory clients = reputation.getClients(agentId);
        assertEq(clients.length, 2);
    }

    // --- appendResponse ---

    function test_appendResponse_emitsEvent() public {
        vm.prank(judge);
        reputation.giveFeedback(agentId, 8700, 2, "tech", "judge-v1", "", "", bytes32(0));

        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit ReputationRegistry.ResponseAppended(
            agentId, judge, 1, alice, "ipfs://response.json", keccak256("response-content")
        );
        reputation.appendResponse(agentId, judge, 1, "ipfs://response.json", keccak256("response-content"));
    }
}
