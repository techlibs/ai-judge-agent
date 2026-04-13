Feature: Proposal detail
  As a user I want to view proposal details

  Scenario: Proposal not found
    Given I navigate to proposal "999999"
    Then I should see "Proposal not found"

  Scenario: Proposal found with metadata
    Given I navigate to proposal "1"
    When the proposal exists
    Then I should see proposal details
    And I should see a "Back to proposals" link
