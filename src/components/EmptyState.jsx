import React from 'react'
import './EmptyState.css'

export default function EmptyState({
  icon = 'bi-inbox',
  title = 'No records found',
  message,
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <i className={`bi ${icon}`} />
      </div>
      <div className="empty-state-title">{title}</div>
      {message && <div className="empty-state-message">{message}</div>}
      {actionLabel && (
        <button className="empty-state-action" onClick={onAction} type="button">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
