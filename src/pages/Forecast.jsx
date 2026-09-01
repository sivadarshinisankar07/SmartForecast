import React, { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

import Layout from '../components/Layout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { datasetStorage, forecastStorage, genId } from '../utils/storage.js'
import {
  scopedRows,
  scopedDatasets,
  getProductMonthlySeries,
  runForecast,
  monthsBetween,
} from '../utils/dataEngine.js'
import { FORECAST_MODELS, FORECAST_PERIODS } from '../data/mockData.js'
import './Dashboard.css'
import './Forecast.css'

export default function Forecast({ auth, onLogout }) {
  const allDatasets = datasetStorage.getAll()
  const rows = useMemo(() => scopedRows(allDatasets, auth), [allDatasets, auth])
  const dataset = useMemo(() => scopedDatasets(allDatasets, auth)[0] || null, [allDatasets, auth])
  const products = useMemo(() => [...new Set(rows.map((r) => r.product))].sort(), [rows])

  const defaultPeriod = dataset?.forecastFrom && dataset?.forecastTo
    ? monthsBetween(dataset.forecastFrom, dataset.forecastTo)
    : 6

  const [product, setProduct] = useState('')
  const [model, setModel] = useState('prophet')
  const [period, setPeriod] = useState(defaultPeriod)
  const [result, setResult] = useState(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!product && products.length) setProduct(products[0])
  }, [products, product])

  const handleGenerate = () => {
    if (!product) return
    const series = getProductMonthlySeries(rows, product)
    const engineResult = runForecast(model, series, period)
    setResult({ series, ...engineResult })
    setSaved(false)
  }

  const handleSave = () => {
    if (!result) return
    forecastStorage.save({
      id: genId('fc'),
      companyId: auth.companyId,
      companyName: auth.companyName,
      product,
      model: model === 'prophet' ? 'Prophet' : 'ARIMA',
      period: `${period} Months`,
      accuracy: result.accuracy,
      mae: result.mae,
      rmse: result.rmse,
      generatedAt: new Date().toISOString(),
    })
    setSaved(true)
  }

  const chartData = result
    ? [
        ...result.series.map((s) => ({ label: s.month, actual: s.sales })),
        ...result.points.map((p) => ({ label: p.period, forecast: p.value })),
      ]
    : []

  return (
    <Layout title="Forecast" auth={auth} onLogout={onLogout}>
      <div className="dashboard-header-row">
        <div className="dashboard-greeting">
          <h2>Demand Forecasting</h2>
          <p>
            Generate a forward-looking forecast from your uploaded sales history.
            {dataset?.forecastFrom && dataset?.forecastTo && (
              <>
                {' '}Configured period:{' '}
                <strong>
                  {new Date(dataset.forecastFrom).toLocaleDateString()} – {new Date(dataset.forecastTo).toLocaleDateString()}
                </strong>
              </>
            )}
          </p>
        </div>
      </div>

      {products.length ? (
        <>
          <div className="dashboard-card mb-3">
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label-custom">Product</label>
                <select className="form-select" value={product} onChange={(e) => setProduct(e.target.value)}>
                  {products.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label-custom">Forecast Model</label>
                <select className="form-select" value={model} onChange={(e) => setModel(e.target.value)}>
                  {FORECAST_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label-custom">Period</label>
                <select className="form-select" value={period} onChange={(e) => setPeriod(Number(e.target.value))}>
                  {[...new Set([...FORECAST_PERIODS, defaultPeriod])].sort((a, b) => a - b).map((p) => (
                    <option key={p} value={p}>
                      {p} Months
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-2">
                <button className="btn-upload w-100" onClick={handleGenerate} type="button">
                  <i className="bi bi-magic" /> Generate
                </button>
              </div>
            </div>
          </div>

          {result ? (
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h5>{product} — Forecast Result</h5>
                {result.points.length > 0 && <span className="accuracy-cell">{result.accuracy}% accuracy</span>}
              </div>

              {result.points.length ? (
                <>
                  <ResponsiveContainer width="100%" height={320}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="actual" name="Historical" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} connectNulls />
                      <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>

                  <div className="row g-3 mt-1 mb-2">
                    <div className="col-6 col-md-3">
                      <div className="text-secondary" style={{ fontSize: '0.78rem' }}>Total Forecast Demand</div>
                      <div style={{ fontWeight: 700 }}>{result.points.reduce((s, p) => s + p.value, 0).toLocaleString()} units</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="text-secondary" style={{ fontSize: '0.78rem' }}>MAE</div>
                      <div style={{ fontWeight: 700 }}>{result.mae}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="text-secondary" style={{ fontSize: '0.78rem' }}>RMSE</div>
                      <div style={{ fontWeight: 700 }}>{result.rmse}</div>
                    </div>
                    <div className="col-6 col-md-3">
                      <div className="text-secondary" style={{ fontSize: '0.78rem' }}>Forecast Period</div>
                      <div style={{ fontWeight: 700 }}>{period} Months</div>
                    </div>
                  </div>

                  <button className="btn-upload" onClick={handleSave} type="button" disabled={saved}>
                    <i className={`bi ${saved ? 'bi-check2' : 'bi-save'}`} />
                    {saved ? 'Saved to History' : 'Save Forecast'}
                  </button>
                </>
              ) : (
                <EmptyState icon="bi-graph-up" title="Not enough history" message="This product needs at least two months of sales history to forecast." />
              )}
            </div>
          ) : (
            <div className="dashboard-card">
              <EmptyState icon="bi-magic" title="No forecast yet" message="Choose a product and model, then click Generate." />
            </div>
          )}
        </>
      ) : (
        <div className="dashboard-card">
          <EmptyState icon="bi-graph-up" title="No records found" message="Upload a dataset first to generate demand forecasts." />
        </div>
      )}
    </Layout>
  )
}
