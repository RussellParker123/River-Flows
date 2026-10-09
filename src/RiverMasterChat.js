import { useEffect, useId, useRef, useState } from 'react';
import './RiverMasterChat.css';

const officialDomains = ['usgs.gov', 'weather.gov', 'noaa.gov', 'nps.gov', 'fs.usda.gov', 'blm.gov', 'recreation.gov'];

export function safeSourceUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.username || url.password || url.protocol !== 'https:') return null;
    if (url.origin === window.location.origin ||
        officialDomains.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
      return url.href;
    }
  } catch {}
  return null;
}

function Source({ source }) {
  if (!source || typeof source.label !== 'string') return null;
  const url = safeSourceUrl(source.url);
  const time = typeof source.observedAt === 'string' && Number.isFinite(Date.parse(source.observedAt))
    ? source.observedAt : null;
  return <li>
    {url ? <a href={url} target="_blank" rel="noopener noreferrer">{source.label}</a> : <span>{source.label} (link unavailable)</span>}
    {' — '}{time ? <>Observed: <time dateTime={time}>{time}</time></> : 'Observation time not provided'}
  </li>;
}

export function ScheduledObservation({ riverName, riverState, segmentName }) {
  const [state, setState] = useState({ loading: true, observation: null, error: false });
  const enabled = Boolean(riverName && riverState && segmentName);

  useEffect(() => {
    let active = true;
    let request;
    const refresh = async () => {
      request?.abort();
      const controller = new AbortController();
      request = controller;
      setState({ loading: true, observation: null, error: false });
      if (!enabled) {
        setState({ loading: false, observation: null, error: false });
        return;
      }
      try {
        const params = new URLSearchParams({ riverName, riverState, segmentName });
        const response = await fetch(`/api/river-observations?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Observation service unavailable');
        const data = await response.json();
        if (!active || controller.signal.aborted || request !== controller) return;
        setState({ loading: false, observation: data.observation ?? null, error: false });
      } catch {
        if (active && !controller.signal.aborted && request === controller) {
          setState({ loading: false, observation: null, error: true });
        }
      }
    };
    refresh();
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => {
      active = false;
      request?.abort();
      clearInterval(timer);
    };
  }, [riverName, riverState, segmentName, enabled]);

  const observation = state.observation;
  const valid = observation?.associationVerified === true && observation.reachSpecific === true &&
    observation.unit === 'cfs' && Number.isFinite(observation.flow) && observation.flow >= 0 &&
    typeof observation.observedAt === 'string' && Number.isFinite(Date.parse(observation.observedAt));
  const stale = valid && Date.now() - Date.parse(observation.observedAt) > 2 * 60 * 60 * 1000;
  const sourceUrl = safeSourceUrl(observation?.sourceUrl);
  return <div className="river-master-observation" aria-live="polite">
    <h4>Automatically collected section observation</h4>
    {state.loading ? <p role="status">Loading stored section observation…</p>
      : state.error ? <p>Stored observations are temporarily unavailable. Conditions remain unknown.</p>
      : valid ? <>
        <p><strong>{Math.round(observation.flow)} CFS</strong> instantaneous gauge discharge.
          {' '}Approved gauge-to-section mapping; this is not a safety guarantee.</p>
        <p>Observed: <time dateTime={observation.observedAt}>{observation.observedAt}</time>. Readings may be stale or provisional.</p>
        {stale && <p><strong>Stale observation (over two hours old): current conditions are unknown.</strong></p>}
        {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">Official stored observation source</a>
          : <p>Official source link unavailable.</p>}
      </> : <p>No verified stored observation is available for this section. Direct browser gauge readings below remain unverified for the reach.</p>}
  </div>;
}

export default function RiverMasterChat({ riverName, riverState, segmentName }) {
  const id = useId();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef(null);
  const enabled = Boolean(riverName && riverState && segmentName);

  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setMessage('');
    setResult(null);
    setError('');
    setLoading(false);
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [riverName, riverState, segmentName]);

  async function submit(event) {
    event.preventDefault();
    if (!enabled || loading || !message.trim()) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/river-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ message: message.trim(), riverName, riverState, segmentName })
      });
      const data = await response.json();
      if (request.current !== controller || controller.signal.aborted) return;
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'River Master is unavailable. Please retry.');
      if (typeof data.answer !== 'string' || !Array.isArray(data.sources)) {
        throw new Error('River Master returned an invalid response. Please retry.');
      }
      setResult(data);
    } catch (failure) {
      if (request.current === controller && !controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : 'Unable to contact River Master. Please retry.');
      }
    } finally {
      if (request.current === controller && !controller.signal.aborted) setLoading(false);
    }
  }

  return <section className="river-master" aria-labelledby={`${id}-title`} aria-busy={loading}>
    <h3 id={`${id}-title`}>River Master <span className="river-master-ai">AI assistant</span></h3>
    <p><strong>Context:</strong> {riverName || 'Select a river'} · {riverState || 'State not selected'} · {segmentName || 'Select a section'}</p>
    <p className="river-master-warning">AI answers may be incomplete or wrong. Gauge data may not represent this section. No answer or flow reading guarantees a safe trip. Check official alerts, local conditions and qualified guidance.</p>
    <ScheduledObservation riverName={riverName} riverState={riverState} segmentName={segmentName} />
    <form onSubmit={submit}>
      <label htmlFor={`${id}-message`}>Ask about this river section</label>
      <textarea id={`${id}-message`} value={message} onChange={event => setMessage(event.target.value)}
        maxLength={2000} rows={3} disabled={!enabled || loading} required />
      <button type="submit" disabled={!enabled || loading || !message.trim()}>{loading ? 'Asking River Master…' : 'Ask River Master'}</button>
    </form>
    {!enabled && <p>Select both a river and section to ask a question.</p>}
    {loading && <p role="status">Looking up available evidence…</p>}
    {error && <p role="alert">{error}</p>}
    {result && <div aria-live="polite">
      <h4>AI response</h4>
      <p className="river-master-answer">{result.answer}</p>
      <h4>Sources &amp; observation times</h4>
      {result.sources.length ? <ul>{result.sources.map((source, index) => <Source key={index} source={source} />)}</ul>
        : <p>No sources provided. Treat this answer as unverified; current conditions are unknown.</p>}
    </div>}
  </section>;
}
