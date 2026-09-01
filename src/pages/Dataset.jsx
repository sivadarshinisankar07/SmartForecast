import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'

import Layout from '../components/Layout.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { datasetStorage, genId } from '../utils/storage.js'
import { DATASET_FIELDS } from '../data/mockData.js'
import './Dataset.css'

// Steps: 'upload' -> 'map' -> 'period' -> 'summary'
function initialStepFor(existingDataset) {
  if (!existingDataset) return 'upload'
  if (!existingDataset.forecastFrom || !existingDataset.forecastTo) return 'period'
  return 'summary'
}

export default function Dataset({ auth, onLogout }) {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [existingDataset, setExistingDataset] = useState(
    () => datasetStorage.getByCompany(auth.companyId)[0] || null
  )
  const [step, setStep] = useState(() => initialStepFor(existingDataset))

  const [fileName, setFileName] = useState('')
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawRows, setRawRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [newDatasetId, setNewDatasetId] = useState(null)

  const [forecastFrom, setForecastFrom] = useState(existingDataset?.forecastFrom || '')
  const [forecastTo, setForecastTo] = useState(existingDataset?.forecastTo || '')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false)

  const refreshExisting = () => {
    const ds = datasetStorage.getByCompany(auth.companyId)[0] || null
    setExistingDataset(ds)
    return ds
  }

  const resetUploadState = () => {
    setFileName('')
    setRawHeaders([])
    setRawRows([])
    setMapping({})
    setNewDatasetId(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = (file) => {
    if (!file) return
    setError('')
    setSuccess('')

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        if (!headers.length || !results.data.length) {
          setError('This file could not be read. Please upload a valid CSV with header columns.')
          return
        }

        const auto = {}
        DATASET_FIELDS.forEach((f) => {
          const normalizedKey = f.key.toLowerCase()
          const match = headers.find((h) => h.toLowerCase().replace(/[^a-z]/g, '').includes(normalizedKey))
          auto[f.key] = match || ''
        })

        setRawHeaders(headers)
        setRawRows(results.data)
        setFileName(file.name)
        setMapping(auto)
        setStep('map')
      },
      error: () => setError('Failed to parse the CSV file. Please check the format and try again.'),
    })
  }

  const handleMapChange = (key, value) => setMapping((m) => ({ ...m, [key]: value }))

  const requiredFieldsMapped = DATASET_FIELDS.filter((f) => f.required).every((f) => mapping[f.key])

  const handleConfirmMapping = () => {
    if (!requiredFieldsMapped) {
      setError('Please map all required fields (marked *) before saving.')
      return
    }

    const rows = rawRows
      .map((r) => ({
        date: r[mapping.date],
        product: (r[mapping.product] || '').toString().trim(),
        units: Number(r[mapping.units]) || 0,
        stock: mapping.stock ? Number(r[mapping.stock]) || 0 : 0,
        minStock: mapping.minStock ? Number(r[mapping.minStock]) || 0 : 0,
      }))
      .filter((r) => r.product && r.date)

    if (!rows.length) {
      setError('No valid rows were found after mapping. Double-check your Date and Product columns.')
      return
    }

    const dataset = {
      id: genId('ds'),
      companyId: auth.companyId,
      fileName,
      uploadedAt: new Date().toISOString(),
      rowCount: rows.length,
      rows,
      forecastFrom: null,
      forecastTo: null,
    }

    datasetStorage.save(dataset)
    setNewDatasetId(dataset.id)
    setError('')
    setSuccess(`"${fileName}" uploaded successfully with ${rows.length} records.`)
    setStep('period')
  }

  const handleStartReplace = () => setConfirmReplaceOpen(true)

  const handleConfirmReplace = () => {
    if (existingDataset) datasetStorage.remove(existingDataset.id)
    setExistingDataset(null)
    setConfirmReplaceOpen(false)
    resetUploadState()
    setForecastFrom('')
    setForecastTo('')
    setSuccess('')
    setError('')
    setStep('upload')
  }

  const activeDatasetId = newDatasetId || existingDataset?.id

  const handleSavePeriod = () => {
    setError('')
    if (!forecastFrom || !forecastTo) {
      setError('Please select both a Forecast From date and a Forecast To date.')
      return
    }
    if (new Date(forecastFrom) > new Date(forecastTo)) {
      setError('The Forecast From date cannot be after the Forecast To date.')
      return
    }
    if (!activeDatasetId) {
      setError('No dataset found to attach this forecast period to. Please upload a dataset first.')
      return
    }

    datasetStorage.update(activeDatasetId, { forecastFrom, forecastTo })
    refreshExisting()
    resetUploadState()
    navigate('/company/inventory')
  }

  return (
    <Layout title="Dataset" auth={auth} onLogout={onLogout}>
      <div className="dashboard-header-row">
        <div className="dashboard-greeting">
          <h2>Dataset Management</h2>
          <p>Upload historical sales data and configure the forecasting period.</p>
        </div>
      </div>

      {error && (
        <div className="login-alert mb-3" role="alert">
          <i className="bi bi-exclamation-circle-fill" />
          {error}
        </div>
      )}
      {success && step !== 'period' && (
        <div className="dataset-success mb-3">
          <i className="bi bi-check-circle-fill" />
          {success}
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* STEP: upload                                              */}
      {/* -------------------------------------------------------- */}
      {step === 'upload' && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h5>Upload Dataset</h5>
          </div>
          <div className="upload-zone" onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}>
            <i className="bi bi-cloud-arrow-up" />
            <p>
              <strong>Click to upload</strong> a CSV file of your historical sales data
            </p>
            <span className="text-secondary">
              Expected columns: Date, Product, Units Sold, Current Stock (optional), Minimum Stock (optional)
            </span>
            <input ref={fileInputRef} type="file" accept=".csv" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* STEP: map                                                 */}
      {/* -------------------------------------------------------- */}
      {step === 'map' && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h5>Map Columns — {fileName}</h5>
          </div>
          <div className="mapping-panel">
            <div className="row g-3">
              {DATASET_FIELDS.map((f) => (
                <div className="col-12 col-md-6" key={f.key}>
                  <label className="form-label-custom">
                    {f.label}
                    {f.required && ' *'}
                  </label>
                  <select className="form-select" value={mapping[f.key] || ''} onChange={(e) => handleMapChange(f.key, e.target.value)}>
                    <option value="">{f.required ? '— Select column —' : '— None —'}</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="preview-table-wrap">
              <div className="sidebar-section-label" style={{ marginTop: '1.3rem', color: 'var(--color-text-secondary)' }}>
                Preview (first 5 rows)
              </div>
              <div className="table-responsive-card">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      {rawHeaders.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        {rawHeaders.map((h) => (
                          <td key={h}>{String(r[h] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mapping-actions">
              <button className="btn-secondary" onClick={() => { resetUploadState(); setStep('upload') }} type="button">
                Cancel
              </button>
              <button className="btn-upload" onClick={handleConfirmMapping} type="button" disabled={!requiredFieldsMapped}>
                <i className="bi bi-check2" /> Confirm &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* STEP: period — only date range is asked, nothing else     */}
      {/* -------------------------------------------------------- */}
      {step === 'period' && (
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <h5>Forecasting Period</h5>
          </div>
          {success && (
            <div className="dataset-success mb-3">
              <i className="bi bi-check-circle-fill" />
              {success}
            </div>
          )}
          <p className="text-secondary mb-3" style={{ fontSize: '0.88rem' }}>
            Choose the date range you want ForecastAI to forecast demand for. This is the only thing left
            to configure — your dataset is already saved.
          </p>
          <div className="row g-3">
            <div className="col-12 col-md-5">
              <label className="form-label-custom">Forecast From Date</label>
              <input type="date" className="form-control" value={forecastFrom} onChange={(e) => setForecastFrom(e.target.value)} />
            </div>
            <div className="col-12 col-md-5">
              <label className="form-label-custom">Forecast To Date</label>
              <input type="date" className="form-control" value={forecastTo} onChange={(e) => setForecastTo(e.target.value)} />
            </div>
            <div className="col-12 col-md-2 d-flex align-items-end">
              <button className="btn-upload w-100" onClick={handleSavePeriod} type="button">
                Save &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* STEP: summary — dataset already fully configured          */}
      {/* -------------------------------------------------------- */}
      {step === 'summary' && existingDataset && (
        <>
          <div className="dashboard-card mb-3">
            <div className="dashboard-card-header">
              <h5>Current Dataset</h5>
            </div>
            <div className="table-responsive-card">
              <table className="dashboard-table">
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>File Name</td>
                    <td>{existingDataset.fileName}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Records</td>
                    <td>{existingDataset.rowCount}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Uploaded</td>
                    <td>{new Date(existingDataset.uploadedAt).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Forecast Period</td>
                    <td>
                      {new Date(existingDataset.forecastFrom).toLocaleDateString()} —{' '}
                      {new Date(existingDataset.forecastTo).toLocaleDateString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mapping-actions" style={{ justifyContent: 'flex-start', marginTop: '1.2rem' }}>
              <button className="btn-secondary" onClick={handleStartReplace} type="button">
                <i className="bi bi-arrow-repeat" /> Upload New Dataset
              </button>
              <button className="btn-upload" onClick={() => navigate('/company/inventory')} type="button">
                Continue to Inventory <i className="bi bi-arrow-right" />
              </button>
            </div>
          </div>

          <div className="dashboard-card">
            <div className="dashboard-card-header">
              <h5>Edit Forecasting Period</h5>
            </div>
            <div className="row g-3">
              <div className="col-12 col-md-5">
                <label className="form-label-custom">Forecast From Date</label>
                <input type="date" className="form-control" value={forecastFrom} onChange={(e) => setForecastFrom(e.target.value)} />
              </div>
              <div className="col-12 col-md-5">
                <label className="form-label-custom">Forecast To Date</label>
                <input type="date" className="form-control" value={forecastTo} onChange={(e) => setForecastTo(e.target.value)} />
              </div>
              <div className="col-12 col-md-2 d-flex align-items-end">
                <button
                  className="btn-upload w-100"
                  type="button"
                  onClick={() => {
                    setError('')
                    if (!forecastFrom || !forecastTo) {
                      setError('Please select both dates.')
                      return
                    }
                    if (new Date(forecastFrom) > new Date(forecastTo)) {
                      setError('From date cannot be after To date.')
                      return
                    }
                    datasetStorage.update(existingDataset.id, { forecastFrom, forecastTo })
                    refreshExisting()
                  }}
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmReplaceOpen}
        title="Replace Dataset?"
        message="Uploading a new dataset will remove your current one and its forecasting period. This action cannot be undone."
        confirmLabel="Replace"
        onConfirm={handleConfirmReplace}
        onCancel={() => setConfirmReplaceOpen(false)}
      />
    </Layout>
  )
}
