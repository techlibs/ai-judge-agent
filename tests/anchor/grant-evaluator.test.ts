import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { describe, it, expect, beforeAll } from "bun:test";
import { createHash } from "crypto";

// Load the IDL from the build output
const IDL = require("../../target/idl/grant_evaluator.json");

// Helpers
function makeTitleHash(title: string): Buffer {
  return createHash("sha256").update(title).digest();
}

function makeBytes32(seed: number): number[] {
  const buf = Buffer.alloc(32, 0);
  buf[0] = seed;
  buf[1] = seed + 1;
  return Array.from(buf);
}

function zeroBytes32(): number[] {
  return new Array(32).fill(0);
}

describe("grant-evaluator", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = new Program(IDL, provider);
  const programId = program.programId;

  // Keypairs
  const authority = (provider.wallet as anchor.Wallet).payer;
  const evaluator = Keypair.generate();
  const submitter1 = Keypair.generate();
  const submitter2 = Keypair.generate();
  const unauthorizedUser = Keypair.generate();

  // PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );

  // Shared test data
  const titleHash = makeTitleHash("My Grant Proposal");
  const contentCid = makeBytes32(1);
  const repoUrlHash = makeBytes32(2);
  const demoUrlHash = makeBytes32(3);

  let proposalPda: PublicKey;
  let proposalBump: number;

  beforeAll(async () => {
    // Derive the proposal PDA for submitter1
    [proposalPda, proposalBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), submitter1.publicKey.toBuffer(), titleHash],
      programId
    );

    // Airdrop SOL to test accounts
    const airdropAmount = 10 * anchor.web3.LAMPORTS_PER_SOL;
    const airdropPromises = [submitter1, submitter2, evaluator, unauthorizedUser].map(
      async (kp) => {
        const sig = await provider.connection.requestAirdrop(
          kp.publicKey,
          airdropAmount
        );
        await provider.connection.confirmTransaction(sig);
      }
    );
    await Promise.all(airdropPromises);
  });

  // Test 6: initialize_config sets the evaluator authority pubkey in a config PDA
  it("Test 6: initialize_config sets evaluator authority in config PDA", async () => {
    await program.methods
      .initializeConfig(evaluator.publicKey)
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const configAccount = await program.account.config.fetch(configPda);
    expect(configAccount.authority.toBase58()).toBe(
      authority.publicKey.toBase58()
    );
    expect(configAccount.evaluator.toBase58()).toBe(
      evaluator.publicKey.toBase58()
    );
  });

  // Test 1: submit_proposal creates a PDA with correct data
  it("Test 1: submit_proposal creates PDA with correct fields", async () => {
    await program.methods
      .submitProposal(
        Array.from(titleHash),
        contentCid,
        repoUrlHash,
        demoUrlHash,
        { deFi: {} }
      )
      .accounts({
        proposal: proposalPda,
        submitter: submitter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter1])
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPda);
    expect(proposal.submitter.toBase58()).toBe(
      submitter1.publicKey.toBase58()
    );
    expect(Array.from(proposal.contentCid)).toEqual(contentCid);
    expect(Array.from(proposal.repoUrlHash)).toEqual(repoUrlHash);
    expect(Array.from(proposal.demoUrlHash)).toEqual(demoUrlHash);
    expect(proposal.domain).toEqual({ deFi: {} });
    expect(proposal.status).toEqual({ submitted: {} });
    expect(Number(proposal.submittedAt)).toBeGreaterThan(0);
    expect(proposal.bump).toBe(proposalBump);
  });

  // Test 2: submit_proposal emits ProposalSubmitted event
  it("Test 2: submit_proposal emits ProposalSubmitted event", async () => {
    const titleHash2 = makeTitleHash("Event Test Proposal");
    const [pda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), submitter1.publicKey.toBuffer(), titleHash2],
      programId
    );

    const listener = program.addEventListener(
      "proposalSubmitted",
      (event: any) => {
        expect(event.submitter.toBase58()).toBe(
          submitter1.publicKey.toBase58()
        );
        expect(Array.from(event.contentCid)).toEqual(contentCid);
        expect(event.domain).toEqual({ deFi: {} });
        expect(Number(event.submittedAt)).toBeGreaterThan(0);
        expect(event.proposalId.toBase58()).toBe(pda2.toBase58());
      }
    );

    await program.methods
      .submitProposal(
        Array.from(titleHash2),
        contentCid,
        repoUrlHash,
        demoUrlHash,
        { deFi: {} }
      )
      .accounts({
        proposal: pda2,
        submitter: submitter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter1])
      .rpc();

    // Give time for event to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));
    program.removeEventListener(listener);
  });

  // Test 3: submit_proposal with zero content_cid fails
  it("Test 3: zero content_cid is rejected with InvalidContentCid", async () => {
    const titleHash3 = makeTitleHash("Zero CID Proposal");
    const [pda3] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), submitter1.publicKey.toBuffer(), titleHash3],
      programId
    );

    try {
      await program.methods
        .submitProposal(
          Array.from(titleHash3),
          zeroBytes32(),
          repoUrlHash,
          demoUrlHash,
          { deFi: {} }
        )
        .accounts({
          proposal: pda3,
          submitter: submitter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([submitter1])
        .rpc();
      // Should not reach here
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.toString()).toContain("InvalidContentCid");
    }
  });

  // Test 4: duplicate proposal (same submitter + title_hash) fails
  it("Test 4: duplicate proposal fails (PDA already exists)", async () => {
    // proposalPda was already created in Test 1 with submitter1 + titleHash
    try {
      await program.methods
        .submitProposal(
          Array.from(titleHash),
          contentCid,
          repoUrlHash,
          demoUrlHash,
          { deFi: {} }
        )
        .accounts({
          proposal: proposalPda,
          submitter: submitter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([submitter1])
        .rpc();
      expect(true).toBe(false);
    } catch (err: any) {
      // Anchor returns a constraint error when trying to init an existing account
      expect(err.toString()).toMatch(/already in use|0x0/);
    }
  });

  // Test 5: any wallet can submit (open submission per D-08)
  it("Test 5: different wallets can both submit proposals", async () => {
    const title5 = makeTitleHash("Submitter 2 Proposal");
    const [pda5] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), submitter2.publicKey.toBuffer(), title5],
      programId
    );

    await program.methods
      .submitProposal(
        Array.from(title5),
        contentCid,
        repoUrlHash,
        demoUrlHash,
        { governance: {} }
      )
      .accounts({
        proposal: pda5,
        submitter: submitter2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter2])
      .rpc();

    const proposal = await program.account.proposal.fetch(pda5);
    expect(proposal.submitter.toBase58()).toBe(
      submitter2.publicKey.toBase58()
    );
    expect(proposal.domain).toEqual({ governance: {} });
  });

  // Test 7: update_status transitions Submitted -> UnderReview by authorized evaluator
  it("Test 7: evaluator can transition Submitted to UnderReview", async () => {
    await program.methods
      .updateStatus({ underReview: {} })
      .accounts({
        proposal: proposalPda,
        config: configPda,
        evaluator: evaluator.publicKey,
      })
      .signers([evaluator])
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalPda);
    expect(proposal.status).toEqual({ underReview: {} });
  });

  // Test 8: update_status from non-authority signer fails with Unauthorized
  it("Test 8: non-authority signer is rejected with Unauthorized", async () => {
    // Create a fresh proposal for this test since proposalPda is now UnderReview
    const title8 = makeTitleHash("Unauthorized Test Proposal");
    const [pda8] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), submitter1.publicKey.toBuffer(), title8],
      programId
    );

    await program.methods
      .submitProposal(
        Array.from(title8),
        contentCid,
        repoUrlHash,
        demoUrlHash,
        { deFi: {} }
      )
      .accounts({
        proposal: pda8,
        submitter: submitter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter1])
      .rpc();

    try {
      await program.methods
        .updateStatus({ underReview: {} })
        .accounts({
          proposal: pda8,
          config: configPda,
          evaluator: unauthorizedUser.publicKey,
        })
        .signers([unauthorizedUser])
        .rpc();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.toString()).toContain("Unauthorized");
    }
  });

  // Test 9: invalid status transition (Submitted -> Evaluated) fails
  it("Test 9: invalid transition Submitted->Evaluated fails", async () => {
    const title9 = makeTitleHash("Invalid Transition Proposal");
    const [pda9] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), submitter1.publicKey.toBuffer(), title9],
      programId
    );

    await program.methods
      .submitProposal(
        Array.from(title9),
        contentCid,
        repoUrlHash,
        demoUrlHash,
        { deFi: {} }
      )
      .accounts({
        proposal: pda9,
        submitter: submitter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([submitter1])
      .rpc();

    try {
      await program.methods
        .updateStatus({ evaluated: {} })
        .accounts({
          proposal: pda9,
          config: configPda,
          evaluator: evaluator.publicKey,
        })
        .signers([evaluator])
        .rpc();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.toString()).toContain("InvalidStatusTransition");
    }
  });

  // Test 10: all 6 ProposalDomain values can be used in submission
  it("Test 10: all 6 domain values can be used in submissions", async () => {
    const domains = [
      { deFi: {} },
      { governance: {} },
      { education: {} },
      { health: {} },
      { infrastructure: {} },
      { other: {} },
    ];

    for (let i = 0; i < domains.length; i++) {
      const title = makeTitleHash(`Domain Test ${i}`);
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("proposal"), submitter2.publicKey.toBuffer(), title],
        programId
      );

      await program.methods
        .submitProposal(
          Array.from(title),
          makeBytes32(10 + i),
          repoUrlHash,
          demoUrlHash,
          domains[i]
        )
        .accounts({
          proposal: pda,
          submitter: submitter2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([submitter2])
        .rpc();

      const proposal = await program.account.proposal.fetch(pda);
      expect(proposal.domain).toEqual(domains[i]);
    }
  });
});
