Feature: On-Chain Contract Verification
  As a system built on Base Sepolia
  I want to verify deployed contracts are accessible and functional
  So that evaluations can be published on-chain with full transparency

  Background:
    Given 6 contracts are deployed on Base Sepolia (chain ID 84532)
    And the RPC endpoint is reachable at https://sepolia.base.org

  Scenario: All contract addresses are valid
    Then the EvaluationRegistry contract should be deployed at the configured address
    And the IdentityRegistry contract should be deployed at the configured address
    And the MilestoneManager contract should be deployed at the configured address
    And the ReputationRegistry contract should be deployed at the configured address
    And the ValidationRegistry contract should be deployed at the configured address
    And the DisputeRegistry contract should be deployed at the configured address

  Scenario: Read evaluation from EvaluationRegistry
    Given an evaluation has been submitted on-chain
    When I call getEvaluation(proposalId)
    Then it should return a tuple with proposalId, fundingRoundId, scores, and CIDs

  Scenario: Query EvaluationSubmitted events
    When I query EvaluationSubmitted events from the deployment block
    Then I should receive an array of log entries
    And each entry should have proposalId, fundingRoundId, finalScore, adjustedScore

  Scenario: Proposal ID is deterministic
    Given platformSource "test-platform" and externalId "test-123"
    When I compute the proposalId via keccak256
    Then it should always produce the same bytes32 hash
    And the hash should equal keccak256(toHex("test-platform:test-123"))

  Scenario: Score scaling for chain precision
    Given a finalScore of 8.5 and reputationMultiplier of 1.005
    Then scaleScoreToChain(8.5) should equal 850
    And scaleReputationToChain(1.005) should equal 10050
    And scaleScoreToChain(adjustedScore) should preserve 2 decimal precision
