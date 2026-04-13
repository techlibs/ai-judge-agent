Feature: Duplicate Proposal Detection
  As a grant platform operator
  I want duplicate proposals to be rejected
  So that the same proposal is not evaluated twice

  Background:
    Given the platform "test-platform" is registered with a valid API key

  Scenario: Reject duplicate proposal by externalId + platformSource
    Given a proposal with externalId "dup-test-ext" has already been evaluated
    When I submit another proposal with externalId "dup-test-ext" from the same platform
    Then the response status should be 409
    And the error code should be "DUPLICATE_PROPOSAL"
    And the message should mention the externalId

  Scenario: Proposal ID is computed deterministically
    Given platformSource "test-platform" and externalId "dup-test-ext"
    Then computeProposalId should return keccak256(toHex("test-platform:dup-test-ext"))
    And submitting a proposal with those identifiers should match the existing job

  Scenario: Different externalId is not a duplicate
    Given a proposal with externalId "dup-test-ext" has already been evaluated
    When I submit a proposal with externalId "different-id" from the same platform
    Then the response should NOT be 409

  Scenario: Same externalId from different platform is not a duplicate
    Given a proposal with externalId "dup-test-ext" from "test-platform" exists
    When I submit a proposal with externalId "dup-test-ext" from "other-platform"
    Then the response should NOT be 409
    Because the proposalId hash includes the platformSource
