@needs-fixtures
Feature: On-Chain Verification
  As a community member
  I want to verify that proposal evaluations were published on-chain
  So that I can trust the evaluation process is transparent and immutable

  # --- Access Control ---

  Scenario: Verification page accessible for published proposals
    Given a published proposal "Solar Grid" with on-chain data exists
    When I navigate to "/grants/{id}/verify"
    Then I should see the heading "On-Chain Verification"

  Scenario: Verification page returns 404 for pending proposals
    Given a pending proposal exists
    When I navigate to "/grants/{id}/verify"
    Then I should receive a 404 not found response

  Scenario: Verification page returns 404 for evaluating proposals
    Given a proposal in "evaluating" status exists
    When I navigate to "/grants/{id}/verify"
    Then I should receive a 404 not found response

  # --- Project Identity ---

  Scenario: Display project identity from ERC-8004
    Given a published proposal with chain data:
      | field          | value                                             |
      | chainTokenId   | 42                                                |
      | chainTxHash    | 0xabc123...                                       |
      | ipfsCid        | QmXyz789...                                       |
    When I navigate to "/grants/{id}/verify"
    Then I should see the "Project Identity" section
    And I should see the chain token ID "42"
    And I should see the registration transaction hash
    And the transaction hash should link to Base Sepolia block explorer
    And I should see the proposal IPFS CID with a verification badge

  # --- Judge Evaluation Proofs ---

  Scenario: Display per-dimension evaluation proofs
    Given a published proposal with 4 on-chain evaluations:
      | dimension | feedbackTxHash | ipfsCid       | model                     | promptVersion  |
      | tech      | 0xtech123...   | QmTech456...  | claude-sonnet-4-20250514 | judge-tech-v1  |
      | impact    | 0ximp123...    | QmImp456...   | claude-sonnet-4-20250514 | judge-impact-v1|
      | cost      | 0xcost123...   | QmCost456...  | claude-sonnet-4-20250514 | judge-cost-v1  |
      | team      | 0xteam123...   | QmTeam456...  | claude-sonnet-4-20250514 | judge-team-v1  |
    When I navigate to "/grants/{id}/verify"
    Then I should see the "Judge Evaluations" section
    And I should see 4 evaluation proof entries
    And each entry should display:
      | field          |
      | Dimension name |
      | Score          |
      | Model name     |
      | Prompt version |
      | Feedback Tx    |
      | IPFS CID       |

  Scenario: Feedback transaction links to block explorer
    Given a published proposal with feedback transactions
    When I navigate to the verification page
    Then each feedback transaction hash should link to Base Sepolia block explorer
    And the link URL should follow the pattern "https://sepolia.basescan.org/tx/{hash}"

  Scenario: IPFS CIDs show verification badges
    Given a published proposal with IPFS-pinned evaluations
    When I navigate to the verification page
    Then each IPFS CID should display a verification badge
    And the badges should indicate content is pinned and verifiable

  # --- Prompt Transparency ---

  Scenario: Evaluation proofs include prompt metadata
    Given a published proposal with evaluation IPFS data
    When I navigate to the verification page
    Then each evaluation should show the model used
    And each evaluation should show the prompt version
    And this data should match what was stored in the IPFS evaluation payload
