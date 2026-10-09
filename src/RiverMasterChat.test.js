import React from 'react';
import { TextEncoder } from 'util';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RiverMasterChat from './RiverMasterChat';
import { supabase } from './supabaseClient';
import { streamRiverMaster } from './riverMasterChatClient';

jest.mock('./supabaseClient', () => ({
  supabase: { auth: {
    getSession: jest.fn(), onAuthStateChange: jest.fn(),
    signInWithOtp: jest.fn(), verifyOtp: jest.fn(), signOut: jest.fn()
  } }
}));
jest.mock('./riverMasterChatClient', () => ({
  ...jest.requireActual('./riverMasterChatClient'),
  streamRiverMaster: jest.fn()
}));

const river = { name: 'Test River', state: 'OR' };
const segment = { name: 'Upper Reach' };
const session = { user: { id: 'first-user', email: 'paddler@example.com' }, access_token: 'test-access' };
let authChange;
let unsubscribe;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((success, failure) => { resolve = success; reject = failure; });
  return { promise, resolve, reject };
}

beforeAll(() => { global.TextEncoder = TextEncoder; });
beforeEach(() => {
  jest.clearAllMocks();
  unsubscribe = jest.fn();
  supabase.auth.onAuthStateChange.mockImplementation(callback => {
    authChange = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  supabase.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  supabase.auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  supabase.auth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
  supabase.auth.signOut.mockResolvedValue({ error: null });
  streamRiverMaster.mockResolvedValue();
});

async function start() {
  const result = render(<RiverMasterChat river={river} segment={segment} />);
  await screen.findByText('Signed in as paddler@example.com');
  return result;
}

function ask(text = 'What should I check?') {
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'Ask River Master' }));
}

test('requires sign-in, describes context/privacy/safety, and supports email OTP forms', async () => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  render(<RiverMasterChat river={river} segment={segment} />);
  await screen.findByRole('button', { name: 'Send sign-in email' });
  expect(screen.getByRole('button', { name: 'Ask River Master' })).toBeDisabled();
  expect(screen.getByText(/not a real-time person or a safety guarantee/)).toBeInTheDocument();
  expect(screen.getByText(/not local storage/)).toBeInTheDocument();
  expect(screen.getByText('Test River (OR) · Upper Reach')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'paddler@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send sign-in email' }));
  await screen.findByLabelText('Email code');
  expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'paddler@example.com', options: { shouldCreateUser: true } });
  fireEvent.change(screen.getByLabelText('Email code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));
  await screen.findByText('Signed in as paddler@example.com');
  expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ email: 'paddler@example.com', token: '123456', type: 'email' });
  expect(streamRiverMaster).not.toHaveBeenCalled();
});

test('reports unavailable authentication without claiming configuration', async () => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  supabase.auth.signInWithOtp.mockResolvedValue({ error: { message: 'Email provider disabled' } });
  render(<RiverMasterChat river={river} segment={segment} />);
  await screen.findByRole('button', { name: 'Send sign-in email' });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'paddler@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send sign-in email' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Email provider disabled');
});

test('sends authenticated context and incrementally renders plain text, then retains completed turns', async () => {
  const reply = deferred();
  streamRiverMaster.mockReturnValueOnce(reply.promise);
  await start();
  ask();
  await waitFor(() => expect(streamRiverMaster).toHaveBeenCalledTimes(1));
  const options = streamRiverMaster.mock.calls[0][0];
  expect(options).toMatchObject({
    token: 'test-access',
    context: { riverName: 'Test River', state: 'OR', segmentName: 'Upper Reach' },
    messages: [{ role: 'user', content: 'What should I check?' }]
  });
  act(() => { options.onDelta('<script>plain</script>'); });
  expect(screen.getByText('<script>plain</script>')).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
  expect(screen.getByRole('button', { name: 'Ask River Master' })).toBeDisabled();
  await act(async () => { options.onDelta(' water'); reply.resolve(); });
  streamRiverMaster.mockImplementationOnce(async ({ onDelta }) => { onDelta('Next answer'); });
  ask('Another question');
  await screen.findByText('Next answer');
  expect(streamRiverMaster.mock.calls[1][0].messages).toEqual([
    { role: 'user', content: 'What should I check?' },
    { role: 'assistant', content: '<script>plain</script> water' },
    { role: 'user', content: 'Another question' }
  ]);
  fireEvent.click(screen.getByRole('button', { name: 'Clear chat' }));
  expect(screen.queryByText('Next answer')).not.toBeInTheDocument();
});

