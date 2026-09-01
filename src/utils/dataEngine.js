// ---------------------------------------------------------------------------
// dataEngine.js
// Turns raw uploaded rows into everything the UI needs: scoping by
// company (via companyId), KPI aggregation, chart-ready series, and a
// lightweight client-side forecasting engine (moving-average "Prophet-style"
// and linear-regression "ARIMA-style") that stands in for real Python models
// until the Flask backend exists. These are NOT the actual Prophet/ARIMA
// algorithms — just simple, explainable approximations so the UI has
// something real to render. Every function here is pure (no side effects).
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function parseDate(value) {
  const dt = new Date(value)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function monthKey(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [y, m] = key.split('-')
  return `${MONTH_NAMES[Number(m) - 1]} ${y.slice(2)}`
}

// -------------------------------------------------------------------------
// Scoping — Admin sees every company's data, Customer sees only their own.
// Scoped strictly by companyId (never by name) so two companies can never
// collide even if they share a display name.
// -------------------------------------------------------------------------

export function scopedDatasets(allDatasets, auth) {
  if (!auth) return []
  if (auth.role === 'admin') return allDatasets
  return allDatasets.filter((d) => d.companyId === auth.companyId)
}

export function scopedRows(allDatasets, auth) {
  return scopedDatasets(allDatasets, auth).flatMap((d) =>
    d.rows.map((r) => ({ ...r, companyId: d.companyId, datasetId: d.id }))
  )
}

export function rowsForCompany(allDatasets, companyId) {
  return allDatasets
    .filter((d) => d.companyId === companyId)
    .flatMap((d) => d.rows.map((r) => ({ ...r, companyId: d.companyId, datasetId: d.id })))
}

// -------------------------------------------------------------------------
// KPIs and chart aggregations
// -------------------------------------------------------------------------

export function latestStockByProduct(rows) {
  const map = {}
  rows.forEach((r) => {
    const dt = parseDate(r.date)
    const existing = map[r.product]
    if (!existing || (dt && (!existing._dt || dt > existing._dt))) {
      map[r.product] = {
        product: r.product,
        currentStock: Number(r.stock) || 0,
        minStock: Number(r.minStock) || 0,
        _dt: dt,
      }
    }
  })
  return map
}

export function computeKPIs(rows, forecasts) {
  if (!rows.length) {
    return { totalSales: 0, totalProducts: 0, lowStockCount: 0, forecastAccuracy: null }
  }
  const totalSales = rows.reduce((sum, r) => sum + (Number(r.units) || 0), 0)
  const products = new Set(rows.map((r) => r.product))
  const latest = Object.values(latestStockByProduct(rows))
  const lowStockCount = latest.filter((p) => p.currentStock <= p.minStock).length
  const forecastAccuracy = forecasts && forecasts.length
    ? forecasts.reduce((s, f) => s + f.accuracy, 0) / forecasts.length
    : null
  return { totalSales, totalProducts: products.size, lowStockCount, forecastAccuracy }
}

export function computeSalesTrend(rows) {
  const byMonth = {}
  rows.forEach((r) => {
    const dt = parseDate(r.date)
    if (!dt) return
    const key = monthKey(dt)
    byMonth[key] = (byMonth[key] || 0) + (Number(r.units) || 0)
  })
  return Object.entries(byMonth)
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([key, sales]) => ({ month: monthLabel(key), sales }))
}

export function computeInventoryStatus(rows) {
  const latest = Object.values(latestStockByProduct(rows))
  if (!latest.length) return []
  let inStock = 0
  let low = 0
  let out = 0
  latest.forEach((p) => {
    if (p.currentStock <= 0) out += 1
    else if (p.currentStock <= p.minStock) low += 1
    else inStock += 1
  })
  const total = latest.length
  return [
    { name: 'In Stock', value: Math.round((inStock / total) * 100), color: '#2563EB' },
    { name: 'Low Stock', value: Math.round((low / total) * 100), color: '#F59E0B' },
    { name: 'Out of Stock', value: Math.round((out / total) * 100), color: '#DC2626' },
  ]
}

export function computeTopProducts(rows, limit = 5) {
  const map = {}
  rows.forEach((r) => {
    map[r.product] = (map[r.product] || 0) + (Number(r.units) || 0)
  })
  return Object.entries(map)
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, limit)
}

export function computeLowStockAlerts(rows) {
  const latest = Object.values(latestStockByProduct(rows))
  return latest
    .filter((p) => p.currentStock <= p.minStock)
    .map((p) => ({
      product: p.product,
      currentStock: p.currentStock,
      minStock: p.minStock,
      status: p.currentStock <= 0 ? 'Out of Stock' : 'Low Stock',
    }))
    .sort((a, b) => a.currentStock - b.currentStock)
}

