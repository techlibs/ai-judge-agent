Feature: Operator Dashboard Authentication
  As a platform operator
  I want the operator dashboard to be protected by authentication
  So that only authorized users can trigger cache syncs and manage the system

  Scenario: Unauthenticated user is redirected to sign-in
    When I visit /dashboard/operator without a session
    Then I should be redirected to the sign-in page
    And the redirect URL should contain "/api/auth/signin"

  Scenario: Cache sync requires authentication
    When I call POST /api/sync without a session
    Then the response status should be 401
    And the response should indicate authentication is required
