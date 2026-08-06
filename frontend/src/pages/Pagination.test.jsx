import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Customers from './Customers';
import Invoices from './Invoices';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

function customer(index) {
  return {
    _id: `c${index}`,
    fullName: `Member ${index}`,
    phone: `+22177000${String(index).padStart(4, '0')}`,
    membershipPlan: 'monthly',
    membershipStatus: 'active',
    subscriptionFee: 15000,
  };
}

function invoice(index) {
  return {
    _id: `i${index}`,
    invoiceNumber: `INV-000${index}`,
    amount: 15000,
    currency: 'XOF',
    status: 'pending',
    dueDate: '2026-09-01T00:00:00.000Z',
    customer: { _id: 'c1', fullName: 'Moussa Ndiaye' },
  };
}

function page(items, { page = 1, limit = 20, total, pages }, key = 'customers') {
  return { data: { [key]: items, pagination: { page, limit, total, pages } } };
}

/** Surfaces the current query string so a test can assert what ended up in the URL. */
function LocationProbe() {
  const location = useLocation();
  return <span data-testid="query">{location.search}</span>;
}

function renderCustomers(initialEntry = '/customers') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <Routes>
        <Route path="/customers" element={<Customers />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  api.post.mockResolvedValue({ data: {} });
  api.patch.mockResolvedValue({ data: {} });
});

describe('paging through a list', () => {
  it('shows the total and the page position when there is more than one page', async () => {
    api.get.mockResolvedValue(page([customer(1)], { total: 63, pages: 4 }));
    renderCustomers();

    expect(await screen.findByText(/Page 1 of 4 · 63 customers/)).toBeInTheDocument();
  });

  it('hides the controls when everything fits on one page', async () => {
    api.get.mockResolvedValue(page([customer(1)], { total: 1, pages: 1 }));
    renderCustomers();

    await screen.findByText('Member 1');
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    expect(screen.getByText(/1 customer$/)).toBeInTheDocument();
  });

  it('renders nothing at all when the list is empty', async () => {
    api.get.mockResolvedValue(page([], { total: 0, pages: 0 }));
    renderCustomers();

    await screen.findByText(/no customers yet/i);
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('asks the API for the next page and records it in the URL', async () => {
    api.get.mockResolvedValue(page([customer(1)], { total: 63, pages: 4 }));
    renderCustomers();
    await screen.findByText('Member 1');

    await userEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        '/customers',
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })
      )
    );
    expect(screen.getByTestId('query').textContent).toContain('page=2');
  });

  it('starts on the page named in the URL, so a refresh or a shared link keeps its place', async () => {
    api.get.mockResolvedValue(page([customer(1)], { page: 3, total: 63, pages: 4 }));
    renderCustomers('/customers?page=3');

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(
        '/customers',
        expect.objectContaining({ params: expect.objectContaining({ page: 3 }) })
      )
    );
    expect(await screen.findByText(/Page 3 of 4/)).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last', async () => {
    api.get.mockResolvedValue(page([customer(1)], { page: 1, total: 63, pages: 4 }));
    const { unmount } = renderCustomers();
    await screen.findByText('Member 1');

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();
    unmount();

    api.get.mockResolvedValue(page([customer(1)], { page: 4, total: 63, pages: 4 }));
    renderCustomers('/customers?page=4');
    await screen.findByText('Member 1');

    expect(screen.getByRole('button', { name: /previous/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('keeps a full last page from implying there is another one after it', async () => {
    api.get.mockResolvedValue(
      page([customer(1), customer(2)], { page: 2, limit: 2, total: 4, pages: 2 })
    );
    renderCustomers('/customers?page=2');
    await screen.findByText('Member 1');

    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});

describe('filters and paging together', () => {
  it('returns to the first page when the filter changes', async () => {
    api.get.mockResolvedValue(page([customer(1)], { page: 3, total: 63, pages: 4 }));
    renderCustomers('/customers?page=3');
    await screen.findByText('Member 1');

    await userEvent.click(screen.getByRole('button', { name: /view archived/i }));

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        '/customers',
        expect.objectContaining({ params: expect.objectContaining({ archived: true, page: 1 }) })
      )
    );
  });

  it('never asks for a page beyond the end of the list', async () => {
    api.get.mockResolvedValue(page([], { page: 9, total: 3, pages: 1 }));
    renderCustomers('/customers?page=9');

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        '/customers',
        expect.objectContaining({ params: expect.objectContaining({ page: 1 }) })
      )
    );
  });

  it('omits a blank status rather than sending one the API rejects', async () => {
    api.get.mockResolvedValue(page([invoice(1)], { total: 1, pages: 1 }, 'invoices'));

    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <Routes>
          <Route path="/invoices" element={<Invoices />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(api.get.mock.calls[0][1].params).not.toHaveProperty('status');
  });

  it('sends the chosen invoice status and pages within it', async () => {
    api.get.mockResolvedValue(page([invoice(1)], { total: 40, pages: 2 }, 'invoices'));

    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <Routes>
          <Route path="/invoices" element={<Invoices />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('INV-0001');

    await userEvent.selectOptions(screen.getByLabelText(/filter by status/i), 'paid');

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        '/invoices',
        expect.objectContaining({ params: expect.objectContaining({ status: 'paid', page: 1 }) })
      )
    );
  });
});

describe('overlapping requests', () => {
  it('aborts a request that a newer one has superseded', async () => {
    api.get.mockResolvedValue(page([customer(1)], { total: 63, pages: 4 }));
    renderCustomers();
    await screen.findByText('Member 1');

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(1));

    const signals = api.get.mock.calls.map(([, config]) => config.signal);
    expect(signals.every((signal) => signal instanceof AbortSignal)).toBe(true);
    expect(signals[0].aborted).toBe(true);
  });
});
