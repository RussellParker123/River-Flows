// Serverless function to fetch flow data from American Whitewater
// This function scrapes the AWW Wyoming river page and extracts CFS data

const https = require('https');

// Simple in-memory cache with TTL (5 minutes)
let cache = {
  data: null,
  timestamp: 0,
  TTL: 5 * 60 * 1000 // 5 minutes
};

function isCacheValid() {
  return cache.data && (Date.now() - cache.timestamp) < cache.TTL;
}

function fetchHTTPS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Parse American Whitewater flow data
function parseAWWFlows(html) {
  const flows = {};
  
  try {
    // Extract table rows with CFS values
    const rowRegex = /([^|<]+?)\s*\|\s*([0-9.]+)\s*(?:cfs|ft)/gi;
    let match;
    
    while ((match = rowRegex.exec(html)) !== null) {
      let riverName = match[1].trim();
      const flowValue = parseFloat(match[2]);
      
      // Extract the main river name (before dash)
      const mainRiver = riverName.split(/\s*[-–]\s*/)[0].trim();
      
      // Store the highest flow value for each river
      if (!flows[mainRiver] || flows[mainRiver] < flowValue) {
        flows[mainRiver] = flowValue;
      }
    }
  } catch (err) {
    console.error('Error parsing AWW flows:', err);
  }
  
  return flows;
}

// Main handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check cache first
    if (isCacheValid()) {
      return res.status(200).json(cache.data);
    }

    // Fetch from AWW Wyoming river page
    const url = 'https://www.americanwhitewater.org/content/River/view/river-index/state/USA-WYM';
    const html = await fetchHTTPS(url);
    
    // Parse the HTML for flow data
    const flows = parseAWWFlows(html);
    
    // Update cache
    cache.data = flows;
    cache.timestamp = Date.now();
    
    res.status(200).json(flows);
  } catch (err) {
    console.error('Error fetching AWW flows:', err);
    
    // Return cached data if available, even if stale
    if (cache.data) {
      res.status(200).json(cache.data);
    } else {
      res.status(500).json({ error: 'Failed to fetch flow data', details: err.message });
    }
  }
}
