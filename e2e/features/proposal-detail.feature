@needs-fixtures
Feature: Proposal Detail Page
  As a visitor
  I want to view a proposal's full details and evaluation results
  So that I can understand the project and its AI judge scores

  # --- Proposal Content ---

  Scenario: View pending proposal details
    Given a pending proposal exists with:
      | field             | value                                          |
      | title             | Solar Grid Project                             |
      | category          | infrastructure                                 |
      | description       | A community-owned solar micro-grid system      |
      | problemStatement  | Expensive diesel generators                    |
      | proposedSolution  | 50kW solar array with battery storage          |
      | budgetAmount      | 25000                                          |
      | budgetBreakdown   | Solar panels: $15,000. Batteries: $5,000.      |
      | timeline          | 12 weeks from approval                         |
    When I navigate to the proposal detail page
    Then I should see the heading "Solar Grid Project"
    And I should see a "infrastructure" category badge
    And I should see a "pending" status badge
    And I should see the description "A community-owned solar micro-grid system"
    And I should see the problem statement
    And I should see the proposed solution
    And I should see the budget displayed as "25,000"
    And I should see the budget breakdown
    And I should see the timeline

  Scenario: Pending proposal shows "Start Evaluation" action
    Given a pending proposal exists
    When I navigate to the proposal detail page
    Then I should see a "Start Evaluation" link
    And the link should point to "/grants/{id}/evaluate"

  # --- Evaluated Proposal ---

  Scenario: View evaluated proposal with judge scores
    Given a published proposal exists with 4 completed evaluations:
      | dimension | score | recommendation | confidence |
      | tech      | 8000  | fund           | high       |
      | impact    | 7500  | fund           | medium     |
      | cost      | 6000  | conditional    | high       |
      | team      | 8500  | strong_fund    | high       |
    When I navigate to the proposal detail page
    Then I should see 4 judge evaluation cards
    And the "Technical Feasibility" card should show score "80.0"
    And the "Impact Potential" card should show score "75.0"
    And the "Cost Efficiency" card should show score "60.0"
    And the "Team Capability" card should show score "85.0"

  Scenario: Judge card displays full evaluation details
    Given a published proposal with a completed "tech" evaluation:
      | field          | value                                         |
      | score          | 8000                                          |
      | recommendation | fund                                          |
      | confidence     | high                                          |
      | justification  | Strong technical approach with clear milestones|
      | keyFindings    | Proven solar technology, IoT integration       |
      | risks          | Supply chain delays, weather dependency        |
    When I navigate to the proposal detail page
    Then the "Technical Feasibility" judge card should show:
      | field          | value                                          |
      | Score          | 80.0                                           |
      | Recommendation | fund                                           |
      | Justification  | Strong technical approach with clear milestones |
    And the card should list key findings
    And the card should list risks

  Scenario: Display IPE alignment scores per judge
    Given a published proposal with a completed "impact" evaluation with IPE alignment:
      | proTechnology   | 85  |
      | proFreedom      | 70  |
      | proHumanProgress| 90  |
    When I navigate to the proposal detail page
    Then the "Impact Potential" card should display IPE alignment scores

  # --- Aggregate Score ---

  Scenario: Display weighted aggregate score
    Given a published proposal with evaluations:
      | dimension | score | weight |
      | tech      | 8000  | 25%    |
      | impact    | 7500  | 30%    |
      | cost      | 6000  | 20%    |
      | team      | 8500  | 25%    |
    And the aggregate score is 7375
    When I navigate to the proposal detail page
    Then I should see the aggregate score gauge showing "73.8"

  Scenario: Display radar chart of dimensional scores
    Given a published proposal with all 4 evaluations completed
    When I navigate to the proposal detail page
    Then I should see a dimensional breakdown radar chart
    And the chart should plot all 4 dimensions

  # --- Actions ---

  Scenario: Published proposal shows "Verify On-Chain" action
    Given a published proposal exists
    When I navigate to the proposal detail page
    Then I should see a "Verify On-Chain" link
    And the link should point to "/grants/{id}/verify"

  Scenario: Evaluating proposal shows evaluation in progress
    Given a proposal with status "evaluating" exists
    When I navigate to the proposal detail page
    Then I should see that evaluation is in progress
    And I should not see a "Start Evaluation" link

  # --- Error States ---

  Scenario: Navigate to non-existent proposal
    When I navigate to "/grants/non-existent-id"
    Then I should see a 404 not found page

  Scenario: Failed proposal shows error state
    Given a proposal with status "failed" exists
    When I navigate to the proposal detail page
    Then I should see the "failed" status badge
