import React, { useEffect, useMemo, useState } from 'react'

import Layout from '../components/Layout.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { datasetStorage, inventoryStorage } from '../utils/storage.js'
import { scopedRows, scopedDatasets, latestStockByProduct, computeForecastDemandByProduct, monthsBetween } from '../utils/dataEngine.js'
import './Dashboard.css'
import './Inventory.css'

export default function Inventory({ auth, onLogout }) {
  const [search, setSearch] = useState('')
  const allDatasets = datasetStorage.getAll()
  const rows = useMemo(() => scopedRows(allDatasets, auth), [allDatasets, auth])
  const dataset = useMemo(() => scopedDatasets(allDatasets, auth)[0] || null, [allDatasets, auth])

  const periods = dataset ? monthsBetween(dataset.forecastFrom, dataset.forecastTo) : 3

  const products = useMemo(() => {
    const stockMap = latestStockByProduct(rows)
    const demandMap = computeForecastDemandByProduct(rows, periods)
    return Object.values(stockMap)
      .map((p) => {
        const forecastDemand = demandMap[p.product] || 0
        const recommendedOrder = Math.max(0, forecastDemand - p.currentStock)
        return {
          ...p,
          forecastDemand,
          recommendedOrder,
          status: p.currentStock <= 0 ? 'Out of Stock' : p.currentStock <= p.minStock ? 'Low Stock' : 'Good Stock',
        }
      })
      .filter((p) => p.product.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.currentStock - b.currentStock)
  }, [rows, search, periods])

  // Cache a snapshot so Admin/Reports can show inventory without recomputing.
  useEffect(() => {
    if (auth.role === 'customer' && products.length) {
      inventoryStorage.set(auth.companyId, products)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length, auth.companyId])

  return (
    <Layout title="Inventory" auth={auth} onLogout={onLogout}>
      <div className="dashboard-header-row">
        <div className="dashboard-greeting">
          <h2>Inventory Management</h2>
          <p>Stock levels compared against forecast demand, with suggested reorder quantities.</p>
        </div>
        {rows.length > 0 && (
          <input
            className="form-control inventory-search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      <div className="dashboard-card">
        {products.length ? (
          <div className="table-responsive-card">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Minimum Stock</th>
                  <th>Forecast Demand</th>
                  <th>Status</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.product}>
                    <td>{p.product}</td>
                    <td className="stock-cell">{p.currentStock}</td>
                    <td>{p.minStock}</td>
                    <td>{p.forecastDemand.toLocaleString()}</td>
                    <td>
                      <span
                        className={`badge-status ${
                          p.status === 'Out of Stock' ? 'danger' : p.status === 'Low Stock' ? 'low' : 'ok'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className={p.recommendedOrder > 0 ? 'accuracy-cell' : 'text-secondary'} style={p.recommendedOrder > 0 ? { color: 'var(--color-primary)' } : undefined}>
                      {p.recommendedOrder > 0 ? `Order ${p.recommendedOrder.toLocaleString()}` : 'No Order'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="bi-boxes"
            title="No records found"
            message={
              rows.length
                ? 'No products match your search.'
                : 'Upload a dataset with stock columns to see inventory status here.'
            }
          />
        )}
      </div>
    </Layout>
  )
}
