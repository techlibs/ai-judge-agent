use anchor_lang::prelude::*;

declare_id!("HF8HvTN2eEvSZ7LG1jmN5HvVWco8ufzHnZtkQnqDC8SG");

#[program]
pub mod grant_evaluator {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        evaluator: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.evaluator = evaluator;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn submit_proposal(
        ctx: Context<SubmitProposal>,
        _title_hash: [u8; 32],
        content_cid: [u8; 32],
        repo_url_hash: [u8; 32],
        demo_url_hash: [u8; 32],
        domain: ProposalDomain,
    ) -> Result<()> {
        require!(content_cid != [0u8; 32], ErrorCode::InvalidContentCid);

        let proposal = &mut ctx.accounts.proposal;
        let clock = Clock::get()?;

        proposal.submitter = ctx.accounts.submitter.key();
        proposal.content_cid = content_cid;
        proposal.repo_url_hash = repo_url_hash;
        proposal.demo_url_hash = demo_url_hash;
        proposal.domain = domain;
        proposal.status = ProposalStatus::Submitted;
        proposal.submitted_at = clock.unix_timestamp;
        proposal.bump = ctx.bumps.proposal;

        emit!(ProposalSubmitted {
            proposal_id: proposal.key(),
            submitter: proposal.submitter,
            content_cid,
            domain,
            submitted_at: proposal.submitted_at,
        });

        Ok(())
    }

    pub fn update_status(
        ctx: Context<UpdateStatus>,
        new_status: ProposalStatus,
    ) -> Result<()> {
        // D-10: Only the authorized evaluator can transition status
        require!(
            ctx.accounts.evaluator.key() == ctx.accounts.config.evaluator,
            ErrorCode::Unauthorized
        );

        let proposal = &mut ctx.accounts.proposal;
        let current = proposal.status;

        require!(
            is_valid_transition(current, new_status),
            ErrorCode::InvalidStatusTransition
        );

        proposal.status = new_status;

        emit!(ProposalStatusChanged {
            proposal_id: proposal.key(),
            new_status,
        });

        Ok(())
    }
}

fn is_valid_transition(current: ProposalStatus, target: ProposalStatus) -> bool {
    matches!(
        (current, target),
        (ProposalStatus::Submitted, ProposalStatus::UnderReview)
            | (ProposalStatus::UnderReview, ProposalStatus::Evaluated)
            | (ProposalStatus::Evaluated, ProposalStatus::Disputed)
    )
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(title_hash: [u8; 32])]
pub struct SubmitProposal<'info> {
    #[account(
        init,
        payer = submitter,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal", submitter.key().as_ref(), title_hash.as_ref()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub submitter: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateStatus<'info> {
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    pub evaluator: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,   // 32 -- program deployer
    pub evaluator: Pubkey,   // 32 -- authorized evaluator agent
    pub bump: u8,            // 1
}

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub submitter: Pubkey,       // 32
    pub content_cid: [u8; 32],  // 32
    pub repo_url_hash: [u8; 32], // 32
    pub demo_url_hash: [u8; 32], // 32
    pub domain: ProposalDomain,  // 1
    pub status: ProposalStatus,  // 1
    pub submitted_at: i64,       // 8
    pub bump: u8,                // 1
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ProposalDomain {
    DeFi,
    Governance,
    Education,
    Health,
    Infrastructure,
    Other,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ProposalStatus {
    Submitted,
    UnderReview,
    Evaluated,
    Disputed,
}

#[event]
pub struct ProposalSubmitted {
    pub proposal_id: Pubkey,
    pub submitter: Pubkey,
    pub content_cid: [u8; 32],
    pub domain: ProposalDomain,
    pub submitted_at: i64,
}

#[event]
pub struct ProposalStatusChanged {
    pub proposal_id: Pubkey,
    pub new_status: ProposalStatus,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Content CID cannot be zero")]
    InvalidContentCid,
    #[msg("Invalid status transition")]
    InvalidStatusTransition,
    #[msg("Unauthorized: only evaluator can update status")]
    Unauthorized,
}
