import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import InvoiceActions from '../components/InvoiceActions';
import { describeApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';

const STATUS_LABELS = { pending: 'Pending', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled' };

function formatAmount(value, currency = 'XOF') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
}

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: '', description: '', dueDate: todayPlus(7) });

  async function loadData() {
    setLoading(true);
    try {
      const [customerRes, invoicesRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get('/invoices', { params: { customerId: id } }),
      ]);
      const loaded = customerRes.data.customer;
      setCustomer(loaded);
      setInvoices(invoicesRes.data.invoices);

      if (typeof loaded.subscriptionFee === 'number') {
        setForm((prev) => ({ ...prev, amount: prev.amount || String(loaded.subscriptionFee) }));
      }
    } catch (err) {
      setMessages(describeApiError(err, 'Could not load this customer').messages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleCreateInvoice(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessages([]);
    try {
      await api.post('/invoices', {
        customerId: id,
        amount: Number(form.amount),
        description: form.description,
        dueDate: form.dueDate,
      });
      setForm({ amount: '', description: '', dueDate: todayPlus(7) });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setMessages(describeApiError(err, 'Could not generate this invoice').messages);
    } finally {
      setSubmitting(false);
    }
  }

  async function markPaid(invoiceId) {
    try {
      await api.patch(`/invoices/${invoiceId}/status`, { status: 'paid' });
      await loadData();
    } catch (err) {
      setMessages(describeApiError(err, 'Could not update this invoice').messages);
    }
  }

  async function cancelInvoice(invoiceId, cancellationReason) {
    try {
      await api.patch(`/invoices/${invoiceId}/status`, {
        status: 'cancelled',
        cancellationReason,
      });
      await loadData();
    } catch (err) {
      setMessages(describeApiError(err, 'Could not cancel this invoice').messages);
    }
  }

  if (loading) return <div className="empty-state">Loading customer...</div>;
  if (!customer) return <div className="empty-state">Customer not found</div>;

  return (
    <div>
      <Link to="/customers" style={{ fontSize: '0.85rem', color: 'var(--color-mist)', textDecoration: 'none' }}>
        Back to customers
      </Link>

      <div className="page-header" style={{ marginTop: '0.6rem' }}>
        <div>
          <h1>{customer.fullName}</h1>
          <p style={{ color: 'var(--color-mist)', marginTop: '0.3rem' }}>
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ''}
            {typeof customer.subscriptionFee === 'number'
              ? ` · ${formatAmount(customer.subscriptionFee, 'XOF')} per cycle`
              : ' · billed per visit'}
          </p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : 'Generate invoice'}
        </button>
      </div>

      <ErrorBanner messages={messages} />

      {showForm && (
        <form className="card" onSubmit={handleCreateInvoice} style={{ padding: '1.4rem', marginBottom: '1.6rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label htmlFor="amount">Amount</label>
              <input id="amount" type="number" min="0" step="1" value={form.amount} onChange={update('amount')} required />
            </div>
            <div className="field">
              <label htmlFor="dueDate">Due date</label>
              <input id="dueDate" type="date" value={form.dueDate} onChange={update('dueDate')} required />
            </div>
            <div className="field">
              <label htmlFor="description">Description (optional)</label>
              <input id="description" value={form.description} onChange={update('description')} placeholder="e.g. Monthly membership" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Generating...' : 'Generate invoice'}
          </button>
        </form>
      )}

      <div className="card">
        {invoices.length === 0 ? (
          <div className="empty-state">No invoices for this customer yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
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