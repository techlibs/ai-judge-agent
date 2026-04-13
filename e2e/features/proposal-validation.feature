@validation
Feature: Grant Proposal Validation & Security
  As the system
  I want to validate and reject invalid or malicious proposals
  So that only well-formed, safe proposals enter the evaluation pipeline

  Background:
    Given I am on the proposal submission page "/grants/submit"

  # --- Validation Errors ---

  Scenario: Reject submission with empty required fields
    When I click "Submit Proposal" without filling any fields
    Then I should see validation errors for all required fields
    And I should remain on the submission page

  Scenario Outline: Reject fields that violate length constraints
    When I fill in "<field>" with a value of <length> characters
    And I fill in all other required fields with valid data
    And I click "Submit Proposal"
    Then I should see a validation error for "<field>"

    Examples:
      | field             | length | reason             |
      | Title             | 4      | below minimum (5)  |
      | Title             | 201    | above maximum (200)|
      | Description       | 49     | below minimum (50) |
      | Problem Statement | 19     | below minimum (20) |
      | Proposed Solution | 19     | below minimum (20) |
      | Budget Breakdown  | 19     | below minimum (20) |
      | Timeline          | 9      | below minimum (10) |

  Scenario: Reject budget below minimum
    When I fill in all required fields with valid data
    And I set the budget amount to 99
    And I click "Submit Proposal"
    Then I should see a validation error for "Budget (USDC)"
    And the error should mention the minimum of 100 USDC

  Scenario: Reject budget above maximum
    When I fill in all required fields with valid data
    And I set the budget amount to 1000001
    And I click "Submit Proposal"
    Then I should see a validation error for "Budget (USDC)"
    And the error should mention the maximum of 1,000,000 USDC

  Scenario: Reject submission with no team members
    When I fill in all required fields with valid data
    And I remove all team members
    And I click "Submit Proposal"
    Then I should see a validation error for the team section

  Scenario: Reject submission with more than 10 team members
    When I fill in all required fields with valid data
    And I add 11 team members
    And I click "Submit Proposal"
    Then I should see a validation error for team size limit

  Scenario: Reject submission with more than 5 external links
    When I fill in all required fields with valid data
    And I add 6 external links
    And I click "Submit Proposal"
    Then I should see a validation error for links limit

  # --- Security ---

  Scenario Outline: Reject proposals containing PII
    When I fill in all required fields with valid data
    And the "<field>" contains "<pii_value>"
    And I click "Submit Proposal"
    Then I should see an error about removing personal information

    Examples:
      | field             | pii_value              | pii_type      |
      | Description       | email me at a@b.com    | email address |
      | Problem Statement | call 555-123-4567      | phone number  |
      | Proposed Solution | SSN 123-45-6789        | SSN           |
      | Description       | server at 192.168.1.1  | IP address    |

  Scenario: Reject oversized payload
    When I fill in all required fields with content exceeding 256 KB total
    And I click "Submit Proposal"
    Then I should receive a 413 payload too large error

  # --- Rate Limiting ---

  Scenario: Rate limit after 5 submissions per hour
    Given I have already submitted 5 proposals in the last hour
    When I fill in all required fields with valid data
    And I click "Submit Proposal"
    Then I should receive a 429 rate limit error
    And the response should include a "Retry-After" header
