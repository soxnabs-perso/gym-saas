import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { describeApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';

const PLAN_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  pay_as_you_go: 'Pay as you go',
};

const STATUS_OPTIONS = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

const PAY_AS_YOU_GO = 'pay_as_you_go';

const EMPTY_FORM = {
  fullName: '',
  email: '',
  phone: '',
  membershipPlan: 'monthly',
  subscriptionFee: '',
  membershipStatus: 'active',
};

function formatAmount(value, currency = 'XOF') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  async function loadCustomers() {
    setLoading(true);
    try {
      const res = await api.get('/customers', { params: { archived: showArchived } });
      setCustomers(res.data.customers);
    } catch (err) {
      setMessages(describeApiError(err, 'Could not load customers').messages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, [showArchived]);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function startAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    clearErrors();
  }

  function startEdit(customer) {
    setEditingId(customer._id);
    setForm({
      fullName: customer.fullName,
      email: customer.email || '',
      phone: customer.phone || '',
      membershipPlan: customer.membershipPlan,
      subscriptionFee:
        typeof customer.subscriptionFee === 'number' ? String(customer.subscriptionFee) : '',
      membershipStatus: customer.membershipStatus,
    });
    setShowForm(true);
    clearErrors();
  }

  function clearErrors() {
    setMessages([]);
    setFieldErrors({});
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    clearErrors();

    const isPayAsYouGo = form.membershipPlan === PAY_AS_YOU_GO;
    const payload = {
      fullName: form.fullName,
      phone: form.phone,
      email: form.email,
      membershipPlan: form.membershipPlan,
      ...(isPayAsYouGo ? {} : { subscriptionFee: Number(form.subscriptionFee) }),
    };

    try {
      if (editingId) {
        await api.patch(`/customers/${editingId}`, {
          ...payload,
          membershipStatus: form.membershipStatus,
        });
      } else {
        await api.post('/customers', payload);
      }
      closeForm();
      await loadCustomers();
    } catch (err) {
      const described = describeApiError(err, 'Could not save this customer');
      setMessages(described.messages);
      setFieldErrors(described.fields);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(customer) {
    const message =
      `Archive ${customer.fullName}? They will be hidden from this list and cannot be ` +
      'invoiced, but their invoice history is kept and you can restore them later.';
    if (!window.confirm(message)) return;

    try {
      await api.post(`/customers/${customer._id}/archive`);
      await loadCustomers();
    } catch (err) {
      setMessages(describeApiError(err, 'Could not archive this customer').messages);
    }
  }

  async function handleRestore(customer) {
    try {
      await api.post(`/customers/${customer._id}/restore`);
      await loadCustomers();
    } catch (err) {
      setMessages(describeApiError(err, 'Could not restore this customer').messages);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{showArchived ? 'Archived customers' : 'Customers'}</h1>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="btn btn-ghost" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'View active' : 'View archived'}
          </button>
          {!showArchived &&
            (showForm ? (
              <button className="btn btn-ghost" onClick={closeForm}>
                Cancel
              </button>
            ) : (
              <button className="btn btn-accent" onClick={startAdd}>
                Add customer
              </button>
            ))}
        </div>
      </div>

      <ErrorBanner messages={messages} />

      {showForm && !showArchived && (
        <form className="card" onSubmit={handleSubmit} style={{ padding: '1.4rem', marginBottom: '1.6rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            {editingId ? 'Edit customer' : 'New customer'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="field">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" value={form.fullName} onChange={update('fullName')} required />
              {fieldErrors.fullName && <small style={{ color: '#b3261e' }}>{fieldErrors.fullName}</small>}
              <small style={{ color: 'var(--color-mist)', fontSize: '0.75rem' }}>
                Letters and spaces only, 2 to 70 characters
              </small>
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={form.phone} onChange={update('phone')} required />
              {fieldErrors.phone && <small style={{ color: '#b3261e' }}>{fieldErrors.phone}</small>}
            </div>
            <div className="field">
              <label htmlFor="email">Email (optional)</label>
              <input id="email" type="email" value={form.email} onChange={update('email')} />
              {fieldErrors.email && <small style={{ color: '#b3261e' }}>{fieldErrors.email}</small>}
            </div>
            <div className="field">
              <label htmlFor="membershipPlan">Plan</label>
              <select id="membershipPlan" value={form.membershipPlan} onChange={update('membershipPlan')}>
                {Object.entries(PLAN_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="subscriptionFee">
                Subscription fee{form.membershipPlan === PAY_AS_YOU_GO ? ' (not applicable)' : ''}
              </label>
              <input
                id="subscriptionFee"
                type="number"
                min="0"
                step="1"
                value={form.subscriptionFee}
                onChange={update('subscriptionFee')}
                disabled={form.membershipPlan === PAY_AS_YOU_GO}
                required={form.membershipPlan !== PAY_AS_YOU_GO}
                placeholder={form.membershipPlan === PAY_AS_YOU_GO ? 'Billed per visit' : 'e.g. 15000'}
              />
              {fieldErrors.subscriptionFee && (
                <small style={{ color: '#b3261e' }}>{fieldErrors.subscriptionFee}</small>
              )}
            </div>
            {editingId && (
              <div className="field">
                <label htmlFor="membershipStatus">Membership status</label>
                <select
                  id="membershipStatus"
                  value={form.membershipStatus}
                  onChange={update('membershipStatus')}
                >
                  {Object.entries(STATUS_OPTIONS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : editingId ? 'Save changes' : 'Save customer'}
          </button>
        </form>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            {showArchived
              ? 'No archived customers.'
              : 'No customers yet. Add your first member to get started.'}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Plan</th>
                <th>Fee</th>
                <th>Status</th>
                <th>Contact</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c._id}>
                  <td>
                    <Link to={`/customers/${c._id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>
                      {c.fullName}
                    </Link>
                  </td>
                  <td>{PLAN_LABELS[c.membershipPlan]}</td>
                  <td>
                    {typeof c.subscriptionFee === 'number' ? formatAmount(c.subscriptionFee) : '—'}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{c.membershipStatus}</td>
                  <td>{c.phone}{c.email ? ` · ${c.email}` : ''}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {showArchived ? (
                      <button className="btn btn-ghost" onClick={() => handleRestore(c)}>
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          className="btn btn-ghost"
                          onClick={() => startEdit(c)}
                          style={{ marginRight: '0.4rem' }}
                        >
                          Edit
                        </button>
                        <button className="btn btn-danger" onClick={() => handleArchive(c)}>
                          Archive
                        </button>
                      </>
                    )}
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