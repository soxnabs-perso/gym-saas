import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { describeApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';
import './auth.css';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ gymName: '', fullName: '', email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [messages, setMessages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessages([]);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await signup({ ...form, rememberMe });
      navigate('/');
    } catch (err) {
      const described = describeApiError(err, 'Could not create the account, please try again');
      setMessages(described.messages);
      setFieldErrors(described.fields);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <div className="brand-mark">L</div>
        <h1>Set up your gym</h1>
        <p className="auth-subtitle">Create an account to start tracking customers and invoices.</p>

        <ErrorBanner messages={messages} />

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="gymName">Gym name</label>
            <input id="gymName" value={form.gymName} onChange={update('gymName')} required />
            {fieldErrors.gymName && <small style={{ color: '#b3261e' }}>{fieldErrors.gymName}</small>}
          </div>

          <div className="field">
            <label htmlFor="fullName">Your name</label>
            <input id="fullName" value={form.fullName} onChange={update('fullName')} required />
            {fieldErrors.fullName && <small style={{ color: '#b3261e' }}>{fieldErrors.fullName}</small>}
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={update('email')} required />
            {fieldErrors.email && <small style={{ color: '#b3261e' }}>{fieldErrors.email}</small>}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              minLength={8}
              value={form.password}
              onChange={update('password')}
              required
            />
            {fieldErrors.password && <small style={{ color: '#b3261e' }}>{fieldErrors.password}</small>}
            <small style={{ color: 'var(--color-mist)', fontSize: '0.75rem' }}>
              At least 8 characters, with an uppercase and a lowercase letter, a number and one of ! @ # $ % ^ &amp; *
            </small>
          </div>

          <div className="field checkbox-row">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <label htmlFor="rememberMe" style={{ marginBottom: 0 }}>
              Remind me / keep me signed in on this device
            </label>
          </div>

          <button className="btn btn-accent" type="submit" disabled={submitting} style={{ width: '100%' }}>
            {submitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
}
