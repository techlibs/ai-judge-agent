Feature: Reputation history
  As a user I want to see on-chain reputation history

  Scenario: View reputation page
    Given I navigate to reputation for proposal "1"
    Then I should see one of: error state, empty state, or history list

  Scenario: Reputation heading visible
    Given I navigate to reputation for proposal "1"
    Then I should see a "Reputation" heading
