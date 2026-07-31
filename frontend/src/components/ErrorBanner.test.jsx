import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBanner from './ErrorBanner';

describe('ErrorBanner', () => {
  it('renders nothing when there is no error', () => {
    const { container } = render(<ErrorBanner messages={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when messages is undefined', () => {
    const { container } = render(<ErrorBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a single message as a sentence, without list furniture', () => {
    render(<ErrorBanner messages={['Customer not found']} />);

    expect(screen.getByText('Customer not found')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/please fix the following/i)).not.toBeInTheDocument();
  });

  it('lists every message when a request fails on several fields', () => {
    render(
      <ErrorBanner messages={['Gym name is required', 'Email is invalid', 'Phone number is required']} />
    );

    expect(screen.getByText(/please fix the following/i)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('Email is invalid')).toBeInTheDocument();
  });
});
