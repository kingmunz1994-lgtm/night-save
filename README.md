# Night Save

**ZK Collateral Vault + sUSD Minting on Midnight Network**

Night Save (the Statera Protocol) lets you deposit NIGHT as collateral and mint sUSD stablecoins — all with ZK-private positions. Buy now, pay later with the built-in BNPL instalment system. Prove your vault is healthy without revealing your balance.

---

## Key parameters

| Parameter | Value |
|-----------|-------|
| LTV max | **80%** — mint up to 80% of collateral value |
| Liquidation threshold | **95%** — position liquidated above 95% debt/collateral |
| NIGHT price | **$0.04** (4 basis points) |
| BNPL instalments | **4** equal payments |

### Health factor formula
```
HF = (collateral_USD × 0.80) / debt_sUSD
```
HF ≥ 1.0 = healthy · HF < 1.0 = liquidatable

---

## Contract — `NightSave.compact`

```
contracts/
└── NightSave.compact      Compact v0.20 (Midnight)
```

### Key circuits

| Circuit | Description |
|---------|-------------|
| `deposit(amount)` | Add NIGHT collateral |
| `mintSusd(amount)` | Mint sUSD (80% LTV check) |
| `repay(amount)` | Repay sUSD debt (partial ok) |
| `redeem(amount)` | Withdraw NIGHT (requires zero debt) |
| `proveHealthy()` | ZK proof: position is safe without revealing amounts |
| `createBnpl(totalAmount)` | Open a BNPL plan (4 equal instalments) |
| `payBnplInstalment()` | Pay one instalment, reduce debt |

### `proveHealthy()` — ZK circuit
```compact
export circuit proveHealthy(): Boolean {
  // witnesses: callerCollateral(), callerDebt()
  // asserts witnesses match ledger — ZK constraint
  // returns true without revealing collateral or debt
}
```
Verifiers learn only "position is healthy" — not your collateral size or debt amount.

---

## Vault tiers (quick-fill)

| Tier | Collateral | Max sUSD |
|------|-----------|---------|
| Micro | 1,000 NIGHT | $32 |
| Standard | 5,000 NIGHT | $160 |
| Premium | 50,000 NIGHT | $1,600 |
| Obsidian | 200,000 NIGHT | $6,400 |

---

## Front-end

```
public/
├── index.html           Vault dashboard
├── css/nightsave.css    Design system (green accent)
└── js/vault.js          Vault state, HF calc, BNPL flows
```

Vault state persisted in `localStorage` (`ns_vault`). Health factor bar animates green → amber → red as position approaches liquidation.

---

## Development

```bash
npm install
npm run dev          # Vite dev server on :3005
npm run compile      # compactc NightSave.compact
npm run build        # Production build → dist/
```

---

## Deployment

GitHub Pages via `.github/workflows/pages.yml`. Push to `main` → `public/` served automatically. To enable: **Settings → Pages → Source: GitHub Actions**.

---

## Part of Night Markets

| Repo | Description |
|------|-------------|
| [night-fun](https://github.com/kingmunz1994-lgtm/night-fun) | Core token launchpad |
| [night-work](https://github.com/kingmunz1994-lgtm/night-work) | Task marketplace |
| **night-save** | **Collateral vault + sUSD** |
| [night-lend](https://github.com/kingmunz1994-lgtm/night-lend) | DeFi lending |
| [night-biz](https://github.com/kingmunz1994-lgtm/night-biz) | Business loyalty tokens |

---

*Built on Midnight Network · Compact v0.20 · ZK-private by default*
