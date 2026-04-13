Feature: Dispute Submission Workflow
  As a community member who disagrees with an evaluation
  I want to submit a dispute with evidence
  So that the evaluation can be reviewed and potentially overturned

  Background:
    Given the platform "test-platform" is registered with a valid API key
    And the IPFS gateway (Pinata) is reachable

  Scenario: Submit a valid dispute with evidence
    When I submit a dispute via the webhook with:
      | Field              | Value                                                                                       |
      | externalId         | dispute-e2e-1                                                                               |
      | platformSource     | test-platform                                                                               |
      | proposalExternalId | prop-evaluated-1-ext                                                                        |
      | disputeReason      | The evaluation failed to consider the team's 5-year track record in renewable energy...     |
      | evidence           | [{"type": "link", "content": "https://evidence.example.com", "description": "Team record"}] |
      | stakeAmount        | 1000000000000000000                                                                         |
    Then the response status should be 201
    And the response should contain a proposalId (bytes32 hex)
    And the response should contain an evidenceCid (IPFS CID)
    And the response should contain encodedTransaction (hex calldata)
    And the response should echo back the stakeAmount

  Scenario: Dispute evidence is pinned to IPFS
    When I submit a valid dispute
    Then the evidence content should be retrievable from IPFS using the evidenceCid
    And the IPFS content should include the disputeReason
    And the IPFS content should include the evidence items
    And the IPFS content should include a submittedAt timestamp

  Scenario: Dispute requires minimum 100-char reason
    When I submit a dispute with a reason shorter than 100 characters
    Then the response status should be 400
    And the error should be "VALIDATION_ERROR"

  Scenario: Dispute requires at least 1 evidence item
    When I submit a dispute with an empty evidence array
    Then the response status should be 400

  Scenario: Encoded transaction for on-chain submission
    When I submit a valid dispute
    Then the encodedTransaction should encode openDispute(proposalId, evidenceCid)
    And the caller must send the stakeAmount as msg.value when executing the transaction
