# Token Design - FunToken (FUN)

## Overview

**FunToken (FUN)** is an ERC-20 token deployed on Polygon PoS, designed as an internal gaming credit for the Fun platform.

## Token Specifications

- **Name**: Fun
- **Symbol**: FUN
- **Decimals**: 8
- **Initial Supply**: 1,000,000,000 FUN (1 billion)
- **Network**: Polygon PoS (EVM compatible)

## Architecture Strategy

### MVP Phase (Current)

For the MVP, **all balances are managed off-chain** in the platform database:

- Users don't need wallets or on-chain interactions
- All token operations (bets, rewards, transfers) happen in the database
- The smart contract exists and is deployed, but serves as a "reserve" for future migration

**Benefits:**
- No gas fees for users
- Faster transactions
- Simpler UX (no wallet connection needed)
- Easier to implement anti-abuse measures

### Future Phase

The architecture is designed to support future on-chain integration:

- Users can optionally connect wallets
- Balances can be synced between on-chain and off-chain
- Bridge functionality for cash-in/cash-out
- Full web3 experience for advanced users

## Smart Contract Features

### Standard ERC-20
- `transfer()`, `transferFrom()`, `approve()`
- Full compatibility with wallets and DEXs

### Minting
- Controlled by `MINTER_ROLE`
- Used for:
  - Initial user registration (1,000 FUN)
  - Daily rewards
  - Level-up rewards
  - Faucet claims
  - Ad rewards
  - Quiz rewards
  - Race prizes
  - Mission/achievement rewards

### Burning
- Controlled by `BURNER_ROLE` (or any user can burn their own tokens)
- Used for:
  - Deflationary mechanics
  - Game house edge
  - Optional fee collection

### Access Control
- `DEFAULT_ADMIN_ROLE`: Full control
- `MINTER_ROLE`: Can mint tokens
- `BURNER_ROLE`: Can burn tokens (future use)

## Balance Management

### Off-Chain Ledger (MVP)

The platform maintains a `UserBalance` table in PostgreSQL:

```sql
CREATE TABLE user_balance (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  locked_balance DECIMAL(20, 8) NOT NULL DEFAULT 0, -- For active bets
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 0 -- For optimistic locking
);
```

### Transaction Log

All balance changes are logged in `transactions` table:

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- 'bet', 'win', 'daily_reward', 'faucet', etc.
  amount DECIMAL(20, 8) NOT NULL,
  balance_before DECIMAL(20, 8) NOT NULL,
  balance_after DECIMAL(20, 8) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Reconciliation

The system can reconstruct any user's balance from transaction history:

```
current_balance = initial_balance + sum(all_transactions)
```

## Initial Distribution

### New User Registration
- **1,000 FUN** credited automatically upon first OAuth login
- Logged as transaction type: `initial_bonus`

### Distribution Sources
1. **Initial Registration**: 1,000 FUN
2. **Daily Reward**: Level-based (configurable)
3. **Hourly Faucet**: Level-based (configurable)
4. **Rewarded Ads**: 50 FUN per ad (max 5/hour)
5. **Quiz**: 0/50/150/300 FUN based on correct answers
6. **Level Up Rewards**: Milestone-based (configurable)
7. **Race Prizes**: Distributed from entry fees
8. **Missions**: Configurable rewards
9. **Wheel**: Configurable prizes

## Security Considerations

### Off-Chain Security
- All balance operations use database transactions (ACID)
- Optimistic locking to prevent race conditions
- Server-side validation of all operations
- Rate limiting on reward endpoints
- IP/user-agent tracking for anti-abuse

### On-Chain Security (Future)
- Access control on mint/burn functions
- Pausable functionality (can be added)
- Upgradeable proxy pattern (can be added if needed)

## Migration Path

When ready to move balances on-chain:

1. **Snapshot**: Export all user balances from database
2. **Batch Mint**: Mint tokens to user wallets (or platform wallet)
3. **Sync**: Implement bidirectional sync between on-chain and off-chain
4. **Gradual Migration**: Allow users to opt-in to on-chain balances

## Configuration

All token amounts and distributions are configurable via database tables:

- `config` table for global settings
- `level_config` for level-up rewards
- `reward_config` for daily/faucet/quiz rewards
- Feature flags for enabling/disabling reward types

