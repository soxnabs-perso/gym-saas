/**
 * Shows one message as a sentence, or several as a list, so a request that
 * failed on three fields reports all three rather than the first.
 */
export default function ErrorBanner({ messages }) {
  if (!messages || messages.length === 0) return null;

  if (messages.length === 1) {
    return <div className="error-banner">{messages[0]}</div>;
  }

  return (
    <div className="error-banner">
      <strong style={{ display: 'block', marginBottom: '0.3rem' }}>
        Please fix the following:
      </strong>
      <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {messages.map((message, index) => (
          <li key={index}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
