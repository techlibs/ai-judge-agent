Feature: Golden Path - End-to-End Grant Evaluation
  As a grant applicant
  I want to submit a proposal and have it evaluated by AI judges with on-chain proof
  So that my project receives a fair, transparent, and verifiable evaluation

  @e2e @golden-path
  Scenario: Complete grant proposal lifecycle
    # Step 1: Landing page
    Given I navigate to the home page "/"
    Then the page should load successfully
    And I should see the main content area

    # Step 2: Grants listing
    When I navigate to "/grants"
    Then I should see the heading "IPE City Grants"
    And I should see a "Submit a Proposal" link

    # Step 3: Submit proposal form
    When I click the "Submit a Proposal" link
    Then I should be on the "/grants/submit" page
    And I should see the form sections:
      | section      |
      | Project Info |
      | Team         |
      | Funding      |
      | IPE Village  |
      | Links        |

    # Step 4: Fill and submit
    When I fill in the complete proposal form:
      | field                  | value                                                       |
      | Title                  | Decentralized Solar Grid for IPE Village                    |
      | Description            | A community-owned solar micro-grid providing clean energy   |
      | Problem Statement      | Expensive and unreliable diesel generators                  |
      | Proposed Solution      | 50kW solar array with smart contract management             |
      | Team Member Name       | Alice Santos                                                |
      | Team Member Role       | Project Lead                                                |
      | Budget (USDC)          | 25000                                                       |
      | Budget Breakdown       | Solar panels: $15,000. Batteries: $5,000. IoT: $3,000.     |
      | Timeline               | 12 weeks from funding approval                              |
      | Residency Duration     | 3 weeks                                                     |
      | Category               | infrastructure                                              |
      | Demo Day Deliverable   | Live energy production dashboard                            |
      | Community Contribution | Free solar maintenance workshops                            |
      | Prior IPE Participation| First time                                                  |
    And I click "Submit Proposal"
    Then I should be redirected to "/grants/{id}/evaluate"

    # Step 5: Proposal appears in listing
    When I navigate to "/grants"
    Then I should see "Decentralized Solar Grid for IPE Village" in the proposals list

    # Step 6: Proposal detail page (status is "evaluating" since submit auto-redirects to /evaluate)
    When I click on the proposal "Decentralized Solar Grid for IPE Village"
    Then I should see the full proposal details
    And I should see "Decentralized Solar Grid for IPE Village"

  @e2e @smoke
  Scenario: Smoke test - pages load without errors
    When I navigate to "/"
    Then the page should load successfully

    When I navigate to "/grants"
    Then I should see the heading "IPE City Grants"

    When I navigate to "/grants/submit"
    Then I should see the heading "Submit a Grant Proposal"
