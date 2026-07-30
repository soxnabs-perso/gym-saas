import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import InvoiceActions from '../components/InvoiceActions';
import { describeApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';

const STATUS_LABELS = { pending: 'Pending', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled' };

function formatAmount(value, currency = 'XOF') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);

  async function loadInvoices() {
    setLoading(true);
    try {
      const res = await api.get('/invoices', { params: statusFilter ? { status: statusFilter } : {} });
      setInvoices(res.data.invoices);
    } catch (err) {
      setMessages(describeApiError(err, 'Could not load invoices').messages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  async function markPaid(id) {
    try {
      await api.patch(`/invoices/${id}/status`, { status: 'paid' });
      await loadInvoices();
    } catch (err) {
      setMessages(describeApiError(err, 'Could not update this invoice').messages);
    }
  }

  async function cancelInvoice(id, cancellationReason) {
    try {
      await api.patch(`/invoices/${id}/status`, { status: 'cancelled', cancellationReason });
      await loadInvoices();
    } catch (err) {
      setMessages(describeApiError(err, 'Could not cancel this invoice').messages);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Invoices</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem 0.7rem', borderRadius: '4px', border: '1px solid #d7d9d4' }}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner messages={messages} />

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="empty-state">No invoices to show. Generate one from a customer's page.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Due date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{inv.invoiceNumber}</td>
                  <td>
                    {inv.customer ? (
                      <Link to={`/customers/${inv.customer._id}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
                        {inv.customer.fullName}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{formatAmount(inv.amount, inv.currency)}</td>
                  <td>{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge badge-${inv.status}`}>{STATUS_LABELS[inv.status]}</span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <InvoiceActions invoice={inv} onMarkPaid={markPaid} onCancel={cancelInvoice} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
