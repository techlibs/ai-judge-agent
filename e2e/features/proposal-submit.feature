Feature: Proposal submission
  As a user I want to submit a grant proposal

  Scenario: View submission form
    Given I am on the new proposal page
    Then I should see the "Submit a Proposal" heading
    And I should see proposal form fields

  Scenario: Title too short
    Given I am on the new proposal page
    When I fill in title with "ab"
    And I submit the form
    Then I should see "Title must be at least 5 characters"

  Scenario: Description too short
    Given I am on the new proposal page
    When I fill in description with "Too short"
    And I submit the form
    Then I should see "Description must be at least 50 characters"

  Scenario: Team info too short
    Given I am on the new proposal page
    When I fill in team info with "Short"
    And I submit the form
    Then I should see "Team info must be at least 10 characters"

  Scenario: Budget must be positive
    Given I am on the new proposal page
    And I submit the form
    Then I should see "Budget must be positive"
