import React, { useState } from 'react'
import Sidebar from './Sidebar.jsx'
import TopNavbar from './TopNavbar.jsx'
import './Layout.css'

export default function Layout({ title, auth, onLogout, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="app-shell">
      <Sidebar
        auth={auth}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={onLogout}
      />

      <div className="main-column">
        <TopNavbar title={title} onMenuClick={() => setSidebarOpen(true)} auth={auth} />
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
