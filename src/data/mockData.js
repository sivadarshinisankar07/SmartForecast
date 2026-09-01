// ---------------------------------------------------------------------------
// mockData.js
// NOTE: This file used to hold pre-seeded dashboard numbers (sales trend,
// KPIs, low-stock rows, etc.). Those are gone -- every page now computes its
// numbers live from whatever the user has actually uploaded, via
// src/utils/dataEngine.js and src/utils/storage.js. This file now only holds
// small, non-data configuration used by form controls.
// ---------------------------------------------------------------------------

export const FORECAST_MODELS = [
  { id: 'prophet', label: 'Prophet (Trend + Seasonality)' },
  { id: 'arima', label: 'ARIMA (Regression-based)' },
]

export const FORECAST_PERIODS = [3, 6, 12]

// Columns ForecastAI expects when mapping an uploaded CSV.
export const DATASET_FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'product', label: 'Product', required: true },
  { key: 'units', label: 'Units Sold', required: true },
  { key: 'stock', label: 'Current Stock', required: false },
  { key: 'minStock', label: 'Minimum Stock', required: false },
]

// Roles offered at registration. Most people signing their business up
// should pick "Company Customer" — Admin is for ForecastAI's own operators.
export const USER_ROLES = [
  { id: 'customer', label: 'Company Customer' },
  { id: 'admin', label: 'Admin' },
]
