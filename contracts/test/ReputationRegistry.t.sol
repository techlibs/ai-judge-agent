// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/IdentityRegistry.sol";
import "../src/ReputationRegistry.sol";

contract ReputationRegistryTest is Test {
    IdentityRegistry public identity;
    ReputationRegistry public reputation;
    address public deployer;
    address public user1;

    function setUp() public {
        deployer = address(this);
        user1 = makeAddr("user1");

        identity = new IdentityRegistry();
        reputation = new ReputationRegistry(address(identity));

        // Register a project for testing
        identity.register(user1, "ipfs://QmProject1");
    }

    function test_giveFeedback_storesAndEmits() public {
        vm.expectEmit(true, true, false, true);
        emit ReputationRegistry.FeedbackGiven(1, deployer, 85, "ipfs://QmEval1");
        reputation.giveFeedback(1, 85, "ipfs://QmEval1");

        (address evaluator, uint256 score, string memory contentHash, uint256 timestamp) =
            reputation.readFeedback(1, 0);
        assertEq(evaluator, deployer);
        assertEq(score, 85);
        assertEq(contentHash, "ipfs://QmEval1");
        assertGt(timestamp, 0);
    }

    function test_giveFeedback_revertsInvalidScore() public {
        vm.expectRevert(
            abi.encodeWithSelector(ReputationRegistry.InvalidScore.selector, 101)
        );
        reputation.giveFeedback(1, 101, "ipfs://QmBadScore");
    }

    function test_giveFeedback_allowsZeroScore() public {
        reputation.giveFeedback(1, 0, "ipfs://QmZero");
        (, uint256 score,,) = reputation.readFeedback(1, 0);
        assertEq(score, 0);
    }

    function test_giveFeedback_allowsMaxScore() public {
        reputation.giveFeedback(1, 100, "ipfs://QmPerfect");
        (, uint256 score,,) = reputation.readFeedback(1, 0);
        assertEq(score, 100);
    }

    function test_giveFeedback_revertsForUnregisteredProject() public {
        vm.expectRevert(
            abi.encodeWithSelector(ReputationRegistry.ProjectNotRegistered.selector, 999)
        );
        reputation.giveFeedback(999, 50, "ipfs://QmGhost");
    }

    function test_giveFeedback_revertsWithoutRole() public {
        vm.prank(user1);
        vm.expectRevert();
        reputation.giveFeedback(1, 50, "ipfs://QmNoRole");
    }

    function test_getSummary_noFeedback() public view {
        (uint256 count, uint256 avg) = reputation.getSummary(1);
        assertEq(count, 0);
        assertEq(avg, 0);
    }

    function test_getSummary_withMultipleFeedbacks() public {
        reputation.giveFeedback(1, 80, "ipfs://QmEval1");
        reputation.giveFeedback(1, 90, "ipfs://QmEval2");
        reputation.giveFeedback(1, 70, "ipfs://QmEval3");

        (uint256 count, uint256 avg) = reputation.getSummary(1);
        assertEq(count, 3);
        assertEq(avg, 80); // (80 + 90 + 70) / 3 = 80
    }

    function test_readFeedback_returnsCorrectEntry() public {
        reputation.giveFeedback(1, 60, "ipfs://QmFirst");
        reputation.giveFeedback(1, 90, "ipfs://QmSecond");

        (address evaluator, uint256 score, string memory contentHash,) =
            reputation.readFeedback(1, 1);
        assertEq(evaluator, deployer);
        assertEq(score, 90);
        assertEq(contentHash, "ipfs://QmSecond");
    }

    function test_readFeedback_revertsOutOfBounds() public {
        vm.expectRevert(
            abi.encodeWithSelector(ReputationRegistry.FeedbackIndexOutOfBounds.selector, 0, 0)
        );
        reputation.readFeedback(1, 0);
    }

    function test_getFeedbackCount() public {
        assertEq(reputation.getFeedbackCount(1), 0);

        reputation.giveFeedback(1, 75, "ipfs://QmEval1");
        assertEq(reputation.getFeedbackCount(1), 1);

        reputation.giveFeedback(1, 85, "ipfs://QmEval2");
        assertEq(reputation.getFeedbackCount(1), 2);
    }

    function test_constructor_revertsZeroAddress() public {
        vm.expectRevert(ReputationRegistry.InvalidIdentityRegistry.selector);
        new ReputationRegistry(address(0));
    }

    function test_pause_blocksFeedback() public {
        reputation.pause();
        vm.expectRevert();
        reputation.giveFeedback(1, 50, "ipfs://QmPaused");
    }
}
