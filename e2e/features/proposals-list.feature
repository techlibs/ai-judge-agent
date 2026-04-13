Feature: Proposals listing
  As a user I want to see all grant proposals

  Scenario: View proposals page
    Given I am on the proposals page
    Then I should see the "All Proposals" heading

  Scenario: Proposals page shows content
    Given I am on the proposals page
    Then I should see the "All Proposals" heading
    And I should see a "Submit Proposal" link
