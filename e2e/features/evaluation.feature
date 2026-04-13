Feature: AI evaluation
  As a user I want to evaluate proposals using AI judges

  Scenario: Evaluation idle state
    Given I navigate to evaluation for proposal "1"
    Then I should see "Ready for evaluation"
    And I should see a "Start Evaluation" button
    And I should see a "Back to Proposal" link
