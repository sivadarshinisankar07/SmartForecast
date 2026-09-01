import React from 'react'

export default function TopNavbar({ title = 'Dashboard', onMenuClick, auth }) {
  const isAdmin = auth?.role === 'admin'
  const displayName = auth?.userName || (isAdmin ? 'Admin User' : 'Customer')
  const roleLabel = isAdmin ? 'Administrator · All Companies' : auth?.companyName || 'Customer Company'
  const initials = (auth?.userName || auth?.companyName || 'CU').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'CU'

  return (
    <header className="top-navbar">
      <div className="top-navbar-left">
        <button className="navbar-toggle-btn" onClick={onMenuClick} aria-label="Open menu">
          <i className="bi bi-list" />
        </button>
        <h4>{title}</h4>
      </div>

      <div className="top-navbar-right">
        <button className="icon-btn" aria-label="Notifications">
          <i className="bi bi-bell" />
          <span className="dot" />
        </button>

        <div className="navbar-user">
          <div className="navbar-user-avatar">{initials}</div>
          <div>
            <div className="navbar-user-name">{displayName}</div>
            <div className="navbar-user-role">{roleLabel}</div>
          </div>
        </div>
      </div>
    </header>
  )
}
