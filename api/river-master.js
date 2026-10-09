import { database, rpc, validateRequest, clientHash, contextFor, askClaude, respondError } from '../supabase/server/river-master.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  try {
    const { river, segment, message } = validateRequest(req.body);
    const db = database();
    const permitted = await rpc(db, 'rate', { p_hash: clientHash(req), p_limit: 10 });
    if (!permitted) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    const context = await contextFor(db, river, segment);
    const answer = await askClaude(db, { question: message, ...context.facts, sources: context.sources }, 'chat');
    return res.status(200).json({ answer, sources: context.sources, ...(context.observation ? { observation: context.observation } : {}) });
  } catch (error) { return respondError(res, error); }
}
