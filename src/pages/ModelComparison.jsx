import React, { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import Layout from '../components/Layout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { datasetStorage } from '../utils/storage.js'
import { scopedRows, getProductMonthlySeries, movingAverageForecast, linearRegressionForecast } from '../utils/dataEngine.js'
import './Dashboard.css'
import './Forecast.css'

const PERIOD = 6

export default function ModelComparison({ auth, onLogout }) {
  const rows = useMemo(() => scopedRows(datasetStorage.getAll(), auth), [auth])
  const products = useMemo(() => [...new Set(rows.map((r) => r.product))].sort(), [rows])

  const [product, setProduct] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!product && products.length) setProduct(products[0])
  }, [products, product])

  const handleCompare = () => {
    if (!product) return
    const series = getProductMonthlySeries(rows, product)
    const prophet = movingAverageForecast(series, PERIOD)
    const arima = linearRegressionForecast(series, PERIOD)
    setResult({ series, prophet, arima })
  }

  const chartData = result
    ? [
        ...result.series.map((s) => ({ label: s.month, actual: s.sales })),
        ...result.prophet.points.map((p, i) => ({
          label: p.period,
          prophet: p.value,
          arima: result.arima.points[i]?.value,
        })),
      ]
    : []

  return (
    <Layout title="Model Comparison" auth={auth} onLogout={onLogout}>
      <div className="dashboard-header-row">
        <div className="dashboard-greeting">
          <h2>Model Comparison</h2>
          <p>Compare Prophet-style and ARIMA-style forecasts side by side for the same product.</p>
        </div>
      </div>

      {products.length ? (
        <>
          <div className="dashboard-card mb-3">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-6">
                <label className="form-label-custom">Product</label>
                <select className="form-select" value={product} onChange={(e) => setProduct(e.target.value)}>
                  {products.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-3">
                <button className="btn-upload w-100" onClick={handleCompare} type="button">
                  <i className="bi bi-bar-chart-steps" /> Compare
                </button>
              </div>
            </div>
          </div>

          {result ? (
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h5>{product} — {PERIOD} Month Comparison</h5>
              </div>

              {result.prophet.points.length ? (
                <>
                  <div className="recommended-banner">
                    <i className="bi bi-award-fill" />
                    Recommended Model:{' '}
                    <strong>{result.prophet.accuracy >= result.arima.accuracy ? 'Prophet' : 'ARIMA'}</strong>
                    <span className="text-secondary" style={{ fontWeight: 400 }}>
                      {' '}— higher backtested accuracy for {product}
                    </span>
                  </div>

                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="actual" name="Historical" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="prophet" name="Prophet" stroke="#2563eb" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="arima" name="ARIMA" stroke="#16a34a" strokeWidth={3} strokeDasharray="2 3" dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="table-responsive-card" style={{ marginTop: '1.2rem' }}>
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th>Accuracy</th>
                          <th>MAE</th>
                          <th>RMSE</th>
                          <th>{PERIOD}-Month Total</th>
                          <th>Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <span className="model-badge">Prophet</span>
                          </td>
                          <td className="accuracy-cell">{result.prophet.accuracy}%</td>
                          <td>{result.prophet.mae}</td>
                          <td>{result.prophet.rmse}</td>
                          <td>{result.prophet.points.reduce((s, p) => s + p.value, 0).toLocaleString()}</td>
                          <td>
                            {result.prophet.accuracy >= result.arima.accuracy ? (
                              <span className="badge-status ok">Recommended</span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <span className="model-badge">ARIMA</span>
                          </td>
                          <td className="accuracy-cell">{result.arima.accuracy}%</td>
                          <td>{result.arima.mae}</td>
                          <td>{result.arima.rmse}</td>
                          <td>{result.arima.points.reduce((s, p) => s + p.value, 0).toLocaleString()}</td>
                          <td>
                            {result.arima.accuracy > result.prophet.accuracy ? (
                              <span className="badge-status ok">Recommended</span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon="bi-bar-chart-steps"
                  title="Not enough history"
                  message="This product needs at least two months of sales history to compare models."
                />
              )}
            </div>
          ) : (
            <div className="dashboard-card">
              <EmptyState icon="bi-bar-chart-steps" title="No comparison yet" message="Choose a product and click Compare." />
            </div>
          )}
        </>
      ) : (
        <div className="dashboard-card">
          <EmptyState icon="bi-bar-chart-steps" title="No records found" message="Upload a dataset first to compare forecasting models." />
        </div>
      )}
    </Layout>
  )
}
