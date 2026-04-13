@skip @api
Feature: Proposals API
  As the system backend
  I want to handle proposal CRUD operations securely
  So that proposals are validated, stored, and retrievable

  # --- POST /api/proposals ---

  Scenario: Create a valid proposal via API
    When I POST to "/api/proposals" with valid proposal data
    Then I should receive a 200 response
    And the response should contain:
      | field   | type   |
      | id      | string |
      | ipfsCid | string |
      | ipfsUri | string |
    And the proposal should be stored in the database with status "pending"
    And the proposal content should be pinned to IPFS

  Scenario: Reject invalid proposal data
    When I POST to "/api/proposals" with missing required fields
    Then I should receive a 400 response
    And the response should contain Zod validation error details

  Scenario: Reject proposal with PII
    When I POST to "/api/proposals" with description containing "email@example.com"
    Then I should receive a 422 response
    And the error message should mention removing personal information

  Scenario: Rate limit proposal creation
    Given 5 proposals have been submitted from my IP in the last hour
    When I POST to "/api/proposals" with valid data
    Then I should receive a 429 response
    And the response should include a "Retry-After" header

  Scenario: Reject oversized payload
    When I POST to "/api/proposals" with Content-Length exceeding 256 KB
    Then I should receive a 413 response

  Scenario: Validate CORS origin
    When I POST to "/api/proposals" from an unauthorized origin
    Then the request should be rejected

  # --- Idempotency ---

  Scenario: Same proposal data creates separate entries
    When I POST to "/api/proposals" with valid data twice
    Then I should receive two different proposal IDs
    And both proposals should exist in the database

  # --- IPFS Integration ---

  Scenario: Handle IPFS upload failure gracefully
    Given the IPFS service is unavailable
    When I POST to "/api/proposals" with valid data
    Then I should receive a 500 response
    And no proposal should be created in the database
