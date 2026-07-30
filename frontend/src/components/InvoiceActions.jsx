import { useState } from 'react';

/**
 * Mark-paid and cancel controls for one invoice, shared by the invoices list
 * and the customer detail page.
 *
 * Cancelling reveals a reason box first: the API requires a reason, so asking
 * for it before sending keeps the rule visible rather than surfacing it as a
 * validation error.
 */
export default function InvoiceActions({ invoice, onMarkPaid, onCancel }) {
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const settled = invoice.status === 'paid' || invoice.status === 'cancelled';

  async function submitCancel(e) {
    e.preventDefault();
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await onCancel(invoice._id, reason.trim());
      setCancelling(false);
      setReason('');
    } finally {
      setBusy(false);
    }
  }

  if (cancelling) {
    return (
      <form onSubmit={submitCancel} style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for cancelling"
          maxLength={300}
          required
          autoFocus
          style={{ padding: '0.35rem 0.5rem', minWidth: '12rem' }}
        />
        <button className="btn btn-danger" type="submit" disabled={busy || !reason.trim()}>
          {busy ? 'Cancelling...' : 'Confirm'}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            setCancelling(false);
            setReason('');
          }}
        >
          Back
        </button>
      </form>
    );
  }

  if (settled) {
    return invoice.status === 'cancelled' && invoice.cancellationReason ? (
      <span style={{ fontSize: '0.78rem', color: 'var(--color-mist)' }} title={invoice.cancellationReason}>
        {invoice.cancellationReason}
      </span>
    ) : null;
  }

  return (
    <>
      <button
        className="btn btn-ghost"
        onClick={() => onMarkPaid(invoice._id)}
        style={{ marginRight: '0.4rem' }}
      >
        Mark paid
      </button>
      <button className="btn btn-danger" onClick={() => setCancelling(true)}>
        Cancel
      </button>
    </>
  );
}