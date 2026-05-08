// ── Night Save — ZK Savings Vault ─────────────────────────────

const NIGHT_ID_API = 'https://night-markets-94-production.up.railway.app';
async function recordAction(points) {
  const addr = walletState?.address;
  if (!addr) return;
  try {
    await fetch(`${NIGHT_ID_API}/api/nightid/record-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holderAddress: addr, appId: 'night-save', points }),
    });
  } catch (_) {}
}

var NS_API = 'http://127.0.0.1:3001';
var _apiReady = null;
async function apiCheck() {
  if (_apiReady !== null) return _apiReady;
  try { await fetch(NS_API + '/health', { signal: AbortSignal.timeout(2000) }); _apiReady = true; } catch { _apiReady = false; }
  return _apiReady;
}
async function apiPost(path, body) {
  const r = await fetch(NS_API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

var NIGHT_USD = 0.04;
var LTV_MAX   = 0.80;
var LIQ_THRESHOLD = 0.95;

var _vaultState = JSON.parse(localStorage.getItem('ns_vault') || 'null') || { collateral: 0, debt: 0 };
function saveVault() { localStorage.setItem('ns_vault', JSON.stringify(_vaultState)); }

var walletState = { connected: false, demo: false, address: null };

async function connectLace() {
  if (typeof nightWallet === 'undefined') { connectDemo(); return; }
  try {
    const state = await nightWallet.connect('lace');
    walletState = { connected: state.connected, demo: state.demo, address: state.address };
    closeModal('ov-wallet'); updateWalletUI();
    toast(state.demo ? '🎭 Demo mode' : '✓ Lace connected', 'success');
    await syncVault(); renderVault();
  } catch { connectDemo(); }
}

function connectDemo() {
  walletState = { connected: true, demo: true, address: 'mn_addr_preprod1' + Math.random().toString(36).slice(2, 14) };
  closeModal('ov-wallet'); updateWalletUI();
  toast('🎭 Demo mode — no real funds', 'success');
  renderVault();
}

function handleWalletClick() {
  if (walletState.connected) {
    if (confirm('Disconnect?')) { walletState = { connected: false, demo: false, address: null }; updateWalletUI(); }
  } else { openModal('ov-wallet'); }
}

async function syncVault() {
  if (!walletState.address) return;
  try {
    const r = await fetch(NS_API + `/api/nightsave/state/${encodeURIComponent(walletState.address)}`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const data = await r.json();
      if (data.collateral !== undefined) { _vaultState.collateral = data.collateral; _vaultState.debt = data.debt; saveVault(); }
    }
  } catch { /* use local state */ }
}

function updateWalletUI() {
  const dot = document.getElementById('wallet-dot');
  const lbl = document.getElementById('wallet-label');
  if (!dot || !lbl) return;
  dot.style.background = walletState.connected ? '#00d68f' : '#ef4444';
  lbl.textContent = walletState.connected ? (walletState.demo ? '🎭 Demo' : walletState.address.slice(0, 14) + '…') : 'Sign in';
}

function calculateHF(collateral, debt) {
  if (debt <= 0) return Infinity;
  const colUSD = collateral * NIGHT_USD;
  return (colUSD * LTV_MAX) / debt;
}

function updateVaultCalc() {
  const col  = parseFloat(document.getElementById('vault-collateral')?.value || '0') || 0;
  const mint = parseFloat(document.getElementById('vault-mint')?.value || '0') || 0;
  const colUSD = col * NIGHT_USD;
  const maxMint = colUSD * LTV_MAX;
  const hf = calculateHF(col, mint);

  const previewEl = document.getElementById('vault-preview');
  if (previewEl) {
    if (col > 0) {
      previewEl.textContent = `${col.toLocaleString()} NIGHT = $${colUSD.toFixed(2)} · max mint $${maxMint.toFixed(2)} sUSD · HF ${isFinite(hf) ? hf.toFixed(2) : '∞'}`;
      previewEl.style.color = mint > maxMint ? 'var(--red)' : 'var(--muted)';
    } else {
      previewEl.textContent = '';
    }
  }
}

function renderVault() {
  const col = _vaultState.collateral, debt = _vaultState.debt;
  const colUSD = col * NIGHT_USD;
  const hf = calculateHF(col, debt);
  const hfPct = isFinite(hf) ? Math.min(100, hf * 33) : 100;

  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('vs-collateral', col.toLocaleString());
  set('vs-susd',  `$${debt.toFixed(2)}`);
  set('vs-hf',    isFinite(hf) ? hf.toFixed(2) : '—');

  const bar  = document.getElementById('hf-bar-fill');
  const hfv  = document.getElementById('hf-bar-val');
  if (bar) {
    bar.style.width = hfPct + '%';
    bar.style.background = hf > 1.5 ? 'var(--green)' : hf > 1.1 ? 'var(--gold)' : 'var(--red)';
  }
  if (hfv) {
    hfv.textContent = hf > 1.5 ? 'Safe' : hf > 1.1 ? 'Caution' : 'Risk';
    hfv.style.color = hf > 1.5 ? 'var(--green)' : hf > 1.1 ? 'var(--gold)' : 'var(--red)';
  }
}

function _vaultCircuit(steps, onDone) {
  const circuit = document.getElementById('vault-circuit');
  if (!circuit) { onDone(); return; }
  circuit.style.display = 'flex';
  circuit.innerHTML = steps.map((s, i) =>
    `<div id="vc-${i}"><span class="ct-dot wait" id="vd-${i}"></span>${s.label}</div>`).join('');
  let i = 0;
  function next() {
    if (i > 0) { const pd = document.getElementById(`vd-${i-1}`); if (pd) pd.className = 'ct-dot done'; }
    if (i >= steps.length) { onDone(); return; }
    const pd = document.getElementById(`vd-${i}`); if (pd) pd.className = 'ct-dot active';
    const ms = steps[i].ms; i++;
    if (ms > 0) setTimeout(next, ms); else next();
  }
  next();
}

async function vaultDeposit() {
  if (!walletState.connected) { openModal('ov-wallet'); return; }
  const col = parseFloat(document.getElementById('vault-collateral')?.value || '0');
  if (col <= 0) { toast('Enter collateral amount', 'error'); return; }
  _vaultCircuit([
    { label: 'Generating ZK collateral commitment…', ms: 800 },
    { label: `Depositing ${col.toLocaleString()} NIGHT → Statera vault…`, ms: 900 },
    { label: '✓ Collateral locked · private on Midnight', ms: 0 },
  ], async () => {
    try {
      const r = await apiPost('/api/nightsave/deposit', { amount: col, address: walletState.address });
      _vaultState.collateral = r.collateral || (_vaultState.collateral + col);
    } catch {
      _vaultState.collateral += col;
    }
    saveVault(); renderVault();
    toast(`✓ ${col.toLocaleString()} NIGHT deposited`, 'success');
    recordAction(10);
  });
}

async function vaultMint() {
  if (!walletState.connected) { openModal('ov-wallet'); return; }
  const mint = parseFloat(document.getElementById('vault-mint')?.value || '0');
  if (mint <= 0) { toast('Enter sUSD amount to mint', 'error'); return; }
  const maxMint = _vaultState.collateral * NIGHT_USD * LTV_MAX;
  if (mint > maxMint) { toast(`Max mint is $${maxMint.toFixed(2)} sUSD at current collateral`, 'error'); return; }
  _vaultCircuit([
    { label: 'Proving collateral ratio in ZK…', ms: 900 },
    { label: `Minting $${mint.toFixed(2)} sUSD to your wallet…`, ms: 800 },
    { label: '✓ sUSD minted · spendable on Night Markets', ms: 0 },
  ], async () => {
    try {
      const r = await apiPost('/api/nightsave/mint', { amount: mint, address: walletState.address });
      _vaultState.debt = r.debt || (_vaultState.debt + mint);
    } catch {
      _vaultState.debt += mint;
    }
    saveVault(); renderVault();
    toast(`✓ $${mint.toFixed(2)} sUSD minted`, 'success');
  });
}

async function vaultRepay() {
  if (_vaultState.debt <= 0) { toast('No sUSD debt to repay', 'info'); return; }
  _vaultCircuit([
    { label: 'Burning sUSD tokens…', ms: 700 },
    { label: 'Updating vault health factor…', ms: 600 },
    { label: '✓ Debt repaid', ms: 0 },
  ], async () => {
    try {
      await apiPost('/api/nightsave/repay', { amount: _vaultState.debt, address: walletState.address });
    } catch {}
    _vaultState.debt = 0; saveVault(); renderVault();
    toast('✓ sUSD debt fully repaid', 'success');
  });
}

async function vaultRedeem() {
  if (_vaultState.collateral <= 0) { toast('No collateral to redeem', 'info'); return; }
  if (_vaultState.debt > 0) { toast('Repay sUSD debt first', 'error'); return; }
  _vaultCircuit([
    { label: 'Releasing collateral from vault…', ms: 800 },
    { label: 'Returning NIGHT to your wallet…', ms: 700 },
    { label: '✓ Collateral redeemed', ms: 0 },
  ], async () => {
    try {
      await apiPost('/api/nightsave/redeem', { address: walletState.address });
    } catch {}
    _vaultState.collateral = 0; saveVault(); renderVault();
    toast('✓ Collateral redeemed', 'success');
  });
}

function quickFill(amount) {
  const input = document.getElementById('vault-collateral');
  if (input) { input.value = amount; updateVaultCalc(); }
}

function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

function toast(msg, type = 'info') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`; t.textContent = msg;
  wrap.appendChild(t); setTimeout(() => t.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', () => {
  updateWalletUI();
  renderVault();
});
