import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const customerNavItems = [
  { label: 'Dashboard', icon: 'bi-grid-1x2-fill', path: '/company/dashboard' },
  { label: 'Dataset', icon: 'bi-upload', path: '/company/dataset' },
  { label: 'Inventory', icon: 'bi-boxes', path: '/company/inventory' },
  { label: 'Forecast', icon: 'bi-graph-up-arrow', path: '/company/forecast' },
  { label: 'Model Comparison', icon: 'bi-bar-chart-steps', path: '/company/comparison' },
  { label: 'Forecast History', icon: 'bi-clock-history', path: '/company/history' },
  { label: 'Reports', icon: 'bi-file-earmark-text', path: '/company/reports' },
]

const adminNavItems = [
  { label: 'Registered Companies', icon: 'bi-buildings', path: '/admin/dashboard' },
]

export default function Sidebar({ auth, isOpen, onClose, onLogout }) {
  const location = useLocation()
  const isAdmin = auth?.role === 'admin'
  const navItems = isAdmin ? adminNavItems : customerNavItems

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="mark-icon">
            <i className="bi bi-bar-chart-line-fill" />
          </span>
          <span>ForecastAI</span>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">{isAdmin ? 'Admin' : 'Menu'}</div>
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path || (item.path === '/admin/dashboard' && location.pathname.startsWith('/admin/company'))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <i className={`bi ${item.icon}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-nav-item disabled">
            <i className="bi bi-person-circle" />
            <span>Profile</span>
          </div>
          <div className="sidebar-nav-item" role="button" tabIndex={0} onClick={onLogout}>
            <i className="bi bi-box-arrow-right" />
            <span>Logout</span>
          </div>
        </div>
      </aside>

      <div className={`sidebar-backdrop ${isOpen ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
    </>
  )
}
