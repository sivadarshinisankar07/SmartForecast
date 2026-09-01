import React, { useMemo, useState } from 'react'

import Layout from '../components/Layout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import StatCard from '../components/StatCard.jsx'
import { datasetStorage, forecastStorage, reportStorage, genId } from '../utils/storage.js'
import {
  scopedRows,
  scopedDatasets,
  computeKPIs,
  computeTopProducts,
  computeLowStockAlerts,
  computeSalesTrend,
  movingAverageForecast,
  linearRegressionForecast,
  monthsBetween,
} from '../utils/dataEngine.js'
import './Dashboard.css'

export default function Reports({ auth, onLogout }) {
  const [, forceRefresh] = useState(0)
  const allDatasets = datasetStorage.getAll()

  const rows = useMemo(() => scopedRows(allDatasets, auth), [allDatasets, auth])
  const dataset = useMemo(() => scopedDatasets(allDatasets, auth)[0] || null, [allDatasets, auth])
  const forecasts = useMemo(
    () => forecastStorage.getAll().filter((f) => f.companyId === auth.companyId),
    [auth]
  )
  const previousReports = useMemo(
    () => reportStorage.getByCompany(auth.companyId).sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth, forceRefresh]
  )

  const kpis = useMemo(() => computeKPIs(rows, forecasts), [rows, forecasts])
  const topProducts = useMemo(() => computeTopProducts(rows, 10), [rows])
  const lowStock = useMemo(() => computeLowStockAlerts(rows), [rows])
  const hasData = rows.length > 0

  // A whole-portfolio (all products combined) model comparison, computed on
  // demand so a report can always recommend a model even if the user never
  // visited the Forecast/Comparison pages.
  const overallComparison = useMemo(() => {
    if (!rows.length) return null
    const series = computeSalesTrend(rows)
    const periods = dataset?.forecastFrom && dataset?.forecastTo ? monthsBetween(dataset.forecastFrom, dataset.forecastTo) : 6
    const prophet = movingAverageForecast(series, periods)
    const arima = linearRegressionForecast(series, periods)
    const recommended = prophet.accuracy >= arima.accuracy ? 'Prophet' : 'ARIMA'
    return { prophet, arima, recommended, periods }
  }, [rows, dataset])

  const handleGenerateReport = () => {
    if (!hasData) return
    const report = {
      id: genId('rpt'),
      companyId: auth.companyId,
      companyName: auth.companyName,
      datasetName: dataset?.fileName || 'N/A',
      forecastPeriod: dataset?.forecastFrom && dataset?.forecastTo
        ? `${new Date(dataset.forecastFrom).toLocaleDateString()} – ${new Date(dataset.forecastTo).toLocaleDateString()}`
        : 'Not configured',
      totalProducts: kpis.totalProducts,
      totalSales: kpis.totalSales,
      lowStockCount: kpis.lowStockCount,
      lowStockProducts: lowStock.map((p) => p.product),
      recommendedModel: overallComparison?.recommended || 'N/A',
      recommendedModelAccuracy: overallComparison
        ? Math.max(overallComparison.prophet.accuracy, overallComparison.arima.accuracy)
        : null,
      forecastAccuracy: kpis.forecastAccuracy,
      recommendedActions: lowStock.map((p) => `Reorder ${p.product} (${p.currentStock}/${p.minStock} in stock)`),
      generatedAt: new Date().toISOString(),
    }
    reportStorage.save(report)
    forceRefresh((n) => n + 1)
  }

  const handleDownload = (report) => {
    const lines = []
    lines.push('ForecastAI Summary Report')
    lines.push(`Company,${report.companyName}`)
    lines.push(`Dataset,${report.datasetName}`)
    lines.push(`Forecast Period,${report.forecastPeriod}`)
    lines.push(`Generated,${report.generatedAt}`)
    lines.push('')
    lines.push('Total Sales,' + report.totalSales)
    lines.push('Total Products,' + report.totalProducts)
    lines.push('Low Stock Items,' + report.lowStockCount)
    lines.push('Recommended Model,' + report.recommendedModel)
    lines.push('Recommended Model Accuracy,' + (report.recommendedModelAccuracy ? `${report.recommendedModelAccuracy}%` : 'N/A'))
    lines.push('Avg Forecast Accuracy,' + (report.forecastAccuracy ? `${report.forecastAccuracy.toFixed(1)}%` : 'N/A'))
    lines.push('')
    lines.push('Top Products,Units Sold')
    topProducts.forEach((p) => lines.push(`${p.name},${p.units}`))
    lines.push('')
    lines.push('Recommended Actions')
    report.recommendedActions.forEach((a) => lines.push(a))

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `forecastai-report-${report.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Layout title="Reports" auth={auth} onLogout={onLogout}>
      <div className="dashboard-header-row">
        <div className="dashboard-greeting">
          <h2>Reports</h2>
          <p>Generate a full summary of sales, inventory and forecasting performance.</p>
        </div>
        <button className="btn-upload" onClick={handleGenerateReport} type="button" disabled={!hasData}>
          <i className="bi bi-file-earmark-plus" /> Generate Report
        </button>
      </div>

      {hasData ? (
        <>
          <div className="row g-3 kpi-row">
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard label="Total Sales" value={kpis.totalSales.toLocaleString()} change="Live" changeType="up" footnote="" icon="bi-graph-up-arrow" accent="primary" />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard label="Total Products" value={String(kpis.totalProducts)} change="Tracked" changeType="up" footnote="" icon="bi-box-seam" accent="primary" />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                label="Low Stock Items"
                value={String(kpis.lowStockCount)}
                change={kpis.lowStockCount ? 'Needs Attention' : 'All Good'}
                changeType={kpis.lowStockCount ? 'warning' : 'up'}
                footnote=""
                icon="bi-exclamation-triangle"
                accent="warning"
              />
            </div>
            <div className="col-12 col-sm-6 col-xl-3">
              <StatCard
                label="Recommended Model"
                value={overallComparison?.recommended || '—'}
                change={overallComparison ? `${Math.max(overallComparison.prophet.accuracy, overallComparison.arima.accuracy)}% accuracy` : 'No data'}
                changeType="up"
                footnote=""
                icon="bi-bullseye"
                accent="success"
              />
            </div>
          </div>

          <div className="dashboard-card mb-3">
            <div className="dashboard-card-header">
              <h5>Top Products (included in report)</h5>
            </div>
            <div className="table-responsive-card">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Units Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.units.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h5>Generated Reports</h5>
            </div>
            {previousReports.length ? (
              <div className="table-responsive-card">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Generated</th>
                      <th>Forecast Period</th>
                      <th>Recommended Model</th>
                      <th>Low Stock Items</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {previousReports.map((r) => (
                      <tr key={r.id}>
                        <td>{new Date(r.generatedAt).toLocaleString()}</td>
                        <td>{r.forecastPeriod}</td>
                        <td>
                          <span className="model-badge">{r.recommendedModel}</span>
                        </td>
                        <td>{r.lowStockCount}</td>
                        <td>
                          <button className="link-danger" onClick={() => handleDownload(r)} title="Download CSV" style={{ color: 'var(--color-primary)' }}>
                            <i className="bi bi-download" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState icon="bi-file-earmark-bar-graph" title="No records found" message="Click Generate Report above to create your first report." />
            )}
          </div>
        </>
      ) : (
        <div className="dashboard-card">
          <EmptyState icon="bi-file-earmark-bar-graph" title="No records found" message="Upload a dataset first to generate a report." />
        </div>
      )}
    </Layout>
  )
}
