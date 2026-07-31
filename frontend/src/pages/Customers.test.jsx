import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Customers from './Customers';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

function customer(overrides = {}) {
  return {
    _id: 'c1',
    fullName: 'Moussa Ndiaye',
    phone: '+221770000001',
    email: 'moussa@member.test',
    membershipPlan: 'monthly',
    membershipStatus: 'active',
    subscriptionFee: 15000,
    ...overrides,
  };
}

function listResponse(customers) {
  return {
    data: { customers, pagination: { page: 1, limit: 50, total: customers.length, pages: 1 } },
  };
}

function validationError(errors) {
  return { response: { status: 400, data: { message: 'Validation failed', errors } } };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Customers />
    </MemoryRouter>
  );
}

beforeEach(() => {
  api.get.mockResolvedValue(listResponse([customer()]));
  api.post.mockResolvedValue({ data: { customer: customer() } });
  api.patch.mockResolvedValue({ data: { customer: customer() } });
});

describe('Customers list', () => {
  it('shows a customer with plan, fee and contact details', async () => {
    renderPage();

    expect(await screen.findByText('Moussa Ndiaye')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText(/15,000/)).toBeInTheDocument();
    expect(screen.getByText(/\+221770000001/)).toBeInTheDocument();
  });

  it('asks for active customers by default', async () => {
    renderPage();

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/customers', { params: { archived: false } })
    );
  });

  it('shows a dash for a pay-as-you-go member with no fee', async () => {
    api.get.mockResolvedValue(
      listResponse([customer({ membershipPlan: 'pay_as_you_go', subscriptionFee: undefined })])
    );
    renderPage();

    expect(await screen.findByText('Pay as you go')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('reports a failed load without crashing', async () => {
    api.get.mockRejectedValue({ request: {} });
    renderPage();

    expect(await screen.findByText(/could not reach the server/i)).toBeInTheDocument();
  });
});

describe('Adding a customer', () => {
  it('sends the form as a new customer', async () => {
    renderPage();
    await screen.findByText('Moussa Ndiaye');

    await userEvent.click(screen.getByRole('button', { name: /add customer/i }));
    await userEvent.type(screen.getByLabelText(/full name/i), 'Fatou Sarr');
    await userEvent.type(screen.getByLabelText(/^phone$/i), '+221770000002');
    await userEvent.type(screen.getByLabelText(/subscription fee/i), '20000');
    await userEvent.click(screen.getByRole('button', { name: /save customer/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const [url, body] = api.post.mock.calls[0];
    expect(url).toBe('/customers');
    expect(body).toMatchObject({
      fullName: 'Fatou Sarr',
      phone: '+221770000002',
      subscriptionFee: 20000,
      membershipPlan: 'monthly',
    });
  });

  it('omits the fee for a pay-as-you-go member, who is billed per visit', async () => {
    renderPage();
    await screen.findByText('Moussa Ndiaye');

    await userEvent.click(screen.getByRole('button', { name: /add customer/i }));
    await userEvent.type(screen.getByLabelText(/full name/i), 'Drop In');
    await userEvent.type(screen.getByLabelText(/^phone$/i), '+221770000003');
    await userEvent.selectOptions(screen.getByLabelText(/plan/i), 'pay_as_you_go');
    await userEvent.click(screen.getByRole('button', { name: /save customer/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('subscriptionFee');
  });

  it('shows the API validation messages instead of a generic failure', async () => {
    api.post.mockRejectedValue(
      validationError([
        { field: 'fullName', message: 'Only letters and spaces are allowed for names' },
        { field: 'phone', message: 'Phone number is required' },
      ])
    );
    renderPage();
    await screen.findByText('Moussa Ndiaye');

    await userEvent.click(screen.getByRole('button', { name: /add customer/i }));
    await userEvent.type(screen.getByLabelText(/full name/i), 'Custom1');
    await userEvent.type(screen.getByLabelText(/^phone$/i), '+221770000004');
    await userEvent.type(screen.getByLabelText(/subscription fee/i), '20000');
    await userEvent.click(screen.getByRole('button', { name: /save customer/i }));

    const nameErrors = await screen.findAllByText(/only letters and spaces/i);
    expect(nameErrors).toHaveLength(2);
    expect(screen.getAllByText('Phone number is required')).toHaveLength(2);

    const nameField = screen.getByLabelText(/full name/i).closest('.field');
    expect(within(nameField).getByText(/only letters and spaces/i)).toBeInTheDocument();

    expect(screen.queryByText('Validation failed')).not.toBeInTheDocument();
  });

  it('surfaces a duplicate email conflict in the API\'s words', async () => {
    api.post.mockRejectedValue({
      response: { status: 409, data: { message: 'That email is already in use' } },
    });
    renderPage();
    await screen.findByText('Moussa Ndiaye');

    await userEvent.click(screen.getByRole('button', { name: /add customer/i }));
    await userEvent.type(screen.getByLabelText(/full name/i), 'Fatou Sarr');
    await userEvent.type(screen.getByLabelText(/^phone$/i), '+221770000005');
    await userEvent.type(screen.getByLabelText(/subscription fee/i), '20000');
    await userEvent.click(screen.getByRole('button', { name: /save customer/i }));

    expect(await screen.findByText('That email is already in use')).toBeInTheDocument();
  });
});

describe('Editing a customer', () => {
  it('prefills the form and PATCHes the change', async () => {
    renderPage();
    await screen.findByText('Moussa Ndiaye');

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByLabelText(/full name/i)).toHaveValue('Moussa Ndiaye');
    expect(screen.getByLabelText(/subscription fee/i)).toHaveValue(15000);

    await userEvent.selectOptions(screen.getByLabelText(/membership status/i), 'paused');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    const [url, body] = api.patch.mock.calls[0];
    expect(url).toBe('/customers/c1');
    expect(body).toMatchObject({ membershipStatus: 'paused', fullName: 'Moussa Ndiaye' });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('offers a status field only when editing', async () => {
    renderPage();
    await screen.findByText('Moussa Ndiaye');

    await userEvent.click(screen.getByRole('button', { name: /add customer/i }));
    expect(screen.queryByLabelText(/membership status/i)).not.toBeInTheDocument();
  });
});

describe('Archiving', () => {
  it('archives after confirmation and never calls delete', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.post.mockResolvedValue({ data: { customer: customer() } });
    renderPage();
    await screen.findByText('Moussa Ndiaye');

    await userEvent.click(screen.getByRole('button', { name: /^archive$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/customers/c1/archive'));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('does nothing when the confirmation is dismissed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await screen.findByText('Moussa Ndiaye');

    await userEvent.click(screen.getByRole('button', { name: /^archive$/i }));

    expect(api.post).not.toHaveBeenCalled();
  });

  it('switches to the archived view and offers restore there', async () => {
    renderPage();
    await screen.findByText('Moussa Ndiaye');

    api.get.mockResolvedValue(
      listResponse([customer({ archivedAt: '2026-07-30T00:00:00.000Z', membershipStatus: 'cancelled' })])
    );
    await userEvent.click(screen.getByRole('button', { name: /view archived/i }));

    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith('/customers', { params: { archived: true } })
    );

    expect(await screen.findByRole('heading', { name: /archived customers/i })).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /moussa ndiaye/i });
    expect(within(row).getByRole('button', { name: /restore/i })).toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /archive/i })).not.toBeInTheDocument();
  });

  it('restores an archived customer', async () => {
    api.get.mockResolvedValue(
      listResponse([customer({ archivedAt: '2026-07-30T00:00:00.000Z' })])
    );
    renderPage();
    await screen.findByText('Moussa Ndiaye');

    await userEvent.click(screen.getByRole('button', { name: /view archived/i }));
    await userEvent.click(await screen.findByRole('button', { name: /restore/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/customers/c1/restore'));
  });
});
