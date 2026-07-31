import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoiceActions from './InvoiceActions';

function anInvoice(overrides = {}) {
  return { _id: 'inv1', status: 'pending', ...overrides };
}

describe('InvoiceActions', () => {
  it('marks an invoice paid', async () => {
    const onMarkPaid = vi.fn();
    render(<InvoiceActions invoice={anInvoice()} onMarkPaid={onMarkPaid} onCancel={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /mark paid/i }));

    expect(onMarkPaid).toHaveBeenCalledWith('inv1');
  });

  it('asks for a reason before cancelling rather than sending straight away', async () => {
    const onCancel = vi.fn();
    render(<InvoiceActions invoice={anInvoice()} onMarkPaid={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.getByPlaceholderText(/reason for cancelling/i)).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('sends the reason with the cancellation', async () => {
    const onCancel = vi.fn().mockResolvedValue(undefined);
    render(<InvoiceActions invoice={anInvoice()} onMarkPaid={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await userEvent.type(screen.getByPlaceholderText(/reason for cancelling/i), 'Member left the gym');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onCancel).toHaveBeenCalledWith('inv1', 'Member left the gym');
  });

  it('will not confirm a blank or whitespace-only reason', async () => {
    const onCancel = vi.fn();
    render(<InvoiceActions invoice={anInvoice()} onMarkPaid={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    const confirm = screen.getByRole('button', { name: /confirm/i });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByPlaceholderText(/reason for cancelling/i), '   ');
    expect(confirm).toBeDisabled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('trims the reason before sending it', async () => {
    const onCancel = vi.fn().mockResolvedValue(undefined);
    render(<InvoiceActions invoice={anInvoice()} onMarkPaid={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await userEvent.type(screen.getByPlaceholderText(/reason for cancelling/i), '  Duplicate  ');
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    expect(onCancel).toHaveBeenCalledWith('inv1', 'Duplicate');
  });

  it('backs out of cancelling without sending anything', async () => {
    const onCancel = vi.fn();
    render(<InvoiceActions invoice={anInvoice()} onMarkPaid={vi.fn()} onCancel={onCancel} />);

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
    await userEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.queryByPlaceholderText(/reason for cancelling/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark paid/i })).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('offers no actions on a paid invoice', () => {
    render(
      <InvoiceActions invoice={anInvoice({ status: 'paid' })} onMarkPaid={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows the reason instead of actions on a cancelled invoice', () => {
    render(
      <InvoiceActions
        invoice={anInvoice({ status: 'cancelled', cancellationReason: 'Member left the gym' })}
        onMarkPaid={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Member left the gym')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('still offers actions on an overdue invoice', () => {
    render(
      <InvoiceActions invoice={anInvoice({ status: 'overdue' })} onMarkPaid={vi.fn()} onCancel={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: /mark paid/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });
});
