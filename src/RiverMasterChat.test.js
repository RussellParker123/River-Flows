import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RiverMasterChat, { safeSourceUrl, ScheduledObservation } from './RiverMasterChat';

const context = { riverName: 'Snake River', riverState: 'Wyoming', segmentName: 'Canyon' };
let chatFetch;
beforeEach(() => {
  chatFetch = jest.fn();
  global.fetch = jest.fn((url, options) => options?.method === 'POST'
    ? chatFetch(url, options)
    : Promise.resolve({ ok: true, json: async () => ({ observation: null }) }));
});
function ask() {
  fireEvent.change(screen.getByLabelText('Ask about this river section'), { target: { value: 'What is known?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Ask River Master' }));
}

test('sends section context and displays text, cited timestamps and safety uncertainty', async () => {
  chatFetch.mockResolvedValue({ ok: true, json: async () => ({
    answer: '<img src=x onerror=alert(1)> Conditions unknown.',
    sources: [{ label: 'USGS', url: 'https://waterdata.usgs.gov/example', observedAt: '2026-10-09T12:00:00Z' },
      { label: 'Unsafe', url: 'javascript:alert(1)' }]
  }) });
  const { container } = render(<RiverMasterChat {...context} />);
  expect(screen.getByText(/No answer or flow reading guarantees a safe trip/)).toBeInTheDocument();
  ask();
  await screen.findByText(/<img src=x/);
  expect(container.querySelector('img')).toBeNull();
  expect(JSON.parse(chatFetch.mock.calls[0][1].body)).toEqual({ ...context, message: 'What is known?' });
  expect(screen.getByRole('link', { name: 'USGS' })).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.getByText('2026-10-09T12:00:00Z')).toBeInTheDocument();
  expect(screen.getByText('Unsafe (link unavailable)')).toBeInTheDocument();
});

test('aborts and ignores a stale response when section changes', async () => {
  let resolve;
  chatFetch.mockImplementation(() => new Promise(done => { resolve = done; }));
  const { rerender } = render(<RiverMasterChat {...context} />);
  ask();
  expect(screen.getByRole('button')).toBeDisabled();
  const signal = chatFetch.mock.calls[0][1].signal;
  rerender(<RiverMasterChat {...context} segmentName="Lower" />);
  expect(signal.aborted).toBe(true);
  resolve({ ok: true, json: async () => ({ answer: 'Old section answer', sources: [] }) });
  await waitFor(() => expect(screen.queryByText('Old section answer')).not.toBeInTheDocument());
  expect(screen.getByLabelText('Ask about this river section')).toHaveValue('');
});

test('disables without section and exposes retriable JSON errors', async () => {
  const { rerender } = render(<RiverMasterChat {...context} segmentName={null} />);
  expect(screen.getByRole('button')).toBeDisabled();
  rerender(<RiverMasterChat {...context} />);
  chatFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Service unavailable' }) });
  ask();
  expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
  expect(screen.getByRole('button')).toBeEnabled();
});

test('publishes verified stored observations with section query, timestamp and provenance', async () => {
  fetch.mockResolvedValue({ ok: true, json: async () => ({ observation: {
    flow: 0, unit: 'cfs', observedAt: '2026-10-09T12:00:00Z', associationVerified: true, reachSpecific: true,
    sourceUrl: 'https://waterdata.usgs.gov/monitoring-location/13010050'
  } }) });
  render(<ScheduledObservation {...context} />);
  expect(await screen.findByText('0 CFS')).toBeInTheDocument();
  const url = new URL(fetch.mock.calls[0][0], window.location.origin);
  expect(url.searchParams.get('riverName')).toBe(context.riverName);
  expect(url.searchParams.get('riverState')).toBe(context.riverState);
  expect(url.searchParams.get('segmentName')).toBe(context.segmentName);
  expect(screen.getByText('2026-10-09T12:00:00Z')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Official stored observation source' })).toBeInTheDocument();
});

test('does not label unapproved stored gauge data verified or convert missing data into zero', async () => {
  fetch.mockResolvedValue({ ok: true, json: async () => ({ observation: {
    flow: 10, unit: 'cfs', observedAt: '2026-10-09T12:00:00Z', associationVerified: false, reachSpecific: false
  } }) });
  render(<ScheduledObservation {...context} />);
  expect(await screen.findByText(/No verified stored observation is available/)).toBeInTheDocument();
  expect(screen.queryByText('10 CFS')).not.toBeInTheDocument();
});

test('stored observation requests abort and ignore previous section responses', async () => {
  let resolve;
  fetch.mockImplementationOnce(() => new Promise(done => { resolve = done; }))
    .mockResolvedValue({ ok: true, json: async () => ({ observation: null }) });
  const { rerender } = render(<ScheduledObservation {...context} />);
  const signal = fetch.mock.calls[0][1].signal;
  rerender(<ScheduledObservation {...context} segmentName="Lower" />);
  expect(signal.aborted).toBe(true);
  resolve({ ok: true, json: async () => ({ observation: {
    flow: 999, unit: 'cfs', observedAt: '2026-10-09T12:00:00Z', associationVerified: true, reachSpecific: true
  } }) });
  expect(await screen.findByText(/No verified stored observation is available/)).toBeInTheDocument();
  expect(screen.queryByText('999 CFS')).not.toBeInTheDocument();
});

test('stored observation failures explicitly report unknown conditions', async () => {
  fetch.mockResolvedValue({ ok: false });
  render(<ScheduledObservation {...context} />);
  expect(await screen.findByText(/Stored observations are temporarily unavailable/)).toBeInTheDocument();
  expect(screen.queryByText('0 CFS')).not.toBeInTheDocument();
});

test('allows only HTTPS official hosts, rejecting lookalikes and credentials', () => {
  expect(safeSourceUrl('https://alerts.weather.gov/test')).toBeTruthy();
  ['http://usgs.gov', 'https://usgs.gov.evil.example', 'https://evil-usgs.gov', 'https://user@usgs.gov', 'data:text/html,test'].forEach(url => {
    expect(safeSourceUrl(url)).toBeNull();
  });
});
