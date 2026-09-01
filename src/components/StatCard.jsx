import React from 'react'
import './StatCard.css'

export default function StatCard({ label, value, change, changeType, footnote, icon, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        <div className={`stat-card-icon accent-${accent}`}>
          <i className={`bi ${icon}`} />
        </div>
      </div>

      <div className="stat-card-value">{value}</div>

      <div className="stat-card-footer">
        <span className={`stat-card-change ${changeType}`}>
          {changeType === 'up' && <i className="bi bi-arrow-up-right" />}
          {changeType === 'warning' && <i className="bi bi-exclamation-triangle-fill" />}
          {change}
        </span>
        {footnote && <span className="stat-card-footnote">{footnote}</span>}
      </div>
    </div>
  )
}
