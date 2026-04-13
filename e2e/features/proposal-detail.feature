Feature: Proposal detail
  As a user I want to view proposal details

  Scenario: Proposal shows content or error
    Given I navigate to proposal "1"
    Then I should see proposal content or error state

  Scenario: Proposal has back navigation
    Given I navigate to proposal "1"
    Then I should see a back to proposals link
