import { authorized, database, rpc, respondError } from '../supabase/server/river-master.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }); }
  if (!authorized(req)) return res.status(401).json({ error: 'Unauthorized.' });
  try { return res.status(200).json(await rpc(database(), 'status')); }
  catch (error) { return respondError(res, error); }
}
