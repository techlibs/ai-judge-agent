Feature: AI Evaluation Pipeline
  As a grant platform operator
  I want proposals to be automatically evaluated by AI judges
  So that funding decisions are transparent, scored, and reproducible

  Background:
    Given the platform "test-platform" is registered with a valid API key
    And the OpenAI API is reachable
    And the IPFS gateway (Pinata) is reachable

  Scenario: Full evaluation pipeline for a valid proposal
    When I submit a valid proposal via the webhook
    Then the response status should be 201
    And the response should contain a proposalId (bytes32 hex)
    And the response should contain a proposalContentCid (IPFS CID)
    And the proposal content should be retrievable from IPFS
    And the IPFS content should match the submitted proposal data

  Scenario: AI scores all four dimensions
    When I submit a proposal and wait for evaluation to complete
    Then the evaluation should contain exactly 4 dimension scores
    And each dimension score should be between 0 and 10
    And the dimensions should be: technical_feasibility, impact_potential, cost_efficiency, team_capability
    And each dimension should have a reasoning chain of at least 50 characters
    And each dimension should list which input data was considered
    And each dimension should reference rubric criteria applied

  Scenario: Weighted score calculation
    Given dimension scores are returned from the AI judges
    Then the final score should equal the weighted sum:
      | Dimension              | Weight |
      | technical_feasibility  | 0.25   |
      | impact_potential       | 0.30   |
      | cost_efficiency        | 0.20   |
      | team_capability        | 0.25   |
    And the reputation multiplier should be between 1.0 and 1.05
    And the adjusted score should equal finalScore * reputationMultiplier

  Scenario: Evaluation content pinned to IPFS
    When the evaluation completes
    Then both proposalContentCid and evaluationContentCid should be valid IPFS CIDs
    And the evaluation content should be retrievable from IPFS
    And the evaluation content should conform to the EvaluationContent schema

  Scenario: Chain-ready encoded data
    When the evaluation completes
    Then the response should include encoded submitScore calldata
    And the calldata should encode: proposalId, fundingRoundId, finalScore, reputationMultiplier, proposalContentCid, evaluationContentCid
    And scores should be scaled by 100 for chain precision (e.g. 8.5 → 850)
    And reputation should be scaled by 10000 for chain precision (e.g. 1.005 → 10050)