test('Stop cancels and retry excludes incomplete turns, ignores a late stopped response', async () => {
  const first = deferred();
  const retry = deferred();
  streamRiverMaster.mockReturnValueOnce(first.promise).mockReturnValueOnce(retry.promise);
  await start();
  ask('Retry me');
  await waitFor(() => expect(streamRiverMaster).toHaveBeenCalledTimes(1));
  const original = streamRiverMaster.mock.calls[0][0];
  act(() => original.onDelta('Partial'));
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
  expect(original.signal.aborted).toBe(true);
  expect(screen.getByText('River Master AI (incomplete)')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry question' }));
  await waitFor(() => expect(streamRiverMaster).toHaveBeenCalledTimes(2));
  const latest = streamRiverMaster.mock.calls[1][0];
  expect(latest.messages).toEqual([{ role: 'user', content: 'Retry me' }]);
  await act(async () => { original.onDelta('stale'); first.resolve(); });
  expect(screen.queryByText(/stale/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
  await act(async () => { latest.onDelta('Completed'); retry.resolve(); });
  expect(screen.getByText('Completed')).toBeInTheDocument();
});

test('preserves the full multi-delta reply beyond the outbound 4,000-byte limit', async () => {
  const first = '水'.repeat(1200);
  const second = '🚣'.repeat(400) + ' full response ending';
  const answer = first + second;
  const pending = deferred();
  streamRiverMaster.mockReturnValueOnce(pending.promise);
  await start();
  ask('Give a detailed answer');
  await waitFor(() => expect(streamRiverMaster).toHaveBeenCalledTimes(1));
  const options = streamRiverMaster.mock.calls[0][0];
  act(() => options.onDelta(first));
  expect(screen.getByText(first)).toBeInTheDocument();
  act(() => options.onDelta(second));
  expect(screen.getByText(answer)).toBeInTheDocument();
  await act(async () => { pending.resolve(); });
  expect(screen.getByText(answer)).toBeInTheDocument();
  expect(new TextEncoder().encode(answer).length).toBeGreaterThan(4000);
  streamRiverMaster.mockImplementationOnce(async ({ onDelta }) => { onDelta('Follow-up'); });
  ask('Next question');
  await screen.findByText('Follow-up');
  expect(screen.getByText(answer)).toBeInTheDocument();
  expect(streamRiverMaster.mock.calls[1][0].messages[1]).toEqual({ role: 'assistant', content: answer });
});

test('provider errors permit retry without including partial replies', async () => {
  streamRiverMaster.mockImplementationOnce(async ({ onDelta }) => {
    onDelta('Unfinished');
    throw new Error('Provider unavailable');
  });
  await start();
  ask();
  expect(await screen.findByRole('alert')).toHaveTextContent('Provider unavailable');
  streamRiverMaster.mockImplementationOnce(async ({ onDelta }) => { onDelta('Done'); });
  fireEvent.click(screen.getByRole('button', { name: 'Retry question' }));
  await screen.findByText('Done');
  expect(streamRiverMaster.mock.calls[1][0].messages).toEqual([{ role: 'user', content: 'What should I check?' }]);
});

test.each(['reach', 'user', 'logout'])('%s change clears history, cancels and ignores stale output', async change => {
  const reply = deferred();
  streamRiverMaster.mockReturnValueOnce(reply.promise);
  const { rerender } = await start();
  ask();
  await waitFor(() => expect(streamRiverMaster).toHaveBeenCalledTimes(1));
  const options = streamRiverMaster.mock.calls[0][0];
  act(() => options.onDelta('Old reply'));
  if (change === 'reach') rerender(<RiverMasterChat river={river} segment={{ name: 'Lower Reach' }} />);
  else act(() => authChange('SIGNED_OUT', change === 'logout' ? null : { ...session, user: { id: 'new-user' } }));
  expect(options.signal.aborted).toBe(true);
  expect(screen.queryByText('Old reply')).not.toBeInTheDocument();
  await act(async () => { options.onDelta('Stale reply'); reply.resolve(); });
  expect(screen.queryByText(/Stale reply/)).not.toBeInTheDocument();
});

test('unmount aborts stream and unsubscribes auth', async () => {
  streamRiverMaster.mockReturnValueOnce(new Promise(() => {}));
  const { unmount } = await start();
  ask();
  await waitFor(() => expect(streamRiverMaster).toHaveBeenCalledTimes(1));
  const options = streamRiverMaster.mock.calls[0][0];
  unmount();
  expect(options.signal.aborted).toBe(true);
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});

test('stale initial getSession cannot override an auth change', async () => {
  const initial = deferred();
  supabase.auth.getSession.mockReturnValueOnce(initial.promise);
  render(<RiverMasterChat river={river} segment={segment} />);
  act(() => authChange('SIGNED_IN', session));
  await act(async () => { initial.resolve({ data: { session: null }, error: null }); });
  expect(screen.getByText('Signed in as paddler@example.com')).toBeInTheDocument();
});

test('StrictMode discards an initial session lookup from its cleaned-up effect', async () => {
  const stale = deferred();
  supabase.auth.getSession.mockReturnValueOnce(stale.promise);
  render(<React.StrictMode><RiverMasterChat river={river} segment={segment} /></React.StrictMode>);
  await screen.findByText('Signed in as paddler@example.com');
  await act(async () => { stale.resolve({ data: { session: null }, error: null }); });
  expect(screen.getByText('Signed in as paddler@example.com')).toBeInTheDocument();
});

test('cancels before session lookup completes and prevents oversized Unicode questions', async () => {
  await start();
  const fresh = deferred();
  supabase.auth.getSession.mockReturnValueOnce(fresh.promise);
  ask();
  fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
  await act(async () => { fresh.resolve({ data: { session }, error: null }); });
  expect(streamRiverMaster).not.toHaveBeenCalled();
  ask('🚣'.repeat(1001));
  expect(screen.getByRole('alert')).toHaveTextContent('4,000 UTF-8 bytes');
  expect(streamRiverMaster).not.toHaveBeenCalled();
});

test('sign-out clears completed history and disables requests', async () => {
  streamRiverMaster.mockImplementationOnce(async ({ onDelta }) => { onDelta('Old completed reply'); });
  await start();
  ask();
  await screen.findByText('Old completed reply');
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('button', { name: 'Send sign-in email' });
  expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Old completed reply')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Ask River Master' })).toBeDisabled();
});
