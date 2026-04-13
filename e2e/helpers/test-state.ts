/**
 * Shared mutable test state — stores the last seeded proposal ID
 * so navigation steps can resolve {id} placeholders.
 */
let _lastProposalId: string | undefined;

export function setLastProposalId(id: string | undefined) {
  _lastProposalId = id;
}

export function getLastProposalId(): string | undefined {
  return _lastProposalId;
}
