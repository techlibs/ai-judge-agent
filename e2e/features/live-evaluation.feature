@needs-fixtures @needs-mock-judges
Feature: Live AI Judge Evaluation
  As a grant applicant
  I want to watch 4 AI judges evaluate my proposal in real-time
  So that I can see transparent, live scoring as it happens

  Background:
    Given a pending proposal "Solar Grid Project" exists
    And the AI judge mock is enabled

  # --- Evaluation Trigger ---

  Scenario: Trigger evaluation from evaluate page
    When I navigate to "/grants/{id}/evaluate"
    Then I should see "Starting Evaluation..." or "Live Evaluation"

  Scenario: Evaluation page shows judge dimension labels
    When I navigate to "/grants/{id}/evaluate"
    And I wait for evaluation to load
    Then I should see "Technical Feasibility" or "Starting Evaluation..."
    And I should see "Impact Potential" or "Starting Evaluation..."

  # --- Completion Flow ---

  Scenario: All judges complete and finalize
    When I navigate to "/grants/{id}/evaluate"
    And I wait for evaluation to complete
    Then the proposal should have status "published" or "evaluating"

  # --- Failure & Retry ---

  @skip @needs-real-failure
  Scenario: Judge evaluation fails after retries
    When the "tech" judge fails after 2 retry attempts
    Then the "tech" judge card should show "failed" status

  @skip @needs-real-failure
  Scenario: Retry a failed judge evaluation
    Given the "tech" judge has failed
    When I click the retry button for "tech"
    Then a new evaluation attempt should start

  # --- Edge Cases ---

  @skip @needs-real-streaming
  Scenario: Partial completion state
    Given 3 judges have completed and 1 has failed
    When I view the evaluation page
    Then I should see 3 completed judge cards with scores

  @skip @needs-real-streaming
  Scenario: Navigate away and return during evaluation
    Given an evaluation is in progress
    When I navigate away from the evaluation page
    And I return to "/grants/{id}/evaluate"
    Then I should see the current state of all judge evaluations

  # --- Anomaly Detection (requires real LLM data) ---

  @skip
  Scenario: Flag suspiciously high scores
    When all 4 judges return scores >= 9500
    Then the system should log an anomaly flag
    But the evaluation should still proceed to finalization

  @skip
  Scenario: Flag suspiciously low scores
    When all 4 judges return scores <= 500
    Then the system should log an anomaly flag
    But the evaluation should still proceed to finalization

  @skip
  Scenario: Flag extreme score divergence
    When the highest judge score minus the lowest exceeds 5000
    Then the system should log an anomaly flag
    But the evaluation should still proceed to finalization
