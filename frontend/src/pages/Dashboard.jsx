import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { describeApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';

function formatAmount(value, currency = 'XOF') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

const RANGE_LABELS = {
  month: 'This month',
  quarter: 'This quarter',
  year: 'This year',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('month');

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, invoicesRes] = await Promise.all([
          api.get('/invoices/dashboard/summary', { params: { range } }),
          api.get('/invoices'),
        ]);
        setSummary(summaryRes.data);
        setRecentInvoices(invoicesRes.data.invoices.slice(0, 5));
      } catch (err) {
        setMessages(describeApiError(err, 'Could not load the dashboard, please refresh the page').messages);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [range]);

  const chartData = recentInvoices
    .slice()
    .reverse()
    .map((inv) => ({
      name: inv.invoiceNumber.slice(-6),
      amount: inv.amount,
    }));

  if (loading) return <div className="empty-state">Loading dashboard...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Overview</h1>
          <p style={{ color: 'var(--color-mist)', marginTop: '0.3rem' }}>
            Welcome back, {user?.fullName?.split(' ')[0]}. Here is how {user?.gymName} is doing.
          </p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          aria-label="Reporting period"
          style={{ padding: '0.5rem 0.7rem', borderRadius: '4px', border: '1px solid #d7d9d4' }}
        >
          {Object.entries(RANGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner messages={messages} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.8rem' }}>
        <StatCard label="Active customers" value={summary?.totalCustomers ?? 0} />
        <StatCard
          label={`Revenue · ${RANGE_LABELS[range].toLowerCase()}`}
          value={formatAmount(summary?.revenue ?? 0)}
          sub="Collected in this period"
          accent
        />
        <StatCard
          label={`Outstanding · ${RANGE_LABELS[range].toLowerCase()}`}
          value={formatAmount(summary?.outstandingAmount ?? 0)}
          sub={`${summary?.outstandingCount ?? 0} invoice(s) due in this period`}
        />
      </div>

      <div className="card" style={{ padding: '1.4rem' }}>
        <h2 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Recent invoice amounts</h2>
        {chartData.length === 0 ? (
          <div className="empty-state">No invoices yet. Create your first one from the Invoices page.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e8e3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#8b9099" />
              <YAxis tick={{ fontSize: 12 }} stroke="#8b9099" />
              <Tooltip formatter={(value) => formatAmount(value)} />
              <Bar dataKey="amount" fill="#e0a527" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="card" style={{ padding: '1.2rem' }}>
      <div style={{ fontSize: '0.78rem', color: 'var(--color-mist)', fontWeight: 600, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.7rem',
          fontWeight: 600,
          color: accent ? 'var(--color-amber-dim)' : 'var(--color-ink)',
          marginTop: '0.3rem',
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.78rem', color: 'var(--color-mist)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}
