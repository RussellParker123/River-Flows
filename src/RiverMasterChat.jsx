import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from './supabaseClient';
import { contentBytes, streamRiverMaster } from './riverMasterChatClient';
import './RiverMasterChat.css';

export default function RiverMasterChat({ river, segment }) {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [authError, setAuthError] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const identity = useRef(null);
  const completed = useRef([]);
  const request = useRef(0);
  const controller = useRef(null);
  const authOperation = useRef(0);
  const reachKey = JSON.stringify([river?.name, river?.state, segment?.name, segment?.coordinates]);

  const cancel = useCallback(() => {
    request.current += 1;
    controller.current?.abort();
    controller.current = null;
  }, []);

  const clear = useCallback(() => {
    cancel();
    completed.current = [];
    setMessages([]);
    setAttempt(null);
    setQuestion('');
    setLoading(false);
    setError('');
  }, [cancel]);

  const applySession = useCallback(next => {
    if (!mounted.current) return;
    const nextIdentity = next?.user?.id || null;
    if (identity.current !== nextIdentity) {
      identity.current = nextIdentity;
      authOperation.current += 1;
      clear();
      setCode('');
      setCodeSent(false);
      setAuthBusy(false);
      setAuthNotice('');
      setAuthError('');
    }
    setSession(next);
    setCheckingSession(false);
  }, [clear]);

  useEffect(() => {
    mounted.current = true;
    let authChanged = false;
    let disposed = false;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (disposed) return;
      authChanged = true;
      applySession(next);
    });
    supabase.auth.getSession().then(({ data: result, error: sessionError }) => {
      if (disposed || !mounted.current || authChanged) return;
      if (sessionError) throw sessionError;
      applySession(result.session);
    }).catch(sessionError => {
      if (disposed || !mounted.current || authChanged) return;
      setCheckingSession(false);
      setAuthError(`Unable to check sign-in: ${sessionError.message}`);
    });
    return () => {
      disposed = true;
      mounted.current = false;
      authOperation.current += 1;
      cancel();
      data.subscription.unsubscribe();
    };
  }, [applySession, cancel]);

  useEffect(() => { clear(); }, [reachKey, clear]);

  async function authenticate(event, verify) {
    event.preventDefault();
    if (authBusy) return;
    const operation = ++authOperation.current;
    setAuthBusy(true);
    setAuthError('');
    setAuthNotice('');
    try {
      const result = verify
        ? await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
        : await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      if (!mounted.current || authOperation.current !== operation) return;
      if (result.error) throw result.error;
      if (verify) {
        if (!result.data?.session) throw new Error('No session was returned. Request a new code.');
        applySession(result.data.session);
      } else {
        setCodeSent(true);
        setAuthNotice('Check your email. If email codes are enabled, enter the code below; otherwise follow the sign-in link.');
      }
    } catch (authFailure) {
      if (mounted.current && authOperation.current === operation) {
        setAuthError(`Sign-in unavailable: ${authFailure.message}`);
      }
    } finally {
      if (mounted.current && authOperation.current === operation) setAuthBusy(false);
    }
  }

  async function signOut() {
    clear();
    const operation = ++authOperation.current;
    setAuthBusy(true);
    setAuthError('');
    try {
      const result = await supabase.auth.signOut();
      if (!mounted.current || operation !== authOperation.current) return;
      if (result.error) throw result.error;
      applySession(null);
    } catch (authFailure) {
      if (mounted.current && operation === authOperation.current) setAuthError(`Sign-out failed: ${authFailure.message}`);
    } finally {
      if (mounted.current && operation === authOperation.current) setAuthBusy(false);
    }
  }

  async function send(text) {
    const user = text.trim();
    if (controller.current || !session || !user) return;
    if (user.length > 4000 || contentBytes(user) > 4000) {
      setError('Questions must be at most 4,000 UTF-8 bytes (4,000 characters or fewer).');
      return;
    }
    const owner = identity.current;
    const id = ++request.current;
    const abortController = new AbortController();
    controller.current = abortController;
    const active = () => mounted.current && request.current === id && identity.current === owner;
    setAttempt({ user, partial: '', incomplete: false });
    setQuestion('');
    setError('');
    setLoading(true);
    let answer = '';
    try {
      const result = await supabase.auth.getSession();
      if (!active()) return;
      if (result.error) throw new Error(`Unable to check sign-in: ${result.error.message}`);
      const fresh = result.data?.session;
      if (!fresh || fresh.user.id !== owner) {
        applySession(fresh || null);
        throw new Error('Your sign-in changed or expired. Sign in again before asking.');
      }
      await streamRiverMaster({
        token: fresh.access_token,
        messages: [...completed.current.slice(-18), { role: 'user', content: user }],
        context: { riverName: river.name, state: river.state, segmentName: segment.name },
        signal: abortController.signal,
        onDelta: delta => {
          if (!active()) return;
          answer += delta;
          setAttempt({ user, partial: answer, incomplete: false });
        }
      });
      if (!active()) return;
      if (!answer.trim()) throw new Error('River Master completed without a reply. Please retry.');
      completed.current = [
        ...completed.current, { role: 'user', content: user }, { role: 'assistant', content: answer }
      ].slice(-20);
      setMessages(completed.current);
      setAttempt(null);
    } catch (failure) {
      if (!active()) return;
      setAttempt({ user, partial: answer, incomplete: true });
      setError(failure.name === 'AbortError' ? 'Reply stopped. Partial replies are not sent on retry.' : failure.message);
    } finally {
      if (active()) {
        controller.current = null;
        setLoading(false);
      }
    }
  }

  function stop() {
    cancel();
    setLoading(false);
    setAttempt(previous => previous && { ...previous, incomplete: true });
    setError('Reply stopped. Partial replies are not sent on retry.');
  }

  return (
    <section className="river-master-chat" aria-label="River Master chat">
      <h3>River Master AI</h3>
      <p className="river-master-context">{river?.name} ({river?.state}) · {segment?.name}</p>
      <p className="river-master-advisory">AI guidance, not a real-time person or a safety guarantee. Verify current flows, weather, access and hazards with official sources and local experts before paddling.</p>
      <p className="river-master-privacy">Chat stays in this page’s memory, not local storage, and is cleared on reach/account changes. Questions and reach context are sent to the server and AI provider. Do not share sensitive information. The last 20 messages are retained here. Outbound history is trimmed to 4,000 UTF-8 bytes per message and a 64 KiB request; older turns may be omitted. Displayed replies are not shortened to that outbound limit.</p>
      {checkingSession ? <p role="status">Checking sign-in…</p> : session ? (
        <div className="river-master-actions">
          <span>Signed in{session.user.email ? ` as ${session.user.email}` : ''}</span>
          <button type="button" onClick={signOut} disabled={authBusy}>Sign out</button>
        </div>
      ) : (
        <div>
          <p>Sign in to ask River Master. Email sign-in and the AI service must be configured by this site.</p>
          <form aria-label="Email sign-in" onSubmit={event => authenticate(event, false)}>
            <label>Email address<input type="email" autoComplete="email" required value={email}
              disabled={authBusy} onChange={event => { setEmail(event.target.value); setCodeSent(false); setCode(''); }} /></label>
            <button type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : 'Send sign-in email'}</button>
          </form>
          {codeSent && <form aria-label="Verify email code" onSubmit={event => authenticate(event, true)}>
            <label>Email code<input type="text" inputMode="numeric" autoComplete="one-time-code" required
              value={code} onChange={event => setCode(event.target.value)} disabled={authBusy} /></label>
            <button type="submit" disabled={authBusy}>Verify code</button>
          </form>}
        </div>
      )}
      {authNotice && <p role="status">{authNotice}</p>}
      {authError && <p role="alert">{authError}</p>}
      <div className="river-master-history" role="log" aria-label="Chat messages" aria-live="polite" aria-relevant="additions text">
        {messages.map((message, index) => <div className={`river-master-message ${message.role}`} key={index}>
          <strong>{message.role === 'user' ? 'You' : 'River Master AI'}</strong><p>{message.content}</p>
        </div>)}
        {attempt && <>
          <div className="river-master-message user"><strong>You</strong><p>{attempt.user}</p></div>
          {attempt.partial && <div className="river-master-message assistant"><strong>River Master AI{attempt.incomplete ? ' (incomplete)' : ''}</strong><p>{attempt.partial}</p></div>}
        </>}
      </div>
      {loading && <p role="status">River Master is responding…</p>}
      {error && <p role="alert">{error}</p>}
      <form aria-label="Ask River Master" onSubmit={event => { event.preventDefault(); send(question); }}>
        <label>Your question<textarea value={question} maxLength={4000} required
          disabled={!session || checkingSession || loading || authBusy} onChange={event => setQuestion(event.target.value)} /></label>
        <div className="river-master-actions">
          <button type="submit" disabled={!session || checkingSession || loading || authBusy || !question.trim()}>Ask River Master</button>
          {loading && <button type="button" onClick={stop}>Stop</button>}
          {attempt?.incomplete && !loading && <button type="button" disabled={!session || authBusy} onClick={() => send(attempt.user)}>Retry question</button>}
          <button type="button" onClick={clear} disabled={!messages.length && !attempt && !question}>Clear chat</button>
        </div>
      </form>
    </section>
  );
}
