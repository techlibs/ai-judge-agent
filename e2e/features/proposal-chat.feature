Feature: Agentic Proposal Submission
  As a grant applicant
  I want to submit a proposal through a conversational AI interface
  So that I can get guided help crafting a compelling proposal

  Background:
    Given I am on the proposal submission page "/grants/submit"

  Scenario: Chat interface is shown as the default view
    Then I should see the chat interface as the default view
    And I should see a welcome message

  Scenario: User switches to classic form
    When I click the "Use Form" tab
    Then I should see the classic proposal form

  Scenario: User switches back to chat from form
    When I click the "Use Form" tab
    Then I should see the classic proposal form
    When I click the "Chat with AI" tab
    Then I should see the chat interface as the default view

  Scenario: User sends a message in chat
    When I type a message "I want to build a solar grid for IPE Village" in the chat input
    And I click the send button
    Then the chat input should be cleared

  Scenario: Chat input is disabled while loading
    When I type a message "Hello" in the chat input
    And I click the send button
    Then the send button should be disabled
