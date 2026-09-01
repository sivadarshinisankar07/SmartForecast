import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import Layout from '../components/Layout.jsx'
import CompanyAnalytics from '../components/CompanyAnalytics.jsx'
import { datasetStorage, forecastStorage } from '../utils/storage.js'
import { scopedDatasets, scopedRows } from '../utils/dataEngine.js'
import './Dashboard.css'

export default function Dashboard({ auth, onLogout }) {
  const navigate = useNavigate()

  const allDatasets = datasetStorage.getAll()
  const rows = useMemo(() => scopedRows(allDatasets, auth), [allDatasets, auth])
  const hasDatasets = useMemo(() => scopedDatasets(allDatasets, auth).length > 0, [allDatasets, auth])

  const forecasts = useMemo(
    () => forecastStorage.getAll().filter((f) => f.companyId === auth.companyId),
    [auth]
  )

  return (
    <Layout title="Dashboard" auth={auth} onLogout={onLogout}>
      <div className="dashboard-header-row">
        <div className="dashboard-greeting">
          <h2>Good Morning, {auth.userName || auth.companyName} 👋</h2>
          <p>Here&apos;s an overview of your sales, inventory and forecasting performance.</p>
        </div>
        <button className="btn-upload" onClick={() => navigate('/company/dataset')}>
          <i className="bi bi-plus-lg" />
          Upload Dataset
        </button>
      </div>

      <CompanyAnalytics
        rows={rows}
        forecasts={forecasts}
        hasDatasets={hasDatasets}
        onUpload={() => navigate('/company/dataset')}
        onViewInventory={() => navigate('/company/inventory')}
        onViewHistory={() => navigate('/company/history')}
      />
    </Layout>
  )
}
