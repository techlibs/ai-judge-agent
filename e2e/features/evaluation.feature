Feature: AI evaluation
  As a user I want to evaluate proposals using AI judges

  Scenario: Evaluation idle state
    Given I navigate to evaluation for proposal "1"
    Then I should see the "Proposal Evaluation" heading
    And I should see a "Back to Proposal" link
