import React from 'react'
import './ConfirmDialog.css'

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-icon">
          <i className="bi bi-exclamation-triangle-fill" />
        </div>
        <h4>{title}</h4>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button className="confirm-btn-cancel" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button className="confirm-btn-danger" onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
