// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ProposalRegistry} from "../../src/core/ProposalRegistry.sol";

contract ProposalRegistryFuzzTest is Test {
    ProposalRegistry registry;
    address owner = makeAddr("owner");

    function setUp() public {
        vm.prank(owner);
        registry = new ProposalRegistry();
    }

    /// @notice Fuzz submission with random inputs; zero contentCid must revert
    function testFuzz_submitProposal_anyInputs(
        string calldata title,
        bytes32 contentCid,
        bytes32 repoUrlHash,
        bytes32 demoUrlHash,
        uint8 domainRaw
    ) public {
        // Bound domain to valid range 0-5
        domainRaw = uint8(bound(domainRaw, 0, 5));
        ProposalRegistry.ProposalDomain domain = ProposalRegistry.ProposalDomain(domainRaw);

        address proposer = makeAddr("fuzzProposer");
        vm.prank(proposer);

        if (contentCid == bytes32(0)) {
            vm.expectRevert(ProposalRegistry.InvalidContentCid.selector);
            registry.submitProposal(title, contentCid, repoUrlHash, demoUrlHash, domain);
        } else {
            bytes32 proposalId = registry.submitProposal(title, contentCid, repoUrlHash, demoUrlHash, domain);
            assertTrue(registry.proposalExists(proposalId));

            // Verify stored data matches inputs
            (
                address sub,
                uint48 ts,
                ProposalRegistry.ProposalStatus status,
                bytes32 cid,
                bytes32 repo,
                bytes32 demo,
                ProposalRegistry.ProposalDomain dom
            ) = registry.proposals(proposalId);
            assertEq(sub, proposer);
            assertGt(ts, 0);
            assertEq(cid, contentCid);
            assertEq(repo, repoUrlHash);
            assertEq(demo, demoUrlHash);
            assertEq(uint8(dom), domainRaw);
            assertEq(uint8(status), uint8(ProposalRegistry.ProposalStatus.Submitted));
        }
    }

    /// @notice Two different submitters with the same title in the same block produce different proposalIds
    function testFuzz_proposalId_uniqueness(
        address submitter1,
        address submitter2,
        string calldata title
    ) public {
        vm.assume(submitter1 != submitter2);
        vm.assume(submitter1 != address(0));
        vm.assume(submitter2 != address(0));

        bytes32 contentCid = bytes32(uint256(1));
        bytes32 urlHash = bytes32(uint256(2));
        ProposalRegistry.ProposalDomain domain = ProposalRegistry.ProposalDomain.DeFi;

        vm.prank(submitter1);
        bytes32 id1 = registry.submitProposal(title, contentCid, urlHash, urlHash, domain);

        vm.prank(submitter2);
        bytes32 id2 = registry.submitProposal(title, contentCid, urlHash, urlHash, domain);

        // Different submitters MUST produce different IDs
        assertTrue(id1 != id2);
    }

    /// @notice All invalid status transitions must revert
    function testFuzz_setStatus_invalidTransition(uint8 currentRaw, uint8 targetRaw) public {
        currentRaw = uint8(bound(currentRaw, 0, 3));
        targetRaw = uint8(bound(targetRaw, 0, 3));

        // Only valid transitions: Submitted->UnderReview, UnderReview->Evaluated, Evaluated->Disputed
        bool isValid = (currentRaw == 0 && targetRaw == 1)
            || (currentRaw == 1 && targetRaw == 2)
            || (currentRaw == 2 && targetRaw == 3);

        // Create a proposal to test status transitions on
        address proposer = makeAddr("statusProposer");
        vm.prank(proposer);
        bytes32 proposalId = registry.submitProposal(
            "status-test", bytes32(uint256(42)), bytes32(uint256(1)), bytes32(uint256(1)),
            ProposalRegistry.ProposalDomain.DeFi
        );

        // Advance proposal to the current status
        ProposalRegistry.ProposalStatus current = ProposalRegistry.ProposalStatus(currentRaw);
        _advanceToStatus(proposalId, current);

        // Attempt the transition
        ProposalRegistry.ProposalStatus target = ProposalRegistry.ProposalStatus(targetRaw);
        vm.prank(owner);
        if (isValid) {
            registry.setStatus(proposalId, target);
        } else {
            vm.expectRevert();
            registry.setStatus(proposalId, target);
        }
    }

    /// @notice Submission gas must stay below 200,000 (reasonable ceiling)
    function testFuzz_submitProposal_gasEfficiency(string calldata title, bytes32 contentCid) public {
        vm.assume(contentCid != bytes32(0));

        address proposer = makeAddr("gasProposer");
        vm.prank(proposer);

        uint256 gasBefore = gasleft();
        registry.submitProposal(
            title, contentCid, bytes32(uint256(1)), bytes32(uint256(2)),
            ProposalRegistry.ProposalDomain.DeFi
        );
        uint256 gasUsed = gasBefore - gasleft();

        assertLt(gasUsed, 200_000, "Gas usage exceeded 200k ceiling");
    }

    // --- Helpers ---

    function _advanceToStatus(bytes32 proposalId, ProposalRegistry.ProposalStatus target) internal {
        // Walk through valid transitions to reach target status
        if (uint8(target) >= 1) {
            vm.prank(owner);
            registry.setStatus(proposalId, ProposalRegistry.ProposalStatus.UnderReview);
        }
        if (uint8(target) >= 2) {
            vm.prank(owner);
            registry.setStatus(proposalId, ProposalRegistry.ProposalStatus.Evaluated);
        }
        if (uint8(target) >= 3) {
            vm.prank(owner);
            registry.setStatus(proposalId, ProposalRegistry.ProposalStatus.Disputed);
        }
    }
}
