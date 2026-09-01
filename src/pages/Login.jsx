import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { companyStorage, hashPassword } from '../utils/storage.js'
import './Login.css'

const miniChartHeights = [40, 55, 48, 65, 60, 78, 70, 85]

export default function Login({ onLogin }) {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Please enter both your email address and password to continue.')
      return
    }

    // Real lookup against registered accounts (still frontend-only —
    // companyStorage is a localStorage-backed stand-in for the future
    // POST /api/auth/login call).
    const account = companyStorage.findByEmail(email.trim())

    if (!account || account.passwordHash !== hashPassword(password)) {
      setError('Incorrect email or password. Please try again or register a new account.')
      return
    }

    setError('')

    const auth = {
      companyId: account.id,
      companyName: account.companyName,
      userName: account.userName,
      email: account.email,
      role: account.role, // 'admin' | 'customer'
    }

    onLogin(auth, rememberMe)
    navigate(account.role === 'admin' ? '/admin/dashboard' : '/company/dashboard')
  }

  return (
    <div className="login-page">
      {/* ---------------------------------------------------------- */}
      {/* LEFT: Branding                                              */}
      {/* ---------------------------------------------------------- */}
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="login-brand-mark">
            <span className="mark-icon">
              <i className="bi bi-bar-chart-line-fill" />
            </span>
            <span>ForecastAI</span>
          </div>

          <h1>Intelligent Demand Forecasting &amp; Inventory Management</h1>
          <span className="tagline">For every business, every dataset</span>
          <p className="description">
            Turn historical business data into actionable demand forecasts and
            smarter inventory decisions.
          </p>

          <div className="flow-visual">
            <div className="flow-visual-label">How ForecastAI thinks</div>
            <div className="flow-steps">
              <div className="flow-step">
                <div className="flow-step-icon">
                  <i className="bi bi-clock-history" />
                </div>
                <span>Historical Sales</span>
              </div>

              <i className="bi bi-arrow-right flow-arrow" />

              <div className="flow-step">
                <div className="flow-step-icon">
                  <i className="bi bi-graph-up" />
                </div>
                <span>Forecast</span>
              </div>

              <i className="bi bi-arrow-right flow-arrow" />

              <div className="flow-step">
                <div className="flow-step-icon">
                  <i className="bi bi-boxes" />
                </div>
                <span>Inventory Decision</span>
              </div>
            </div>

            <div className="mini-chart" aria-hidden="true">
              {miniChartHeights.map((h, i) => (
                <span
                  key={i}
                  className={i >= 5 ? 'projected' : ''}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* RIGHT: Login form                                           */}
      {/* ---------------------------------------------------------- */}
      <div className="login-form-panel">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to access your forecasting dashboard.</p>

          {error && (
            <div className="login-alert" role="alert">
              <i className="bi bi-exclamation-circle-fill" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="email" className="form-label-custom">
                Email Address
              </label>
              <div className="input-with-icon">
                <i className="bi bi-envelope" />
                <input
                  type="email"
                  id="email"
                  className="form-control"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-2">
              <label htmlFor="password" className="form-label-custom">
                Password
              </label>
              <div className="input-with-icon">
                <i className="bi bi-lock" />
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="login-options-row">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="rememberMe">
                  Remember me
                </label>
              </div>
              <a href="#!" className="forgot-link">
                Forgot Password?
              </a>
            </div>

            <button type="submit" className="btn-login">
              Login
              <i className="bi bi-arrow-right" />
            </button>
          </form>

          <div className="login-register-row">
            Don&apos;t have an account? <Link to="/register">Register</Link>
          </div>

          <p className="form-hint" style={{ textAlign: 'center', marginTop: '1rem' }}>
            New here? Try the demo admin — admin@forecastai.com / admin123
          </p>
        </div>
      </div>
    </div>
  )
}
