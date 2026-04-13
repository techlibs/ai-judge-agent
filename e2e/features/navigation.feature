Feature: Cross-page navigation
  As a user I want to navigate between pages

  Scenario: Root redirects to proposals
    Given I am on the home page
    Then I should be redirected to the proposals page

  Scenario: Navigate to submit form
    Given I am on the proposals page
    When I click the submit proposal link
    Then I should be on the new proposal page

  Scenario: Submit form has app navigation
    Given I am on the new proposal page
    Then I should see a "IPE City Grants" link
