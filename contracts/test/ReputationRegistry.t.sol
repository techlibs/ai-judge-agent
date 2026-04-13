// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ReputationRegistry} from "../src/ReputationRegistry.sol";
import {IdentityRegistry} from "../src/IdentityRegistry.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract ReputationRegistryTest is Test {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    ReputationRegistry public registry;
    IdentityRegistry public identityReg;
    address public admin;
    address public evaluator;
    address public unauthorized;

    uint256 public agentId;

    function setUp() public {
        admin = address(this);
        evaluator = makeAddr("evaluator");
        unauthorized = makeAddr("unauthorized");

        identityReg = new IdentityRegistry();
        registry = new ReputationRegistry(address(identityReg));
        registry.grantRole(registry.EVALUATOR_ROLE(), evaluator);

        // Register an agent
        agentId = identityReg.register("ipfs://agent-uri");
    }

    function test_giveFeedback_success() public {
        vm.prank(evaluator);
        registry.giveFeedback(
            agentId,
            850,
            "technical_feasibility",
            "round-1",
            "ipfs://feedback",
            keccak256("feedback-content")
        );

        ReputationRegistry.FeedbackSummary memory summary = registry.getSummary(agentId);
        assertEq(summary.totalFeedback, 1);
        assertEq(summary.activeFeedback, 1);
        assertGt(summary.averageValueBps, 0);
    }

    function test_giveFeedback_emitsEvent() public {
        vm.prank(evaluator);
        vm.expectEmit(true, true, false, true);
        emit ReputationRegistry.NewFeedback(
            agentId,
            evaluator,
            0,
            850,
            "technical_feasibility",
            "round-1",
            "ipfs://feedback",
            keccak256("feedback-content")
        );

        registry.giveFeedback(
            agentId,
            850,
            "technical_feasibility",
            "round-1",
            "ipfs://feedback",
            keccak256("feedback-content")
        );
    }

    function test_giveFeedback_revertsUnauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        registry.giveFeedback(
            agentId,
            850,
            "tag1",
            "tag2",
            "ipfs://feedback",
            keccak256("content")
        );
    }

    function test_giveFeedback_revertsWhenPaused() public {
        registry.pause();

        vm.prank(evaluator);
        vm.expectRevert();
        registry.giveFeedback(
            agentId,
            850,
            "tag1",
            "tag2",
            "ipfs://feedback",
            keccak256("content")
        );
    }

    function test_giveFeedback_revertsDuplicateSybil() public {
        vm.prank(evaluator);
        registry.giveFeedback(
            agentId,
            850,
            "technical_feasibility",
            "round-1",
            "ipfs://feedback",
            keccak256("content")
        );

        vm.prank(evaluator);
        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationRegistry.DuplicateFeedback.selector,
                agentId,
                evaluator,
                "technical_feasibility"
            )
        );
        registry.giveFeedback(
            agentId,
            900,
            "technical_feasibility",
            "round-2",
            "ipfs://feedback2",
            keccak256("content2")
        );
    }

    function test_giveFeedback_allowsDifferentTags() public {
        vm.prank(evaluator);
        registry.giveFeedback(
            agentId, 850, "technical_feasibility", "round-1", "ipfs://fb1", keccak256("c1")
        );

        vm.prank(evaluator);
        registry.giveFeedback(
            agentId, 900, "impact_potential", "round-1", "ipfs://fb2", keccak256("c2")
        );

        assertEq(registry.getFeedbackCount(agentId), 2);
    }

    function test_giveFeedback_revertsTagTooLong() public {
        // 67 chars exceeds MAX_TAG_LENGTH of 64
        string memory longTag = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

        vm.prank(evaluator);
        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationRegistry.TagTooLong.selector,
                67
            )
        );
        registry.giveFeedback(
            agentId,
            850,
            longTag,
            "tag2",
            "ipfs://feedback",
            keccak256("content")
        );
    }

    function test_revokeFeedback_success() public {
        vm.prank(evaluator);
        registry.giveFeedback(
            agentId, 850, "tag1", "tag2", "ipfs://fb", keccak256("c")
        );

        vm.prank(evaluator);
        registry.revokeFeedback(agentId, 0);

        ReputationRegistry.FeedbackSummary memory summary = registry.getSummary(agentId);
        assertEq(summary.totalFeedback, 1);
        assertEq(summary.activeFeedback, 0);
    }

    function test_revokeFeedback_revertsNotAuthor() public {
        vm.prank(evaluator);
        registry.giveFeedback(
            agentId, 850, "tag1", "tag2", "ipfs://fb", keccak256("c")
        );

        vm.prank(unauthorized);
        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationRegistry.NotFeedbackAuthor.selector,
                agentId,
                0
            )
        );
        registry.revokeFeedback(agentId, 0);
    }

    function test_revokeFeedback_revertsAlreadyRevoked() public {
        vm.prank(evaluator);
        registry.giveFeedback(
            agentId, 850, "tag1", "tag2", "ipfs://fb", keccak256("c")
        );

        vm.prank(evaluator);
        registry.revokeFeedback(agentId, 0);

        vm.prank(evaluator);
        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationRegistry.FeedbackAlreadyRevoked.selector,
                agentId,
                0
            )
        );
        registry.revokeFeedback(agentId, 0);
    }

    function test_readAllFeedback_pagination() public {
        vm.startPrank(evaluator);
        registry.giveFeedback(agentId, 850, "t1", "r1", "ipfs://1", keccak256("1"));
        registry.giveFeedback(agentId, 900, "t2", "r1", "ipfs://2", keccak256("2"));
        registry.giveFeedback(agentId, 750, "t3", "r1", "ipfs://3", keccak256("3"));
        vm.stopPrank();

        ReputationRegistry.Feedback[] memory page1 = registry.readAllFeedback(agentId, 0, 2);
        assertEq(page1.length, 2);
        assertEq(page1[0].value, 850);
        assertEq(page1[1].value, 900);

        ReputationRegistry.Feedback[] memory page2 = registry.readAllFeedback(agentId, 2, 2);
        assertEq(page2.length, 1);
        assertEq(page2[0].value, 750);
    }

    function test_readAllFeedback_revertsPaginationLimit() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationRegistry.PaginationLimitExceeded.selector,
                101
            )
        );
        registry.readAllFeedback(agentId, 0, 101);
    }

    function test_getSummary_averageBps() public {
        vm.startPrank(evaluator);
        registry.giveFeedback(agentId, 800, "t1", "r1", "ipfs://1", keccak256("1"));
        registry.giveFeedback(agentId, 600, "t2", "r1", "ipfs://2", keccak256("2"));
        vm.stopPrank();

        ReputationRegistry.FeedbackSummary memory summary = registry.getSummary(agentId);
        // Average = (800 + 600) / 2 = 700
        // In basis points = 700 * 10000 / 2 = 3500000 ... wait
        // Actually: (800 + 600) * 10000 / 2 = 7000000
        assertEq(summary.averageValueBps, 7000000);
    }

    function test_constants() public view {
        assertEq(registry.VALUE_DECIMALS(), 2);
        assertEq(registry.MAX_FEEDBACK_PER_AGENT(), 10000);
        assertEq(registry.MAX_PAGINATION_LIMIT(), 100);
    }

    function test_pauseUnpause() public {
        registry.pause();
        assertTrue(registry.paused());

        registry.unpause();
        assertFalse(registry.paused());
    }

    function testFuzz_giveFeedback_validValue(uint256 value) public {
        value = bound(value, 0, 1000);

        vm.prank(evaluator);
        registry.giveFeedback(
            agentId,
            value,
            "tag1",
            "tag2",
            "ipfs://feedback",
            keccak256(abi.encodePacked(value))
        );

        ReputationRegistry.FeedbackSummary memory summary = registry.getSummary(agentId);
        assertEq(summary.activeFeedback, 1);
    }
}
