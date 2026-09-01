import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { companyStorage, hashPassword, genId } from '../utils/storage.js'
import { USER_ROLES } from '../data/mockData.js'
import './Login.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const navigate = useNavigate()

  const [companyName, setCompanyName] = useState('')
  const [userName, setUserName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('customer')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!companyName.trim() || !userName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in every field before continuing.')
      return
    }

    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.')
      return
    }

    if (companyStorage.findByEmail(email.trim())) {
      setError('An account with this email address already exists. Please log in instead.')
      return
    }

    if (role === 'customer' && companyStorage.findByCompanyName(companyName.trim())) {
      setError('A company with this name is already registered. Please log in or use a different name.')
      return
    }

    // Frontend-only registration — this record is shaped so it can move
    // straight into a MySQL `companies`/`users` table later:
    // POST /api/auth/register
    companyStorage.save({
      id: genId('company'),
      companyName: companyName.trim(),
      userName: userName.trim(),
      email: email.trim(),
      passwordHash: hashPassword(password),
      role,
      registeredAt: new Date().toISOString(),
      status: 'Active',
    })

    setSuccess(true)
    setTimeout(() => navigate('/login'), 1400)
  }

  return (
    <div className="login-page">
      {/* ---------------------------------------------------------- */}
      {/* LEFT: Branding (reused from Login for a consistent feel)    */}
      {/* ---------------------------------------------------------- */}
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="login-brand-mark">
            <span className="mark-icon">
              <i className="bi bi-bar-chart-line-fill" />
            </span>
            <span>ForecastAI</span>
          </div>

          <h1>Create your ForecastAI account</h1>
          <span className="tagline">Set up your company in minutes</span>
          <p className="description">
            Register your business to start uploading sales history, generating
            demand forecasts, and getting smarter reorder recommendations.
          </p>

          <div className="flow-visual">
            <div className="flow-visual-label">What you get</div>
            <div className="flow-steps">
              <div className="flow-step">
                <div className="flow-step-icon">
                  <i className="bi bi-cloud-arrow-up" />
                </div>
                <span>Upload Sales Data</span>
              </div>

              <i className="bi bi-arrow-right flow-arrow" />

              <div className="flow-step">
                <div className="flow-step-icon">
                  <i className="bi bi-graph-up" />
                </div>
                <span>Get Forecasts</span>
              </div>

              <i className="bi bi-arrow-right flow-arrow" />

              <div className="flow-step">
                <div className="flow-step-icon">
                  <i className="bi bi-boxes" />
                </div>
                <span>Smarter Reorders</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/* RIGHT: Register form                                        */}
      {/* ---------------------------------------------------------- */}
      <div className="login-form-panel">
        <div className="login-card register-card">
          <h2>Create an account</h2>
          <p className="subtitle">Register your company to get started with ForecastAI.</p>

          {error && (
            <div className="login-alert" role="alert">
              <i className="bi bi-exclamation-circle-fill" />
              {error}
            </div>
          )}

          {success && (
            <div className="login-success" role="status">
              <i className="bi bi-check-circle-fill" />
              Account created successfully! Redirecting you to login…
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-1">
                <label className="form-label-custom">I am registering as</label>
                <div className="role-toggle" role="tablist" aria-label="Register as">
                  {USER_ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="tab"
                      aria-selected={role === r.id}
                      className={`role-tab ${role === r.id ? 'active' : ''}`}
                      onClick={() => setRole(r.id)}
                    >
                      <i className={`bi ${r.id === 'admin' ? 'bi-shield-lock' : 'bi-building'}`} />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-grid single">
                <div>
                  <label htmlFor="companyName" className="form-label-custom">
                    Company Name
                  </label>
                  <div className="input-with-icon">
                    <i className="bi bi-building" />
                    <input
                      type="text"
                      id="companyName"
                      className="form-control"
                      placeholder="e.g. Nova Retail Pvt Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="field-grid single">
                <div>
                  <label htmlFor="userName" className="form-label-custom">
                    {role === 'admin' ? 'Admin Name' : 'Your Name'}
                  </label>
                  <div className="input-with-icon">
                    <i className="bi bi-person" />
                    <input
                      type="text"
                      id="userName"
                      className="form-control"
                      placeholder="e.g. Priya Sharma"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="field-grid single">
                <div>
                  <label htmlFor="regEmail" className="form-label-custom">
                    Email Address
                  </label>
                  <div className="input-with-icon">
                    <i className="bi bi-envelope" />
                    <input
                      type="email"
                      id="regEmail"
                      className="form-control"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="field-grid">
                <div>
                  <label htmlFor="regPassword" className="form-label-custom">
                    Password
                  </label>
                  <div className="input-with-icon">
                    <i className="bi bi-lock" />
                    <input
                      type="password"
                      id="regPassword"
                      className="form-control"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="form-label-custom">
                    Confirm Password
                  </label>
                  <div className="input-with-icon">
                    <i className="bi bi-lock-fill" />
                    <input
                      type="password"
                      id="confirmPassword"
                      className="form-control"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-login mt-2">
                Create Account
                <i className="bi bi-arrow-right" />
              </button>
            </form>
          )}

          <div className="login-register-row">
            Already have an account? <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
