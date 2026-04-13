Feature: Grant Proposal Submission
  As a grant applicant
  I want to submit a grant proposal through the web form
  So that my project can be evaluated by AI judges

  Background:
    Given I am on the proposal submission page "/grants/submit"

  Scenario: Submit a valid grant proposal
    When I fill in the project info:
      | field             | value                                          |
      | Title             | Decentralized Solar Grid for IPE Village        |
      | Description       | A community-owned solar micro-grid that provides clean energy to all IPE Village residents. The system uses IoT sensors and a transparent ledger. |
      | Problem Statement | IPE Village currently relies on expensive and unreliable diesel generators for electricity. |
      | Proposed Solution | Install a 50kW solar array with battery storage, managed by smart contracts for fair distribution. |
    And I add a team member with name "Alice Santos" and role "Project Lead"
    And I fill in the funding details:
      | field            | value                                                     |
      | Budget (USDC)    | 25000                                                     |
      | Budget Breakdown | Solar panels: $15,000. Battery storage: $5,000. IoT: $3,000. Contingency: $2,000. |
      | Timeline         | 12 weeks from funding approval to full installation.      |
    And I select "3 weeks" for residency duration
    And I select "infrastructure" for category
    And I fill in the IPE Village details:
      | field                  | value                                                     |
      | Demo Day Deliverable   | Live dashboard showing real-time energy production metrics |
      | Community Contribution | Free workshops on solar maintenance for village residents  |
    And I select "First time" for prior IPE participation
    And I click "Submit Proposal"
    Then I should be redirected to the evaluation page "/grants/{id}/evaluate"
    And the proposal should be stored with status "pending"
    And the proposal content should be pinned to IPFS

  Scenario: Submit a proposal with multiple team members
    When I fill in valid project info
    And I add a team member with name "Alice Santos" and role "Project Lead"
    And I add a team member with name "Bob Ferreira" and role "Hardware Engineer"
    And I add a team member with name "Carol Mendes" and role "Community Liaison"
    And I fill in valid funding details
    And I fill in valid IPE Village details
    And I click "Submit Proposal"
    Then I should be redirected to the evaluation page
    And the proposal should have 3 team members

  Scenario: Submit a proposal with external links
    When I fill in all required fields with valid data
    And I add an external link "https://github.com/example/solar-grid"
    And I add an external link "https://docs.google.com/presentation/example"
    And I click "Submit Proposal"
    Then I should be redirected to the evaluation page
    And the proposal should have 2 external links
