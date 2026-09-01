import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Layout from '../components/Layout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import StatCard from '../components/StatCard.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { companyStorage, datasetStorage } from '../utils/storage.js'
import './Dashboard.css'
import './Dataset.css'

export default function AdminDashboard({ auth, onLogout }) {
  const navigate = useNavigate()
  const [, forceRefresh] = useState(0)
  const [pendingDelete, setPendingDelete] = useState(null)

  const companies = useMemo(
    () =>
      companyStorage
        .getAll()
        .filter((c) => c.role === 'customer')
        .sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [forceRefresh]
  )

  const allDatasets = datasetStorage.getAll()
  const companiesWithData = companies.filter((c) => allDatasets.some((d) => d.companyId === c.id)).length

  const handleDelete = () => {
    if (!pendingDelete) return
    companyStorage.remove(pendingDelete.id)
    setPendingDelete(null)
    forceRefresh((n) => n + 1)
  }

  return (
    <Layout title="Admin Dashboard" auth={auth} onLogout={onLogout}>
      <div className="dashboard-header-row">
        <div className="dashboard-greeting">
          <h2>Registered Companies</h2>
          <p>Every company that has registered on ForecastAI, and what they&apos;ve uploaded so far.</p>
        </div>
      </div>

      <div className="row g-3 kpi-row">
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard label="Registered Companies" value={String(companies.length)} change="Total" changeType="up" footnote="" icon="bi-buildings" accent="primary" />
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard label="Companies with Data" value={String(companiesWithData)} change="Uploaded a dataset" changeType="up" footnote="" icon="bi-cloud-check" accent="success" />
        </div>
        <div className="col-12 col-sm-6 col-xl-4">
          <StatCard label="Awaiting Upload" value={String(companies.length - companiesWithData)} change={companies.length - companiesWithData > 0 ? 'Needs Attention' : 'All Good'} changeType={companies.length - companiesWithData > 0 ? 'warning' : 'up'} footnote="" icon="bi-hourglass-split" accent="warning" />
        </div>
      </div>

      <div className="dashboard-card">
        {companies.length ? (
          <div className="table-responsive-card">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <a
                        href="#!"
                        className="card-link"
                        style={{ fontWeight: 600 }}
                        onClick={(e) => {
                          e.preventDefault()
                          navigate(`/admin/company/${c.id}`)
                        }}
                      >
                        {c.companyName}
                      </a>
                    </td>
                    <td>{c.userName}</td>
                    <td>{c.email}</td>
                    <td>{new Date(c.registeredAt).toLocaleDateString()}</td>
                    <td>
                      <span className="badge-status ok">{c.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.7rem' }}>
                        <button
                          className="card-link"
                          style={{ background: 'none', border: 'none' }}
                          onClick={() => navigate(`/admin/company/${c.id}`)}
                          title="View company"
                        >
                          <i className="bi bi-eye" /> View
                        </button>
                        <button className="link-danger" onClick={() => setPendingDelete(c)} title="Delete company">
                          <i className="bi bi-trash3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="bi-buildings" title="No Companies Found" message="No companies have registered yet." />
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete Company?"
        message={`Are you sure you want to delete "${pendingDelete?.companyName}"? This will remove their datasets, inventory, and forecast history. This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Layout>
  )
}
