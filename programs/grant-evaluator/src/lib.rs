use anchor_lang::prelude::*;

declare_id!("CvjtrjA1yTdakHYxc77cfEsDHGiBDpKgQXhNXns9YVas");

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
