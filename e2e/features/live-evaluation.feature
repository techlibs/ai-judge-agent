@skip @needs-fixtures
Feature: Live AI Judge Evaluation
  As a grant applicant
  I want to watch 4 AI judges evaluate my proposal in real-time
  So that I can see transparent, live scoring as it happens

  Background:
    Given a pending proposal "Solar Grid Project" exists
    And the ANTHROPIC_API_KEY is configured

  # --- Evaluation Trigger ---

  Scenario: Trigger evaluation from evaluate page
    When I navigate to "/grants/{id}/evaluate"
    Then the page should POST to "/api/evaluate/{id}" automatically
    And I should see 4 judge cards in "pending" state:
      | judge                |
      | Technical Feasibility|
      | Impact Potential     |
      | Cost Efficiency      |
      | Team Capability      |

  Scenario: Prevent double evaluation trigger
    Given the proposal is already in "evaluating" status
    When I navigate to "/grants/{id}/evaluate"
    Then the page should not trigger a new evaluation
    And I should see the current evaluation progress

  # --- Streaming Progress ---

  Scenario: Judge cards update as evaluations stream
    When I navigate to "/grants/{id}/evaluate"
    And the evaluation is triggered
    Then each judge card should transition from "pending" to "streaming"
    And as each judge completes, its card should show:
      | field          | displayed |
      | Score          | yes       |
      | Recommendation | yes       |
      | Justification  | yes       |
      | Key Findings   | yes       |
      | Risks          | yes       |

  Scenario: Live aggregate score updates as judges complete
    When I navigate to "/grants/{id}/evaluate"
    And the "tech" judge completes with score 8000
    Then the aggregate score should update to reflect the partial result
    When the "impact" judge completes with score 7500
    Then the aggregate score should update again
    When the "cost" judge completes with score 6000
    Then the aggregate score should update again
    When the "team" judge completes with score 8500
    Then the aggregate score should show the final weighted value

  # --- All Judges Complete ---

  Scenario: Finalize evaluation when all 4 judges complete
    When all 4 judges have completed their evaluations
    Then the system should POST to "/api/evaluate/{id}/finalize"
    And the aggregate score should be computed with weights:
      | dimension | weight |
      | tech      | 25%    |
      | impact    | 30%    |
      | cost      | 20%    |
      | team      | 25%    |
    And the results should be published on-chain
    And I should be redirected to "/grants/{id}" after 3 seconds

  # --- Failure & Retry ---

  Scenario: Judge evaluation fails after retries
    When the "tech" judge fails after 2 retry attempts
    Then the "tech" judge card should show "failed" status
    And I should see a retry button for the "tech" judge
    And the other 3 judges should continue independently

  Scenario: Retry a failed judge evaluation
    Given the "tech" judge has failed
    When I click the retry button for "tech"
    Then the system should POST to "/api/evaluate/{id}/tech/retry"
    And the "tech" judge card should reset to "pending"
    And a new evaluation attempt should start

  Scenario: Evaluation times out after 90 seconds
    When a judge evaluation exceeds 90 seconds
    Then that judge should be marked as "failed"
    And I should see a retry option

  # --- Edge Cases ---

  Scenario: Partial completion state
    Given 3 judges have completed and 1 has failed
    When I view the evaluation page
    Then I should see 3 completed judge cards with scores
    And I should see 1 failed judge card with retry option
    And finalization should not proceed until all 4 are complete

  Scenario: Navigate away and return during evaluation
    Given an evaluation is in progress
    When I navigate away from the evaluation page
    And I return to "/grants/{id}/evaluate"
    Then I should see the current state of all judge evaluations
    And completed judges should show their scores

  # --- Without API Key ---

  Scenario: Evaluation page without AI provider configured
    Given the ANTHROPIC_API_KEY is not configured
    When I navigate to "/grants/{id}/evaluate"
    Then I should see an error indicating AI evaluation is unavailable

  # --- Anomaly Detection ---

  Scenario: Flag suspiciously high scores
    When all 4 judges return scores >= 9500
    Then the system should log an anomaly flag
    But the evaluation should still proceed to finalization

  Scenario: Flag suspiciously low scores
    When all 4 judges return scores <= 500
    Then the system should log an anomaly flag
    But the evaluation should still proceed to finalization

  Scenario: Flag extreme score divergence
    When the highest judge score minus the lowest exceeds 5000
    Then the system should log an anomaly flag
    But the evaluation should still proceed to finalization
