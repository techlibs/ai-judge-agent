Feature: Proposal submission
  As a user I want to submit a grant proposal

  Scenario: View submission form
    Given I am on the new proposal page
    Then I should see the "Submit a Proposal" heading
    And I should see fields for title, description, team, budget, and links

  Scenario: Title too short
    Given I am on the new proposal page
    When I fill in title with "ab"
    And I submit the form
    Then I should see a validation error about 5 characters

  Scenario: Description too short
    Given I am on the new proposal page
    When I fill in description with "Too short"
    And I submit the form
    Then I should see a validation error about 50 characters

  Scenario: Team info too short
    Given I am on the new proposal page
    When I fill in team info with "Short"
    And I submit the form
    Then I should see a validation error about 10 characters

  Scenario: Budget exceeds maximum
    Given I am on the new proposal page
    When I fill in budget with "2000000"
    And I submit the form
    Then I should see a validation error about budget limit
