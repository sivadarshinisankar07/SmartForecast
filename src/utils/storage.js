// ---------------------------------------------------------------------------
// storage.js
// Centralized localStorage-backed persistence layer that stands in for the
// future Flask + MySQL API. Every export here maps ~1:1 to a future REST
// endpoint, noted above each block. No component should touch
// localStorage/sessionStorage directly — everything goes through here so the
// eventual Axios swap only touches this one file.
//
//   authStorage        -> POST /api/auth/login, /api/auth/register
//   companyStorage      -> /api/companies
//   datasetStorage      -> /api/datasets
//   forecastStorage      -> /api/forecasts
//   inventoryStorage    -> /api/inventory (cached computed snapshots)
//   reportStorage       -> /api/reports
// ---------------------------------------------------------------------------

const KEYS = {
  AUTH: 'forecastai_auth',
  COMPANIES: 'forecastai_companies',
  DATASETS: 'forecastai_datasets',
  FORECASTS: 'forecastai_forecasts',
  INVENTORY: 'forecastai_inventory_snapshots',
  REPORTS: 'forecastai_reports',
  SEEDED: 'forecastai_seeded',
}

function readJSON(storageArea, key, fallback) {
  try {
    const raw = storageArea.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(storageArea, key, value) {
  storageArea.setItem(key, JSON.stringify(value))
}

export function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// Lightweight, NON-cryptographic string hash used only so plain-text
// passwords never sit in localStorage. This is a frontend-mock placeholder —
// the real backend must hash with bcrypt/argon2 server-side.
export function hashPassword(pw) {
  let hash = 5381
  for (let i = 0; i < pw.length; i += 1) {
    hash = (hash * 33) ^ pw.charCodeAt(i)
  }
  return `h${(hash >>> 0).toString(36)}`
}

// ---------------------------------------------------------------------------
// authStorage — session handling with a real "Remember Me" distinction.
// remember=true  -> persisted in localStorage (survives browser restarts)
// remember=false -> sessionStorage only (cleared when the tab/browser closes)
// ---------------------------------------------------------------------------
export const authStorage = {
  get: () => readJSON(localStorage, KEYS.AUTH, null) || readJSON(sessionStorage, KEYS.AUTH, null),
  set: (auth, remember) => {
    if (remember) {
      writeJSON(localStorage, KEYS.AUTH, auth)
      sessionStorage.removeItem(KEYS.AUTH)
    } else {
      writeJSON(sessionStorage, KEYS.AUTH, auth)
      localStorage.removeItem(KEYS.AUTH)
    }
  },
  clear: () => {
    localStorage.removeItem(KEYS.AUTH)
    sessionStorage.removeItem(KEYS.AUTH)
  },
}

// ---------------------------------------------------------------------------
// companyStorage — registered accounts (both Admin and Company Customer).
// Each record: { id, companyName, userName, email, passwordHash, role,
//                registeredAt, status }
// ---------------------------------------------------------------------------
export const companyStorage = {
  getAll: () => readJSON(localStorage, KEYS.COMPANIES, []),

  findByEmail: (email) =>
    companyStorage.getAll().find((c) => c.email.toLowerCase() === email.toLowerCase()) || null,

  findByCompanyName: (name) =>
    companyStorage.getAll().find((c) => c.companyName.toLowerCase() === name.toLowerCase()) || null,

  findById: (id) => companyStorage.getAll().find((c) => c.id === id) || null,

  save: (company) => {
    const all = companyStorage.getAll()
    all.push(company)
    writeJSON(localStorage, KEYS.COMPANIES, all)
    return company
  },

  update: (id, patch) => {
    const all = companyStorage.getAll()
    const idx = all.findIndex((c) => c.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() }
    writeJSON(localStorage, KEYS.COMPANIES, all)
    return all[idx]
  },

  // Cascade delete: removes the company plus every dataset/forecast/
  // inventory-snapshot/report that belongs to it.
  remove: (id) => {
    const all = companyStorage.getAll().filter((c) => c.id !== id)
    writeJSON(localStorage, KEYS.COMPANIES, all)
    datasetStorage.removeByCompany(id)
    forecastStorage.removeByCompany(id)
    inventoryStorage.removeByCompany(id)
    reportStorage.removeByCompany(id)
  },
}

// ---------------------------------------------------------------------------
// datasetStorage — uploaded CSV datasets, one primary dataset per company.
// Each record: { id, companyId, fileName, uploadedAt, rowCount, rows,
//                forecastFrom, forecastTo }
// ---------------------------------------------------------------------------
export const datasetStorage = {
  getAll: () => readJSON(localStorage, KEYS.DATASETS, []),
  getByCompany: (companyId) => datasetStorage.getAll().filter((d) => d.companyId === companyId),
  save: (dataset) => {
    const all = datasetStorage.getAll()
    all.push(dataset)
    writeJSON(localStorage, KEYS.DATASETS, all)
    return dataset
  },
  update: (id, patch) => {
    const all = datasetStorage.getAll()
    const idx = all.findIndex((d) => d.id === id)
    if (idx === -1) return null
    all[idx] = { ...all[idx], ...patch }
    writeJSON(localStorage, KEYS.DATASETS, all)
    return all[idx]
  },
  remove: (id) => {
    const all = datasetStorage.getAll().filter((d) => d.id !== id)
    writeJSON(localStorage, KEYS.DATASETS, all)
  },
  removeByCompany: (companyId) => {
    const all = datasetStorage.getAll().filter((d) => d.companyId !== companyId)
    writeJSON(localStorage, KEYS.DATASETS, all)
  },
}

// ---------------------------------------------------------------------------
// forecastStorage — saved forecast runs.
// Each record: { id, companyId, companyName, product, model, period,
//                accuracy, mae, rmse, generatedAt }
// ---------------------------------------------------------------------------
export const forecastStorage = {
  getAll: () => readJSON(localStorage, KEYS.FORECASTS, []),
  getByCompany: (companyId) => forecastStorage.getAll().filter((f) => f.companyId === companyId),
  save: (forecast) => {
    const all = forecastStorage.getAll()
    all.push(forecast)
    writeJSON(localStorage, KEYS.FORECASTS, all)
    return forecast
  },
  remove: (id) => {
    const all = forecastStorage.getAll().filter((f) => f.id !== id)
    writeJSON(localStorage, KEYS.FORECASTS, all)
  },
  removeByCompany: (companyId) => {
    const all = forecastStorage.getAll().filter((f) => f.companyId !== companyId)
    writeJSON(localStorage, KEYS.FORECASTS, all)
  },
}

// ---------------------------------------------------------------------------
// inventoryStorage — cached, computed inventory snapshots per company so the
// Admin company-detail view and Reports can show inventory without forcing a
// recompute. { companyId, computedAt, rows }
// ---------------------------------------------------------------------------
export const inventoryStorage = {
  getAll: () => readJSON(localStorage, KEYS.INVENTORY, []),
  getByCompany: (companyId) => inventoryStorage.getAll().find((s) => s.companyId === companyId) || null,
  set: (companyId, rows) => {
    const all = inventoryStorage.getAll().filter((s) => s.companyId !== companyId)
    const snapshot = { companyId, computedAt: new Date().toISOString(), rows }
    all.push(snapshot)
    writeJSON(localStorage, KEYS.INVENTORY, all)
    return snapshot
  },
  removeByCompany: (companyId) => {
    const all = inventoryStorage.getAll().filter((s) => s.companyId !== companyId)
    writeJSON(localStorage, KEYS.INVENTORY, all)
  },
}

// ---------------------------------------------------------------------------
// reportStorage — generated report snapshots.
// Each record: { id, companyId, companyName, generatedAt, ...summaryFields }
// ---------------------------------------------------------------------------
export const reportStorage = {
  getAll: () => readJSON(localStorage, KEYS.REPORTS, []),
  getByCompany: (companyId) => reportStorage.getAll().filter((r) => r.companyId === companyId),
  save: (report) => {
    const all = reportStorage.getAll()
    all.push(report)
    writeJSON(localStorage, KEYS.REPORTS, all)
    return report
  },
  remove: (id) => {
    const all = reportStorage.getAll().filter((r) => r.id !== id)
    writeJSON(localStorage, KEYS.REPORTS, all)
  },
  removeByCompany: (companyId) => {
    const all = reportStorage.getAll().filter((r) => r.companyId !== companyId)
    writeJSON(localStorage, KEYS.REPORTS, all)
  },
}

// ---------------------------------------------------------------------------
// One-time seed so there's an Admin account to log in with on a fresh
// browser (there is no backend to pre-provision one otherwise). Only ever
// runs once — after that the Admin can be managed like any other account.
// ---------------------------------------------------------------------------
export function ensureSeedAdmin() {
  if (readJSON(localStorage, KEYS.SEEDED, false)) return
  if (!companyStorage.findByEmail('admin@forecastai.com')) {
    companyStorage.save({
      id: genId('company'),
      companyName: 'ForecastAI HQ',
      userName: 'Admin User',
      email: 'admin@forecastai.com',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
      registeredAt: new Date().toISOString(),
      status: 'Active',
    })
  }
  writeJSON(localStorage, KEYS.SEEDED, true)
}
