use anchor_lang::prelude::*;

declare_id!("geTVFnjX4JD1YnhDub1dg7seorknc2bZsUuCiaN7VWD");

#[program]
pub mod grant_evaluator {
    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("Grant Evaluator initialized");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
