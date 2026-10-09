import { database, validateRequest, contextFor, respondError } from '../supabase/server/river-master.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  try {
    const { river, segment } = validateRequest({ ...req.query, message: 'Read persisted official observations.' });
    const context = await contextFor(database(), river, segment);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    return res.status(200).json({
      riverName: river.name, riverState: river.state, segmentName: segment.name,
      gaugeMappedVerified: context.facts.associationVerified,
      observation: context.observation || null,
      history: context.facts.history, dailyHistory: context.facts.dailyHistory, sources: context.sources
    });
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    return respondError(res, error);
  }
}
