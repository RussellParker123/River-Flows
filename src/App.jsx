import './App.css';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Analytics } from '@vercel/analytics/react';
import usStates from './us-states.json';
import { fetchUSGSFlow, fetchHistoricalFlow } from './fetchUSGSFlow';
import { rivers } from './rivers';
import { CommentsSection } from './CommentsSection';
import RiverMap from './RiverMap';

const gradeColors = {
  'I': '#2ecc71',
  'II': '#3498db',
  'III': '#8e44ad',
  'IV': '#e74c3c',
  'V': '#000000',
  'V+': '#000000'
};

const stateAbbreviations = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA',
  Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC',
  Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL',
  Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK',
  Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT',
  Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI',
  Wyoming: 'WY', 'Puerto Rico': 'PR'
};

function HomePage({ onNavigateToMap }) {
  const [flows, setFlows] = useState({});
  const [loading, setLoading] = useState(true);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    let active = true;
    const fetchAllFlows = async () => {
      const flowData = {};
      for (const river of rivers) {
        if (!active) return;
        if (river.usgs_gage) {
          try {
            flowData[river.name] = await fetchUSGSFlow(river.usgs_gage);
          } catch {
            flowData[river.name] = null;
          }
        }
      }
      if (active) {
        setFlows(flowData);
        setLoading(false);
      }
    };

    fetchAllFlows();
    const interval = setInterval(fetchAllFlows, 300000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{
      padding: isMobile ? '20px' : '40px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundImage: 'linear-gradient(135deg, rgba(52, 73, 94, 0.85) 0%, rgba(142, 68, 173, 0.8) 100%), url("https://images.unsplash.com/photo-1505228395891-9a51e7e86e81?w=1200&h=800&fit=crop")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      borderRadius: '12px',
      minHeight: '100vh',
      position: 'relative'
    }}>
      <Analytics />
      <h1 style={{ textAlign: 'center', fontSize: isMobile ? '1.8em' : '2.5em', marginBottom: '10px', color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
        🏞️ River Flows
      </h1>
      <p style={{ textAlign: 'center', fontSize: isMobile ? '0.95em' : '1.1em', color: '#e0e0e0', marginBottom: isMobile ? '20px' : '40px', textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
        Real-time water flow data for your next adventure
      </p>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => onNavigateToMap(null)}
          style={{ padding: '12px 20px', backgroundColor: '#8e44ad', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold' }}
        >
          Explore all rivers
        </button>
      </div>

      {/* Interactive State Selection Map */}
      <div style={{
        marginBottom: '40px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
        height: isMobile ? '400px' : '500px'
      }}>
        <MapContainer center={[44, -110]} zoom={4} style={{ width: '100%', height: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <GeoJSON
            data={usStates}
            style={() => ({
              color: '#333',
              weight: 2,
              opacity: 0.8,
              fillColor: '#8e44ad',
              fillOpacity: 0.4,
              cursor: 'pointer'
            })}
            onEachFeature={(feature, layer) => {
              layer.on('click', () => {
                const name = feature.properties.name;
                onNavigateToMap(stateAbbreviations[name] ?? (Object.values(stateAbbreviations).includes(name) ? name : null));
              });
              layer.on('mouseover', () => {
                layer.setStyle({
                  fillOpacity: 0.7,
                  weight: 3,
                  color: '#ff8c00'
                });
                layer.bindPopup(`<strong>${feature.properties.name}</strong><br/>Click to explore rivers`, {
                  closeButton: false
                }).openPopup();
              });
              layer.on('mouseout', () => {
                layer.setStyle({
                  fillOpacity: 0.4,
                  weight: 2,
                  color: '#333'
                });
                layer.closePopup();
              });
            }}
          />
        </MapContainer>
      </div>

      <p style={{ textAlign: 'center', color: '#e0e0e0', marginBottom: '40px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
        👆 Click on a state to explore rivers and view real-time flow data
      </p>

      <h2 style={{ textAlign: 'center', color: '#fff', marginBottom: '30px', textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>Featured Rivers by Grade</h2>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '15px' : '20px' }}>
        {[...rivers]
          .sort((a, b) => {
            const gradeOrder = { 'V': 0, 'IV': 1, 'III': 2, 'II': 3, 'I': 4 };
            return gradeOrder[a.grade] - gradeOrder[b.grade];
          })
          .map(river => (
          <div
            key={river.name}
            style={{
              border: `3px solid ${gradeColors[river.grade]}`,
              borderRadius: '12px',
              padding: '20px',
              backgroundColor: 'rgba(249, 249, 249, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              transition: 'transform 0.2s, boxShadow 0.2s',
              ':hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
              }
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }}
            onClick={() => onNavigateToMap(river.state)}
          >
            <h2 style={{ margin: '0 0 10px 0', color: gradeColors[river.grade] }}>
              {river.name}
            </h2>
            <p style={{ margin: '5px 0', fontSize: '0.95em', color: '#555' }}>
              📍 <strong>{river.state}</strong>
            </p>
            <p style={{ margin: '5px 0', fontSize: '0.95em', color: '#555' }}>
              ⚡ Class <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: gradeColors[river.grade] }}>
                {river.grade}
              </span>
            </p>

            {river.geology && (
              <p style={{ margin: '8px 0', fontSize: '0.85em', color: '#888', fontStyle: 'italic' }}>
                🪨 <strong>Geology:</strong> {river.geology}
              </p>
            )}

            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '2px solid #eee' }}>
              <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#888' }}>Live Flow:</p>
              <p style={{ margin: '5px 0', fontSize: '1.8em', fontWeight: 'bold', color: gradeColors[river.grade] }}>
                {loading ? '...' : Number.isFinite(flows[river.name]) ? `${Math.round(flows[river.name])} CFS` : 'N/A'}
              </p>
            </div>

            <button
              style={{
                width: '100%',
                marginTop: '15px',
                padding: '10px',
                backgroundColor: gradeColors[river.grade],
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1em',
                fontWeight: 'bold'
              }}
              onClick={event => {
                event.stopPropagation();
                onNavigateToMap(river.state);
              }}
            >
              View on Map →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FlowChart({ river, currentFlow, segment }) {
  const [historicalData, setHistoricalData] = useState([]);
  const [loadingHistorical, setLoadingHistorical] = useState(Boolean(river.usgs_gage));
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const isMobile = window.innerWidth < 768;

  // Use segment's videos array if available, otherwise use youtube_url
  let videos = [];
  if (segment?.videos && Array.isArray(segment.videos) && segment.videos.length > 0) {
    videos = segment.videos;
  } else if (segment?.youtube_url) {
    const videoId = segment.youtube_url.split('/embed/')[1];
    videos = videoId ? [{ id: videoId, label: 'Video' }] : [];
  }

  const currentVideoIndex = selectedVideoIndex < videos.length ? selectedVideoIndex : 0;
  const youtubeUrl = videos.length > 0 ? `https://www.youtube.com/embed/${videos[currentVideoIndex].id}` : river.youtube_url;

  useEffect(() => {
    setSelectedVideoIndex(0);
  }, [segment]);

  useEffect(() => {
    let active = true;
    setHistoricalData([]);
    setLoadingHistorical(Boolean(river.usgs_gage));
    if (river.usgs_gage) {
      const loadHistorical = async () => {
        try {
          const data = await fetchHistoricalFlow(river.usgs_gage);
          if (active) setHistoricalData(data);
        } catch {
          if (active) setHistoricalData([]);
        } finally {
          if (active) setLoadingHistorical(false);
        }
      };
      loadHistorical();
    }
    return () => {
      active = false;
    };
  }, [river.usgs_gage]);

  // Generate sample monthly data for visualization
  const monthlyData = [
    { month: 'Jan', flow: river.usgs_data.yearly_average * 0.7, recordHigh: river.usgs_data.record_high * 0.3 },
    { month: 'Feb', flow: river.usgs_data.yearly_average * 0.75, recordHigh: river.usgs_data.record_high * 0.35 },
    { month: 'Mar', flow: river.usgs_data.yearly_average * 0.9, recordHigh: river.usgs_data.record_high * 0.45 },
    { month: 'Apr', flow: river.usgs_data.yearly_average * 1.3, recordHigh: river.usgs_data.record_high * 0.7 },
    { month: 'May', flow: river.usgs_data.yearly_average * 1.5, recordHigh: river.usgs_data.record_high * 0.85 },
    { month: 'Jun', flow: river.usgs_data.yearly_average * 1.4, recordHigh: river.usgs_data.record_high * 0.9 },
    { month: 'Jul', flow: river.usgs_data.yearly_average * 1.0, recordHigh: river.usgs_data.record_high * 0.6 },
    { month: 'Aug', flow: river.usgs_data.yearly_average * 0.85, recordHigh: river.usgs_data.record_high * 0.5 },
    { month: 'Sep', flow: river.usgs_data.yearly_average * 0.8, recordHigh: river.usgs_data.record_high * 0.4 },
    { month: 'Oct', flow: river.usgs_data.yearly_average * 0.75, recordHigh: river.usgs_data.record_high * 0.35 },
    { month: 'Nov', flow: river.usgs_data.yearly_average * 0.7, recordHigh: river.usgs_data.record_high * 0.3 },
    { month: 'Dec', flow: river.usgs_data.yearly_average * 0.65, recordHigh: river.usgs_data.record_high * 0.25 }
  ];

  const statsData = [
    { name: 'Current', value: Number.isFinite(currentFlow) ? currentFlow : null },
    { name: 'Yearly Avg', value: river.usgs_data.yearly_average },
    { name: 'Record High', value: river.usgs_data.record_high },
    { name: 'Record Low', value: river.usgs_data.record_low }
  ];
  const formatFlow = value => Number.isFinite(value) ? `${Math.round(value)} CFS` : 'N/A';

  return (
    <div style={{ marginTop: '30px', padding: isMobile ? '15px' : '20px', backgroundColor: '#f5f5f5', borderRadius: '12px', marginBottom: isMobile ? '20px' : '0' }}>
      <h3 style={{ marginTop: 0, color: '#333', fontSize: isMobile ? '1.2em' : '1.5em' }}>Flow Analysis - {river.name}{segment ? ` - ${segment.name}` : ''}</h3>

      {youtubeUrl && !youtubeUrl.includes('placeholder') && (
        <div style={{ marginBottom: '30px' }}>
          {videos.length > 1 && (
            <div style={{ marginBottom: '12px', display: 'flex', gap: isMobile ? '6px' : '8px', flexWrap: 'wrap' }}>
              {videos.map((video, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedVideoIndex(index)}
                  style={{
                    padding: isMobile ? '10px 14px' : '8px 12px',
                    backgroundColor: currentVideoIndex === index ? '#8e44ad' : '#ddd',
                    color: currentVideoIndex === index ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.9em' : '0.9em',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                    flex: isMobile ? '1 1 auto' : 'auto',
                    minWidth: isMobile ? '0' : 'auto'
                  }}
                  onMouseEnter={(e) => {
                    if (currentVideoIndex !== index) {
                      e.currentTarget.style.backgroundColor = '#ccc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentVideoIndex !== index) {
                      e.currentTarget.style.backgroundColor = '#ddd';
                    }
                  }}
                >
                  {video.label}
                </button>
              ))}
            </div>
          )}
          <div style={{ backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
              <iframe
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                src={`${youtubeUrl}?autoplay=1&mute=1`}
                title={`${segment?.name || river.name} Kayaking Video`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <p style={{ margin: '10px', color: '#666', fontSize: '0.9em' }}>
              ▶️ Kayaking on {segment?.name || river.name} • {river.state}
            </p>
          </div>
        </div>
      )}

      {segment?.description && (
        <div style={{ marginBottom: '30px', padding: isMobile ? '12px' : '15px', backgroundColor: '#fff3cd', borderRadius: '8px', borderLeft: `4px solid #ffc107` }}>
          <h4 style={{ marginTop: 0, color: '#333', fontSize: isMobile ? '1em' : '1.1em' }}>Rapids & Features</h4>
          <p style={{ margin: '10px 0', color: '#555', lineHeight: '1.6', fontSize: isMobile ? '0.9em' : '1em' }}>{segment.description}</p>
        </div>
      )}

      {river.description && (
        <div style={{ marginBottom: '30px', padding: isMobile ? '12px' : '15px', backgroundColor: '#e8f4f8', borderRadius: '8px', borderLeft: `4px solid ${gradeColors[river.grade]}` }}>
          <h4 style={{ marginTop: 0, color: '#333', fontSize: isMobile ? '1em' : '1.1em' }}>Trip Information</h4>
          <p style={{ margin: '10px 0', color: '#555', lineHeight: '1.6', fontSize: isMobile ? '0.9em' : '1em' }}>{river.description}</p>
        </div>
      )}

      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ color: '#555', marginBottom: '10px', fontSize: isMobile ? '0.95em' : '1em' }}>Monthly Average Flow Pattern</h4>
        <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" fontSize={isMobile ? 12 : 14} />
            <YAxis fontSize={isMobile ? 12 : 14} />
            <Tooltip formatter={formatFlow} labelStyle={{ color: '#000' }} />
            <Legend />
            <Line
              type="monotone"
              dataKey="flow"
              stroke={gradeColors[river.grade]}
              name="Expected Flow"
              dot={{ fill: gradeColors[river.grade], r: isMobile ? 3 : 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ color: '#555', marginBottom: '10px', fontSize: isMobile ? '0.95em' : '1em' }}>Historical Flow - Past Year</h4>
        {loadingHistorical ? (
          <p style={{ color: '#999', fontStyle: 'italic' }}>Loading historical data...</p>
        ) : historicalData.length > 0 ? (
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 350}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                angle={isMobile ? 0 : -45}
                textAnchor={isMobile ? 'middle' : 'end'}
                height={isMobile ? 60 : 80}
                fontSize={isMobile ? 11 : 12}
              />
              <YAxis fontSize={isMobile ? 12 : 14} />
              <Tooltip
                formatter={formatFlow}
                labelFormatter={(label) => `Date: ${label}`}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="flow"
                stroke={gradeColors[river.grade]}
                name="Daily Flow"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#999', fontStyle: 'italic' }}>No historical data available for this river</p>
        )}
      </div>

      <div>
        <h4 style={{ color: '#555', marginBottom: '10px', fontSize: isMobile ? '0.95em' : '1em' }}>Flow Statistics (CFS)</h4>
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 250}>
          <BarChart data={statsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={isMobile ? 11 : 12} />
            <YAxis fontSize={isMobile ? 12 : 14} />
            <Tooltip formatter={formatFlow} labelStyle={{ color: '#000' }} />
            <Bar dataKey="value" fill={gradeColors[river.grade]} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: '20px', padding: isMobile ? '12px' : '15px', backgroundColor: '#fff', borderRadius: '8px', fontSize: isMobile ? '0.85em' : '0.9em' }}>
        <p style={{ margin: '5px 0' }}><strong>Current:</strong> {currentFlow === undefined ? 'Loading...' : formatFlow(currentFlow)}</p>
        <p style={{ margin: '5px 0' }}><strong>Yearly Average:</strong> {Math.round(river.usgs_data.yearly_average)} CFS</p>
        <p style={{ margin: '5px 0' }}><strong>Record High:</strong> {Math.round(river.usgs_data.record_high)} CFS</p>
        <p style={{ margin: '5px 0' }}><strong>Record Low:</strong> {Math.round(river.usgs_data.record_low)} CFS</p>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={() => {
            if (segment?.coordinates && segment.coordinates.length > 0) {
              const startCoord = segment.coordinates[0];
              const endCoord = segment.coordinates[segment.coordinates.length - 1];
              const mapsUrl = `https://www.google.com/maps/dir/${startCoord[1]},${startCoord[0]}/${endCoord[1]},${endCoord[0]}`;
              window.open(mapsUrl, '_blank');
            } else if (river.segments && river.segments[0]?.coordinates) {
              const coords = river.segments[0].coordinates;
              const startCoord = coords[0];
              const endCoord = coords[coords.length - 1];
              const mapsUrl = `https://www.google.com/maps/dir/${startCoord[1]},${startCoord[0]}/${endCoord[1]},${endCoord[0]}`;
              window.open(mapsUrl, '_blank');
            }
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4285F4',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: isMobile ? '0.9em' : '1em',
            fontWeight: 'bold',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#357ae8'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4285F4'}
        >
          🗺️ Get Directions
        </button>
      </div>
    </div>
  );
}

function App() {
  const [selectedState, setSelectedState] = useState(null);
  const [view, setView] = useState('home');

  return (
    <div className="App">
      {view === 'home' ? (
        <HomePage onNavigateToMap={state => {
          setSelectedState(state);
          setView('map');
        }} />
      ) : (
        <RiverMap
          initialState={selectedState}
          onBack={() => setView('home')}
          renderDetails={(river, segment, flow) => (
            <>
              <FlowChart river={river} currentFlow={flow} segment={segment} />
              <CommentsSection riverName={river.name} riverState={river.state} />
            </>
          )}
        />
      )}
    </div>
  );
}

export default App;
