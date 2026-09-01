import React, { useState, useCallback, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Dataset from './pages/Dataset.jsx'
import Inventory from './pages/Inventory.jsx'
import Forecast from './pages/Forecast.jsx'
import ModelComparison from './pages/ModelComparison.jsx'
import ForecastHistory from './pages/ForecastHistory.jsx'
import Reports from './pages/Reports.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminCompanyDetail from './pages/AdminCompanyDetail.jsx'
import { authStorage, ensureSeedAdmin } from './utils/storage.js'

export default function App() {
  // Seed a demo Admin account once so there's always a way into /admin
  // without a backend to pre-provision one.
  useEffect(() => {
    ensureSeedAdmin()
  }, [])

  // auth = { companyId, companyName, userName, email, role: 'admin' | 'customer' }
  // Persisted via authStorage, which itself decides localStorage (Remember Me)
  // vs sessionStorage (this browser session only). Every page below receives
  // `auth` as a prop so swapping this for real JWT/session handling later
  // only touches App.jsx and storage.js.
  const [auth, setAuth] = useState(() => authStorage.get())

  const handleLogin = useCallback((authObj, remember) => {
    authStorage.set(authObj, remember)
    setAuth(authObj)
  }, [])

  const handleLogout = useCallback(() => {
    authStorage.clear()
    setAuth(null)
  }, [])

  const homeForRole = (a) => (a?.role === 'admin' ? '/admin/dashboard' : '/company/dashboard')

  const companyGuard = (element) => {
    if (!auth) return <Navigate to="/login" replace />
    if (auth.role !== 'customer') return <Navigate to="/admin/dashboard" replace />
    return element
  }

  const adminGuard = (element) => {
    if (!auth) return <Navigate to="/login" replace />
    if (auth.role !== 'admin') return <Navigate to="/company/dashboard" replace />
    return element
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={auth ? homeForRole(auth) : '/login'} replace />} />

        <Route
          path="/login"
          element={auth ? <Navigate to={homeForRole(auth)} replace /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={auth ? <Navigate to={homeForRole(auth)} replace /> : <Register />}
        />

        {/* Company Customer workflow */}
        <Route path="/company/dashboard" element={companyGuard(<Dashboard auth={auth} onLogout={handleLogout} />)} />
        <Route path="/company/dataset" element={companyGuard(<Dataset auth={auth} onLogout={handleLogout} />)} />
        <Route path="/company/inventory" element={companyGuard(<Inventory auth={auth} onLogout={handleLogout} />)} />
        <Route path="/company/forecast" element={companyGuard(<Forecast auth={auth} onLogout={handleLogout} />)} />
        <Route path="/company/comparison" element={companyGuard(<ModelComparison auth={auth} onLogout={handleLogout} />)} />
        <Route path="/company/history" element={companyGuard(<ForecastHistory auth={auth} onLogout={handleLogout} />)} />
        <Route path="/company/reports" element={companyGuard(<Reports auth={auth} onLogout={handleLogout} />)} />

        {/* Admin workflow */}
        <Route path="/admin/dashboard" element={adminGuard(<AdminDashboard auth={auth} onLogout={handleLogout} />)} />
        <Route path="/admin/company/:companyId" element={adminGuard(<AdminCompanyDetail auth={auth} onLogout={handleLogout} />)} />

        <Route path="*" element={<Navigate to={auth ? homeForRole(auth) : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
