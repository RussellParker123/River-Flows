import { authorized, database, respondError } from '../supabase/server/river-master.js';
import { runJob } from '../supabase/server/river-master-jobs.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized.' });
  const name = req.query?.job;
  if (!['collection', 'manager'].includes(name)) return res.status(400).json({ error: 'Invalid job.' });
  try { return res.status(200).json(await runJob(database(), name)); }
  catch (error) { return respondError(res, error); }
}
