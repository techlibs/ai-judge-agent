Feature: Reputation history
  As a user I want to see on-chain reputation history

  Scenario: Reputation page renders
    Given I navigate to reputation for proposal "1"
    Then I should see a "Reputation" heading