// -------------------------------------------------------------------------
// Forecasting engine (mock, runs entirely client-side — NOT real Prophet or
// ARIMA, just simple approximations sharing their names conceptually until
// the Flask + Python backend exists).
// -------------------------------------------------------------------------

export function getProductMonthlySeries(rows, product) {
  return computeSalesTrend(rows.filter((r) => r.product === product))
}

function leastSquares(values) {
  const n = values.length
  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean)
    den += (x - xMean) ** 2
  })
  const slope = den === 0 ? 0 : num / den
  const intercept = yMean - slope * xMean
  return { slope, intercept }
}

function estimateGrowthRate(values) {
  if (values.length < 2) return 0
  const rates = []
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] > 0) rates.push((values[i] - values[i - 1]) / values[i - 1])
  }
  if (!rates.length) return 0
  const avg = rates.reduce((a, b) => a + b, 0) / rates.length
  return Math.max(-0.3, Math.min(0.3, avg))
}

// Backtests a method against the tail of the known series and returns
// accuracy (0-100), MAE (mean absolute error, in units) and RMSE (root mean
// squared error, in units) — the same three metrics a real model comparison
// would report, just computed against a simple stand-in model for now.
function backtest(values, method) {
  if (values.length < 4) return { accuracy: 80, mae: 0, rmse: 0 }
  const testSize = Math.min(3, Math.floor(values.length / 3)) || 1
  const absErrors = []
  const sqErrors = []
  const pctErrors = []
  for (let i = values.length - testSize; i < values.length; i += 1) {
    const train = values.slice(0, i)
    let predicted
    if (method === 'ma') {
      const window = Math.min(3, train.length)
      const recent = train.slice(-window)
      predicted = recent.reduce((a, b) => a + b, 0) / recent.length
    } else {
      const { slope, intercept } = leastSquares(train)
      predicted = slope * train.length + intercept
    }
    const actual = values[i]
    const err = actual - predicted
    absErrors.push(Math.abs(err))
    sqErrors.push(err * err)
    if (actual > 0) pctErrors.push(Math.abs(err / actual))
  }
  const mae = Math.round((absErrors.reduce((a, b) => a + b, 0) / absErrors.length) * 10) / 10
  const rmse = Math.round(Math.sqrt(sqErrors.reduce((a, b) => a + b, 0) / sqErrors.length) * 10) / 10
  const mape = pctErrors.length ? pctErrors.reduce((a, b) => a + b, 0) / pctErrors.length : 0.2
  const accuracy = Math.max(50, Math.min(98, Math.round((1 - mape) * 100)))
  return { accuracy, mae, rmse }
}

// "Prophet-style": trailing moving average projected forward using the
// series' average month-over-month growth rate.
export function movingAverageForecast(series, periods) {
  const values = series.map((s) => s.sales)
  if (values.length < 2) return { points: [], accuracy: 0, mae: 0, rmse: 0 }
  const window = Math.min(3, values.length)
  const growth = estimateGrowthRate(values)
  let base = values.slice(-window).reduce((a, b) => a + b, 0) / window
  const points = []
  for (let i = 1; i <= periods; i += 1) {
    base *= 1 + growth
    points.push({ period: `M+${i}`, value: Math.max(0, Math.round(base)) })
  }
  return { points, ...backtest(values, 'ma') }
}

// "ARIMA-style": ordinary least-squares linear regression over the series,
// extrapolated forward.
export function linearRegressionForecast(series, periods) {
  const values = series.map((s) => s.sales)
  if (values.length < 2) return { points: [], accuracy: 0, mae: 0, rmse: 0 }
  const { slope, intercept } = leastSquares(values)
  const points = []
  for (let i = 1; i <= periods; i += 1) {
    const x = values.length - 1 + i
    points.push({ period: `M+${i}`, value: Math.max(0, Math.round(slope * x + intercept)) })
  }
  return { points, ...backtest(values, 'lr') }
}

export function runForecast(model, series, periods) {
  return model === 'arima' ? linearRegressionForecast(series, periods) : movingAverageForecast(series, periods)
}

// Given a full row-set, returns { product: totalForecastDemandOverPeriod }
// using the default (Prophet-style) model — used by the Inventory page to
// suggest reorder quantities without forcing a trip to the Forecast page.
export function computeForecastDemandByProduct(rows, periods = 3) {
  const products = [...new Set(rows.map((r) => r.product))]
  const map = {}
  products.forEach((p) => {
    const series = getProductMonthlySeries(rows, p)
    const { points } = movingAverageForecast(series, periods)
    map[p] = points.reduce((sum, pt) => sum + pt.value, 0)
  })
  return map
}

// Number of whole months between two ISO date strings (inclusive-ish),
// clamped to a sane 1-24 range for use as a forecast horizon.
export function monthsBetween(fromISO, toISO) {
  if (!fromISO || !toISO) return 3
  const from = new Date(fromISO)
  const to = new Date(toISO)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 3
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1
  return Math.max(1, Math.min(24, months))
}
