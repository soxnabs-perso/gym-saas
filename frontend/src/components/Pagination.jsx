/**
 * Page controls for a list, driven entirely by the `pagination` block the API returns.
 * The bounds come from `pages` and `total` rather than from the length of the current page, because a short page is
 * not a reliable signal that there is nothing after it: a list whose size is an exact multiple of the page size ends
 * on a full page.
 */
export default function Pagination({ pagination, page, onGoToPage, noun = 'record', disabled = false }) {
  if (!pagination || pagination.total === 0) return null;

  const { total, pages } = pagination;
  const label = total === 1 ? noun : `${noun}s`;

  return (
    <nav
      aria-label="Pagination"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '0.9rem 1.2rem',
        borderTop: '1px solid #e7e8e3',
        fontSize: '0.82rem',
        color: 'var(--color-mist)',
      }}
    >
      <span>
        {pages > 1 ? `Page ${page} of ${pages} · ` : ''}
        {total} {label}
      </span>

      {pages > 1 && (
        <span style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            className="btn btn-ghost"
            onClick={() => onGoToPage(page - 1)}
            disabled={disabled || page <= 1}
          >
            Previous
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => onGoToPage(page + 1)}
            disabled={disabled || page >= pages}
          >
            Next
          </button>
        </span>
      )}
    </nav>
  );
}
