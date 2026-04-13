Feature: IPFS Content Storage
  As a system that values transparency and immutability
  I want all proposal and evaluation content pinned to IPFS
  So that anyone can verify the evaluation was conducted fairly

  Background:
    Given Pinata IPFS credentials are configured (PINATA_JWT, PINATA_GATEWAY)

  Scenario: Pin proposal content to IPFS
    When I submit a valid proposal via the webhook
    Then the proposal content should be pinned to IPFS via Pinata
    And the returned CID should start with "bafy" (CIDv1)
    And fetching the CID from the gateway should return valid JSON
    And the JSON should match the ProposalContent schema

  Scenario: Pin evaluation content to IPFS
    When evaluation completes for a proposal
    Then the evaluation content should be pinned to IPFS
    And the evaluation CID should be different from the proposal CID
    And fetching the evaluation CID should return the 4 dimension scores
    And the evaluation JSON should match the EvaluationContent schema

  Scenario: Pin dispute evidence to IPFS
    When a dispute is submitted via the webhook with valid evidence
    Then the dispute evidence should be pinned to IPFS
    And the returned evidenceCid should be a valid CID
    And fetching the evidence CID should return the dispute reason and evidence items

  Scenario: Content is canonical JSON
    When content is pinned to IPFS
    Then the JSON keys should be sorted alphabetically
    And pinning the same content twice should produce the same CID (content-addressed)

  Scenario: IPFS fetch with timeout
    When fetching content from IPFS
    Then the fetch should timeout after 10 seconds if the gateway is unresponsive
    And a timeout should produce a clear error message
