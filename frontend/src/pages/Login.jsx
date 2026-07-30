import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { describeApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';
import './auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [messages, setMessages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessages([]);
    setSubmitting(true);
    try {
      await login(email, password, rememberMe);
      navigate('/');
    } catch (err) {
      setMessages(describeApiError(err, 'Could not log in, please try again').messages);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="card auth-card">
        <div className="brand-mark">L</div>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Log in to manage your gym's customers and invoices.</p>

        <ErrorBanner messages={messages} />

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <div className="auth-switch">
          New here? <Link to="/signup">Create a gym account</Link>
        </div>
      </div>
    </div>
  );
}
