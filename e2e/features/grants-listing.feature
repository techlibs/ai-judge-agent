@needs-fixtures
Feature: Grants Listing Page
  As a visitor
  I want to browse all grant proposals
  So that I can see what projects are being evaluated

  # --- Page Load ---

  Scenario: Display grants listing with statistics
    Given the following proposals exist:
      | title                | category       | status    | aggregateScore |
      | Solar Grid Project   | infrastructure | published | 7500           |
      | Education Platform   | education      | published | 8200           |
      | Community Garden     | community      | pending   |                |
    When I navigate to "/grants"
    Then I should see the heading "IPE City Grants"
    And I should see total proposals count of 3
    And I should see evaluated proposals count of 2
    And I should see average score of "78.5"
    And I should see a "Submit a Proposal" link

  Scenario: Display empty grants listing
    Given no proposals exist
    When I navigate to "/grants"
    Then I should see the heading "IPE City Grants"
    And I should see total proposals count of 0
    And I should see evaluated proposals count of 0

  # --- Proposal Cards ---

  Scenario: Show proposal card with all details
    Given a published proposal "Solar Grid" in category "infrastructure" with score 7500
    When I navigate to "/grants"
    Then I should see a proposal card for "Solar Grid"
    And the card should display category "infrastructure"
    And the card should display status "published"
    And the card should display score "75.0"
    And the card should display the creation date

  Scenario: Show pending proposal without score
    Given a pending proposal "New Idea" in category "research"
    When I navigate to "/grants"
    Then I should see a proposal card for "New Idea"
    And the card should display status "pending"
    And the card should not display a score

  # --- Status Badges ---

  Scenario Outline: Display correct status badge
    Given a proposal with status "<status>"
    When I navigate to "/grants"
    Then the proposal card should show a "<status>" badge

    Examples:
      | status     |
      | pending    |
      | evaluating |
      | evaluated  |
      | publishing |
      | published  |
      | failed     |

  # --- Navigation ---

  Scenario: Navigate to proposal detail from listing
    Given a published proposal "Solar Grid" exists
    When I navigate to "/grants"
    And I click on the proposal card for "Solar Grid"
    Then I should be navigated to "/grants/{id}"

  Scenario: Navigate to submission form from listing
    When I navigate to "/grants"
    And I click the "Submit a Proposal" link
    Then I should be navigated to "/grants/submit"

  # --- Ordering ---

  Scenario: Proposals are ordered by creation date descending
    Given the following proposals exist in order:
      | title    | createdAt           |
      | First    | 2026-01-01T00:00:00 |
      | Second   | 2026-02-01T00:00:00 |
      | Third    | 2026-03-01T00:00:00 |
    When I navigate to "/grants"
    Then "Third" should appear before "Second"
    And "Second" should appear before "First"
