import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import Layout from '../components/Layout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import CompanyAnalytics from '../components/CompanyAnalytics.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { companyStorage, datasetStorage, forecastStorage } from '../utils/storage.js'
import { rowsForCompany } from '../utils/dataEngine.js'
import './Dashboard.css'
import './Dataset.css'

export default function AdminCompanyDetail({ auth, onLogout }) {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const company = companyStorage.findById(companyId)
  const allDatasets = datasetStorage.getAll()
  const dataset = useMemo(() => datasetStorage.getByCompany(companyId)[0] || null, [allDatasets, companyId])
  const rows = useMemo(() => rowsForCompany(allDatasets, companyId), [allDatasets, companyId])
  const forecasts = useMemo(() => forecastStorage.getByCompany(companyId), [companyId])

  const handleDelete = () => {
    companyStorage.remove(companyId)
    setConfirmOpen(false)
    navigate('/admin/dashboard')
  }

  if (!company) {
    return (
      <Layout title="Company Not Found" auth={auth} onLogout={onLogout}>
        <div className="dashboard-card">
          <EmptyState
            icon="bi-building-x"
            title="Company Not Found"
            message="This company may have already been deleted."
            actionLabel="Back to Registered Companies"
            onAction={() => navigate('/admin/dashboard')}
          />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Company Details" auth={auth} onLogout={onLogout}>
      <div className="dashboard-header-row">
        <div className="dashboard-greeting">
          <a
            href="#!"
            className="card-link"
            onClick={(e) => {
              e.preventDefault()
              navigate('/admin/dashboard')
            }}
          >
            <i className="bi bi-arrow-left" /> Back to Registered Companies
          </a>
          <h2 style={{ marginTop: '0.6rem' }}>{company.companyName}</h2>
          <p>Company, dataset, inventory and forecasting overview.</p>
        </div>
        <button className="link-danger" style={{ border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '0.55rem 1rem' }} onClick={() => setConfirmOpen(true)}>
          <i className="bi bi-trash3" /> Delete Company
        </button>
      </div>

      <div className="dashboard-card mb-3">
        <div className="dashboard-card-header">
          <h5>Company Information</h5>
        </div>
        <div className="table-responsive-card">
          <table className="dashboard-table">
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>User Name</td>
                <td>{company.userName}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Email</td>
                <td>{company.email}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Registered</td>
                <td>{new Date(company.registeredAt).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Status</td>
                <td>
                  <span className="badge-status ok">{company.status}</span>
                </td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Dataset</td>
                <td>{dataset ? `${dataset.fileName} (${dataset.rowCount} records)` : 'No dataset uploaded yet'}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Forecast Period</td>
                <td>
                  {dataset?.forecastFrom && dataset?.forecastTo
                    ? `${new Date(dataset.forecastFrom).toLocaleDateString()} – ${new Date(dataset.forecastTo).toLocaleDateString()}`
                    : 'Not configured'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {dataset ? (
        <CompanyAnalytics rows={rows} forecasts={forecasts} hasDatasets={!!dataset} showActions={false} />
      ) : (
        <div className="dashboard-card">
          <EmptyState
            icon="bi-file-earmark-arrow-up"
            title="No records found"
            message="This company hasn't uploaded a dataset yet. Sales analytics, inventory and forecasts will appear here once they do."
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Company?"
        message={`Are you sure you want to delete "${company.companyName}"? This will remove their datasets, inventory, and forecast history. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Layout>
  )
}
