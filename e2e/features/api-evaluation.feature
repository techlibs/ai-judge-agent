@skip @api
Feature: Evaluation API
  As the evaluation orchestrator
  I want to manage the multi-judge evaluation pipeline
  So that proposals are scored fairly and results are published on-chain

  # --- POST /api/evaluate/{id} (Trigger) ---

  Scenario: Trigger evaluation for a pending proposal
    Given a pending proposal exists with id "{id}"
    When I POST to "/api/evaluate/{id}"
    Then I should receive a 200 response with:
      | field   | value      |
      | status  | evaluating |
    And the response should include stream URLs for 4 dimensions:
      | dimension |
      | tech      |
      | impact    |
      | cost      |
      | team      |
    And the proposal status should be updated to "evaluating"

  Scenario: Reject double evaluation trigger
    Given a proposal in "evaluating" status exists
    When I POST to "/api/evaluate/{id}"
    Then I should receive a 409 conflict response

  Scenario: Reject evaluation for non-existent proposal
    When I POST to "/api/evaluate/non-existent-id"
    Then I should receive a 404 response

  Scenario: Rate limit evaluation triggers
    Given 10 evaluations have been triggered from my IP in the last hour
    When I POST to "/api/evaluate/{id}"
    Then I should receive a 429 response

  # --- GET /api/evaluate/{id}/{dimension} (Single Judge) ---

  Scenario Outline: Run judge evaluation for dimension
    Given a proposal in "evaluating" status exists
    When I GET "/api/evaluate/{id}/<dimension>"
    Then I should receive a streamed evaluation response
    And the response should conform to the JudgeEvaluation schema:
      | field          | type             | constraints      |
      | score          | integer          | 0-10000          |
      | scoreDecimals  | integer          | 2                |
      | confidence     | enum             | high,medium,low  |
      | recommendation | enum             | strong_fund,fund,conditional,reject |
      | justification  | string           | max 2000 chars   |
      | keyFindings    | array of strings | max 3 items      |
      | risks          | array of strings | max 3 items      |
    And the evaluation should include IPE alignment scores:
      | field            | type    | range |
      | proTechnology    | integer | 0-100 |
      | proFreedom       | integer | 0-100 |
      | proHumanProgress | integer | 0-100 |

    Examples:
      | dimension |
      | tech      |
      | impact    |
      | cost      |
      | team      |

  Scenario: Return cached result for completed evaluation
    Given the "tech" evaluation is already complete for proposal "{id}"
    When I GET "/api/evaluate/{id}/tech"
    Then I should receive the cached evaluation result
    And no new AI call should be made

  Scenario: Reject concurrent evaluation for same dimension
    Given the "tech" evaluation is currently streaming for proposal "{id}"
    When I GET "/api/evaluate/{id}/tech"
    Then I should receive a 409 conflict response

  Scenario: Handle AI provider timeout
    Given the AI provider takes longer than 90 seconds
    When I GET "/api/evaluate/{id}/tech"
    Then the evaluation should be marked as "failed" after timeout
    And the evaluation record should be updated with failed status

  Scenario: Retry failed evaluation with exponential backoff
    Given the AI provider fails on the first attempt
    When I GET "/api/evaluate/{id}/tech"
    Then the system should retry up to 2 times
    And the retry delays should be 2 seconds and 4 seconds
    And if all retries fail the evaluation should be marked "failed"

  # --- POST /api/evaluate/{id}/{dimension}/retry ---

  Scenario: Retry a failed dimension evaluation
    Given the "tech" evaluation has status "failed"
    When I POST to "/api/evaluate/{id}/tech/retry"
    Then I should receive a 200 response with:
      | field  | value |
      | status | ready |
    And the failed evaluation record should be deleted
    And a new evaluation can be triggered

  Scenario: Reject retry for non-failed evaluation
    Given the "tech" evaluation has status "complete"
    When I POST to "/api/evaluate/{id}/tech/retry"
    Then I should receive a 400 response

  # --- POST /api/evaluate/{id}/finalize ---

  Scenario: Finalize evaluation with all 4 judges complete
    Given all 4 judge evaluations are complete for proposal "{id}":
      | dimension | score |
      | tech      | 8000  |
      | impact    | 7500  |
      | cost      | 6000  |
      | team      | 8500  |
    When I POST to "/api/evaluate/{id}/finalize"
    Then I should receive a 200 response with:
      | field          | value     |
      | status         | published |
    And the aggregate score should be 7375
    And the weighted calculation should be:
      | dimension | score | weight | contribution |
      | tech      | 8000  | 0.25   | 2000         |
      | impact    | 7500  | 0.30   | 2250         |
      | cost      | 6000  | 0.20   | 1200         |
      | team      | 8500  | 0.25   | 2125         |
    And the aggregate data should be uploaded to IPFS
    And the results should be published on-chain
    And the proposal status should be "published"

  Scenario: Reject finalization with incomplete evaluations
    Given only 3 judge evaluations are complete
    When I POST to "/api/evaluate/{id}/finalize"
    Then I should receive a 400 response
    And the error should indicate which dimensions are incomplete

  Scenario: Idempotent finalization
    Given proposal "{id}" has already been finalized
    When I POST to "/api/evaluate/{id}/finalize" again
    Then I should receive the existing aggregate score
    And no duplicate on-chain transaction should be created

  # --- GET /api/evaluate/{id}/status ---

  Scenario: Poll evaluation status with all dimensions pending
    Given an evaluation was just triggered for proposal "{id}"
    When I GET "/api/evaluate/{id}/status"
    Then I should receive:
      | field          | value      |
      | status         | evaluating |
      | aggregateScore | null       |
      | chainTxHash    | null       |
    And all 4 dimensions should show status "pending"

  Scenario: Poll evaluation status with mixed progress
    Given 2 judges have completed and 2 are still streaming
    When I GET "/api/evaluate/{id}/status"
    Then the completed dimensions should include scores and recommendations
    And the streaming dimensions should show status "streaming"
    And the aggregate score should be null

  Scenario: Poll evaluation status after publication
    Given proposal "{id}" is fully published
    When I GET "/api/evaluate/{id}/status"
    Then I should receive:
      | field          | value     |
      | status         | published |
    And all 4 dimensions should show status "complete" with scores
    And the aggregate score should be present
    And the chain transaction hash should be present

  # --- On-Chain Publication ---

  Scenario: Handle on-chain publication failure
    Given all 4 evaluations are complete
    And the blockchain RPC is unavailable
    When I POST to "/api/evaluate/{id}/finalize"
    Then the proposal status should be set to "failed"
    And the aggregate score should still be computed and stored

  Scenario: Store per-dimension feedback transactions
    Given finalization succeeds with on-chain publication
    Then each evaluation record should have a feedbackTxHash
    And the proposal should have a chainTxHash for the aggregate
    And the proposal should have an agentId (chain token ID)
