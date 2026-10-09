export const MAX_MESSAGES = 20;
export const MAX_CONTENT_BYTES = 4000;

export function contentBytes(text) {
  return new TextEncoder().encode(text).length;
}

export function limitContent(text) {
  let result = '';
  let bytes = 0;
  for (const character of text) {
    const size = contentBytes(character);
    if (bytes + size > MAX_CONTENT_BYTES || result.length + character.length > 4000) break;
    result += character;
    bytes += size;
  }
  return result;
}

export function boundedMessages(messages) {
  return messages.slice(-MAX_MESSAGES).map(({ role, content }) => ({
    role, content: limitContent(content)
  }));
}

function aborted(signal) {
  if (signal?.aborted) {
    const error = new Error('Request stopped.');
    error.name = 'AbortError';
    throw error;
  }
}

export async function readRiverMasterStream(response, { signal, onDelta }) {
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !/application\/(?:x-)?ndjson\b/i.test(contentType)) {
    let detail = '';
    if (/application\/(?:[\w.-]+\+)?json\b/i.test(contentType)) {
      try {
        const body = await response.json();
        if (typeof body.error === 'string') detail = body.error;
      } catch {
        detail = 'Invalid JSON error response.';
      }
    }
    aborted(signal);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Sign-in is required or your session has expired.${detail ? ` ${detail}` : ''}`);
    }
    if (response.status === 404 || response.status === 405) {
      throw new Error('River Master is not deployed on this server.');
    }
    throw new Error(detail || (response.ok
      ? 'River Master returned an unexpected response (expected NDJSON). The API may not be deployed.'
      : `River Master is unavailable (HTTP ${response.status}). Check server/provider configuration.`));
  }
  if (!response.body?.getReader) throw new Error('Streaming is unavailable in this browser.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '';
  let done = false;
  let outputSize = 0;
  const cancel = () => { Promise.resolve(reader.cancel()).catch(() => {}); };
  signal?.addEventListener('abort', cancel, { once: true });
  const consume = line => {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error('River Master returned invalid stream data.');
    }
    if (event?.type === 'delta' && typeof event.text === 'string') {
      outputSize += event.text.length;
      if (outputSize > 128000) throw new Error('River Master response exceeded the stream limit.');
      onDelta(event.text);
    } else if (event?.type === 'done') {
      done = true;
    } else if (event?.type === 'error' && typeof event.message === 'string') {
      throw new Error(event.message);
    } else {
      throw new Error('River Master returned an unknown stream event.');
    }
  };
  try {
    aborted(signal);
    while (!done) {
      const chunk = await reader.read();
      aborted(signal);
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let newline;
      while (!done && (newline = buffer.indexOf('\n')) !== -1) {
        consume(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
      if (buffer.length > 128000) throw new Error('River Master returned an oversized stream event.');
      if (chunk.done) {
        if (!done && buffer.trim()) consume(buffer);
        if (!done) throw new Error('River Master disconnected before completing its reply. Retry your question.');
        break;
      }
    }
  } finally {
    signal?.removeEventListener('abort', cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function streamRiverMaster({ token, messages, context, signal, onDelta }) {
  if (!token) throw new Error('Sign in to ask River Master.');
  aborted(signal);
  let history = boundedMessages(messages);
  let body = JSON.stringify({ messages: history, context });
  // Preserve the current question while respecting the server's total body limit.
  while (contentBytes(body) > 65536 && history.length > 1) {
    history = history.slice(Math.min(2, history.length - 1));
    body = JSON.stringify({ messages: history, context });
  }
  if (contentBytes(body) > 65536) throw new Error('River Master request exceeds the server size limit.');
  let response;
  try {
    response = await fetch('/api/river-master', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
        Authorization: 'Bearer ' + token
      },
      body,
      signal
    });
  } catch (error) {
    if (error.name === 'AbortError' || signal?.aborted) {
      aborted(signal);
      throw error;
    }
    throw new Error('Cannot reach River Master. Check your connection and that the API is deployed.');
  }
  await readRiverMasterStream(response, { signal, onDelta });
}
