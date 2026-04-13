Feature: Proposals listing
  As a user I want to see all grant proposals

  Scenario: View proposals page
    Given I am on the proposals page
    Then I should see the "All Proposals" heading

  Scenario: Empty proposals state
    Given I am on the proposals page
    When no proposals exist
    Then I should see "No proposals yet" message
    And I should see a link to submit the first proposal

  Scenario: Proposals with data
    Given I am on the proposals page
    When proposals exist
    Then I should see proposal cards
