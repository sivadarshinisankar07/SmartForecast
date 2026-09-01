import React, { useMemo, useState } from 'react'

import Layout from '../components/Layout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { forecastStorage } from '../utils/storage.js'
import './Dashboard.css'
import './Dataset.css'

export default function ForecastHistory({ auth, onLogout }) {
  const [, forceRefresh] = useState(0)

  const forecasts = useMemo(() => {
    const all = forecastStorage.getAll()
    return (auth.role === 'admin' ? all : all.filter((f) => f.companyId === auth.companyId))
      .slice()
      .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, forceRefresh])

  const handleDelete = (id) => {
    if (!window.confirm('Delete this saved forecast?')) return
    forecastStorage.remove(id)
    forceRefresh((n) => n + 1)
  }

  return (
    <Layout title="Forecast History" auth={auth} onLogout={onLogout}>
      <div className="dashboard-header-row">
        <div className="dashboard-greeting">
          <h2>Forecast History</h2>
          <p>Every forecast you&apos;ve generated and saved, most recent first.</p>
        </div>
      </div>

      <div className="dashboard-card">
        {forecasts.length ? (
          <div className="table-responsive-card">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Product</th>
                  {auth.role === 'admin' && <th>Company</th>}
                  <th>Model</th>
                  <th>Forecast Period</th>
                  <th>Accuracy</th>
                  <th>Generated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f) => (
                  <tr key={f.id}>
                    <td>{f.product}</td>
                    {auth.role === 'admin' && <td>{f.companyName}</td>}
                    <td>
                      <span className="model-badge">{f.model}</span>
                    </td>
                    <td>{f.period}</td>
                    <td className="accuracy-cell">{f.accuracy}%</td>
                    <td>{new Date(f.generatedAt).toLocaleDateString()}</td>
                    <td>
                      <button className="link-danger" onClick={() => handleDelete(f.id)} title="Delete forecast">
                        <i className="bi bi-trash3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="bi-clock-history"
            title="No records found"
            message="Forecasts you save from the Forecast page will show up here."
          />
        )}
      </div>
    </Layout>
  )
}
