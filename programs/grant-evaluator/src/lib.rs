use anchor_lang::prelude::*;

declare_id!("2RC6cF4pmnANHAPkpoR2RcPm79Zgq8G9Sz9JKotGMvS6");

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
