import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'

import StatCard from './StatCard.jsx'
import EmptyState from './EmptyState.jsx'
import {
  computeKPIs,
  computeSalesTrend,
  computeInventoryStatus,
  computeTopProducts,
  computeLowStockAlerts,
} from '../utils/dataEngine.js'

function SalesTrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div style={{ background: '#0f172a', color: '#fff', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>
      <div style={{ opacity: 0.7, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{payload[0].value.toLocaleString()} units</div>
    </div>
  )
}

// Shared analytics block — KPI cards + sales trend + inventory split + top
// products + low-stock alerts + recent forecasts. Used by the Company
// Dashboard (own scoped data) and the Admin company-detail view (read-only,
// another company's scoped data), so the numbers and charts stay identical
// wherever they're viewed from.
export default function CompanyAnalytics({
  rows,
  forecasts,
  hasDatasets,
  showActions = true,
  onUpload,
  onViewInventory,
  onViewHistory,
}) {
  const kpis = useMemo(() => computeKPIs(rows, forecasts), [rows, forecasts])
  const salesTrend = useMemo(() => computeSalesTrend(rows), [rows])
  const inventoryStatus = useMemo(() => computeInventoryStatus(rows), [rows])
  const topProducts = useMemo(() => computeTopProducts(rows), [rows])
  const lowStockAlerts = useMemo(() => computeLowStockAlerts(rows), [rows])
  const recentForecasts = useMemo(
    () => forecasts.slice().sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)).slice(0, 5),
    [forecasts]
  )

  const kpiCards = [
    {
      id: 'total-sales',
      label: 'Total Sales',
      value: kpis.totalSales.toLocaleString(),
      change: rows.length ? 'Live' : '—',
      changeType: 'up',
      footnote: rows.length ? 'from uploaded data' : '',
      icon: 'bi-graph-up-arrow',
      accent: 'primary',
    },
    {
      id: 'total-products',
      label: 'Total Products',
      value: String(kpis.totalProducts),
      change: rows.length ? 'Tracked' : '—',
      changeType: 'up',
      footnote: '',
      icon: 'bi-box-seam',
      accent: 'primary',
    },
    {
      id: 'low-stock',
      label: 'Low Stock Items',
      value: String(kpis.lowStockCount),
      change: rows.length ? (kpis.lowStockCount > 0 ? 'Needs Attention' : 'All Good') : '—',
      changeType: kpis.lowStockCount > 0 ? 'warning' : 'up',
      footnote: '',
      icon: 'bi-exclamation-triangle',
      accent: 'warning',
    },
    {
      id: 'forecast-accuracy',
      label: 'Forecast Accuracy',
      value: kpis.forecastAccuracy ? `${kpis.forecastAccuracy.toFixed(1)}%` : '—',
      change: kpis.forecastAccuracy ? 'Avg. of saved forecasts' : 'No forecasts yet',
      changeType: 'up',
      footnote: '',
      icon: 'bi-bullseye',
      accent: 'success',
    },
  ]

  return (
    <>
      <div className="row g-3 kpi-row">
        {kpiCards.map((kpi) => (
          <div className="col-12 col-sm-6 col-xl-3" key={kpi.id}>
            <StatCard {...kpi} />
          </div>
        ))}
      </div>

      <div className="row g-3 charts-row">
        <div className="col-12 col-xl-8">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h5>Sales Trend</h5>
              {salesTrend.length > 0 && (
                <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                  {salesTrend[0].month} – {salesTrend[salesTrend.length - 1].month}
                </span>
              )}
            </div>
            {salesTrend.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesTrend} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip content={<SalesTrendTooltip />} />
                  <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon="bi-graph-up"
                title="No records found"
                message="Upload a dataset to see the sales trend here."
                actionLabel={showActions && !hasDatasets ? 'Upload Dataset' : undefined}
                onAction={onUpload}
              />
            )}
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h5>Inventory Status</h5>
            </div>
            {inventoryStatus.length ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={inventoryStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} stroke="none">
                      {inventoryStatus.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="inventory-legend">
                  {inventoryStatus.map((entry) => (
                    <div className="inventory-legend-item" key={entry.name}>
                      <span className="legend-dot" style={{ background: entry.color }} />
                      <span className="legend-label">{entry.name}</span>
                      <span className="legend-value">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState icon="bi-boxes" title="No records found" message="Stock data will appear once a dataset with inventory columns is uploaded." />
            )}
          </div>
        </div>
      </div>

      <div className="row g-3 bottom-row">
        <div className="col-12 col-xl-5">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h5>Top Selling Products</h5>
            </div>
            {topProducts.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 12, fill: '#0f172a' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value) => [`${value.toLocaleString()} units`, 'Sold']} />
                  <Bar dataKey="units" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon="bi-bar-chart" title="No records found" message="Top products appear once sales data is uploaded." />
            )}
          </div>
        </div>

        <div className="col-12 col-xl-7">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h5>Low Stock Alerts</h5>
              {showActions && lowStockAlerts.length > 0 && (
                <a href="#!" className="card-link" onClick={(e) => { e.preventDefault(); onViewInventory?.() }}>
                  View All
                </a>
              )}
            </div>
            {lowStockAlerts.length ? (
              <div className="table-responsive-card">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Current Stock</th>
                      <th>Minimum Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockAlerts.map((row) => (
                      <tr key={row.product}>
                        <td>{row.product}</td>
                        <td className="stock-cell">{row.currentStock}</td>
                        <td>{row.minStock}</td>
                        <td>
                          <span className={`badge-status ${row.status === 'Out of Stock' ? 'danger' : 'low'}`}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="bi-check2-circle" title="No records found" message={rows.length ? 'No low-stock alerts right now.' : 'Alerts appear once a dataset is uploaded.'} />
            )}
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12">
          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h5>Recent Forecasts</h5>
              {showActions && recentForecasts.length > 0 && (
                <a href="#!" className="card-link" onClick={(e) => { e.preventDefault(); onViewHistory?.() }}>
                  View All
                </a>
              )}
            </div>
            {recentForecasts.length ? (
              <div className="table-responsive-card">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Model</th>
                      <th>Forecast Period</th>
                      <th>Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentForecasts.map((row) => (
                      <tr key={row.id}>
                        <td>{row.product}</td>
                        <td><span className="model-badge">{row.model}</span></td>
                        <td>{row.period}</td>
                        <td className="accuracy-cell">{row.accuracy}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon="bi-clock-history"
                title={hasDatasets ? 'No Forecast Available' : 'No records found'}
                message={
                  hasDatasets
                    ? 'Forecast data will appear here after this company generates a forecast.'
                    : 'Forecast data will appear here after a dataset is uploaded and a forecast is generated.'
                }
                actionLabel={showActions && rows.length ? 'Go to Forecast' : undefined}
                onAction={onViewHistory}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
