import '../App.css';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, useMap, Polyline, Marker, Popup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import usStates from './us-states.json';
import { fetchUSGSFlow, fetchHistoricalFlow } from './fetchUSGSFlow';
import { rivers } from './rivers';

// State bounds for zoom focusing
const STATE_BOUNDS = {
  'CO': [[36.9956, -109.0504], [41.0023, -102.0423]],  // Southwest to Northeast bounds
  'ID': [[42.0015, -117.2428], [49.0011, -111.0456]],
  'MT': [[44.9968, -116.0489], [49.0033, -104.0396]],
  'UT': [[36.9979, -114.0742], [42.0011, -109.0423]],
  'WY': [[40.9977, -111.0566], [45.0052, -104.0519]]
};

const gradeColors = {
  'I': '#2ecc71',
  'II': '#3498db',
  'III': '#8e44ad',
  'IV': '#e74c3c',
  'V': '#000000',
  'V+': '#000000'
};

function StateZoom({ selectedState }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedState && STATE_BOUNDS[selectedState]) {
      const bounds = STATE_BOUNDS[selectedState];
      // Use a small timeout to ensure map is ready
      setTimeout(() => {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
      }, 100);
    }
  }, [selectedState, map]);
  
  return null;
}

function HomePage({ onNavigateToMap }) {
  const [flows, setFlows] = useState({});
  const [loading, setLoading] = useState(true);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    // Fetch live flow data for all rivers
    const fetchAllFlows = async () => {
      const flowData = {};
      for (const river of rivers) {
        if (river.usgs_gage) {
          const flow = await fetchUSGSFlow(river.usgs_gage);
          flowData[river.name] = flow;
        }
      }
      setFlows(flowData);
      setLoading(false);
    };
    fetchAllFlows();
  }, []);

  return (
    <div style={{ padding: isMobile ? '20px' : '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', fontSize: isMobile ? '1.8em' : '2.5em', marginBottom: '10px' }}>
        🏞️ River Flows
      </h1>
      <p style={{ textAlign: 'center', fontSize: isMobile ? '0.95em' : '1.1em', color: '#666', marginBottom: isMobile ? '20px' : '40px' }}>
        Real-time water flow data for your next adventure
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '15px' : '20px' }}>
        {rivers
          .sort((a, b) => {
            // Sort by grade: V, IV, III, II, I (hardest to easiest)
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
              backgroundColor: '#f9f9f9',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'transform 0.2s, boxShadow 0.2s',
              ':hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
              }
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
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
                {loading ? '...' : (flows[river.name] !== undefined && flows[river.name] !== null) ? `${Math.round(flows[river.name])} CFS` : 'N/A'}
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
              onClick={() => onNavigateToMap(river.state)}
            >
              View on Map →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FlowChart({ river, currentFlow }) {
  const [historicalData, setHistoricalData] = useState([]);
  const [loadingHistorical, setLoadingHistorical] = useState(true);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (river.usgs_gage) {
      fetchHistoricalFlow(river.usgs_gage).then(data => {
        setHistoricalData(data);
        setLoadingHistorical(false);
      });
    }
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
    { name: 'Current', value: currentFlow || 0 },
    { name: 'Yearly Avg', value: river.usgs_data.yearly_average },
    { name: 'Record High', value: river.usgs_data.record_high },
    { name: 'Record Low', value: river.usgs_data.record_low }
  ];

  return (
    <div style={{ marginTop: '30px', padding: isMobile ? '15px' : '20px', backgroundColor: '#f5f5f5', borderRadius: '12px', marginBottom: isMobile ? '20px' : '0' }}>
      <h3 style={{ marginTop: 0, color: '#333', fontSize: isMobile ? '1.2em' : '1.5em' }}>Flow Analysis - {river.name}</h3>
      
      {river.youtube_url && river.youtube_url !== 'https://www.youtube.com/embed/placeholder' && (
        <div style={{ marginBottom: '30px', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden' }}>
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
              src={`${river.youtube_url}?autoplay=1&mute=1`}
              title={`${river.name} Kayaking Video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p style={{ margin: '10px', color: '#666', fontSize: '0.9em' }}>
            ▶️ Kayaking on {river.name} • {river.state}
          </p>
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
            <Tooltip 
              formatter={(value) => `${Math.round(value)} CFS`}
              labelStyle={{ color: '#000' }}
            />
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
                formatter={(value) => `${Math.round(value)} CFS`}
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
            <Tooltip 
              formatter={(value) => `${Math.round(value)} CFS`}
              labelStyle={{ color: '#000' }}
            />
            <Bar dataKey="value" fill={gradeColors[river.grade]} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginTop: '20px', padding: isMobile ? '12px' : '15px', backgroundColor: '#fff', borderRadius: '8px', fontSize: isMobile ? '0.85em' : '0.9em' }}>
        <p style={{ margin: '5px 0' }}><strong>Current:</strong> {currentFlow ? `${Math.round(currentFlow)} CFS` : 'Loading...'}</p>
        <p style={{ margin: '5px 0' }}><strong>Yearly Average:</strong> {Math.round(river.usgs_data.yearly_average)} CFS</p>
        <p style={{ margin: '5px 0' }}><strong>Record High:</strong> {Math.round(river.usgs_data.record_high)} CFS</p>
        <p style={{ margin: '5px 0' }}><strong>Record Low:</strong> {Math.round(river.usgs_data.record_low)} CFS</p>
      </div>
    </div>
  );
}

function App() {
  const [selectedState, setSelectedState] = useState(null);
  const [flows, setFlows] = useState({});
  const [view, setView] = useState('home'); // 'home' or 'map'
  const [selectedRiver, setSelectedRiver] = useState(null);
  const [hoveredRiver, setHoveredRiver] = useState(null);
  const [highlightedRiver, setHighlightedRiver] = useState(null);
  const geoJsonRef = useRef();

  const onEachState = (feature, layer) => {
    layer.on({
      click: () => {
        setSelectedState(feature.properties.name);
      },
    });
    layer.bindTooltip(feature.properties.name);
  };

  const stateStyle = {
    fillColor: '#bada55',
    weight: 1,
    color: 'gray',
    fillOpacity: 0.2,
  };

  const renderRivers = () => {
    return rivers
      .filter(r => !selectedState || r.state === selectedState)
      .flatMap(river => {
        return river.segments.map((seg, i) => {
          const coords = seg.coordinates || [];
          const isHighlighted = highlightedRiver === river.name;
          const isHovered = hoveredRiver === river.name;
          
          // If only one coordinate (single USGS gage point), create a marker
          if (coords.length === 1) {
            const [lng, lat] = coords[0];
            const markerSize = isHighlighted ? 28 : isHovered ? 25 : 22;
            const markerWeight = isHighlighted ? 5 : isHovered ? 4 : 3;
            
            return (
              <Marker
                key={river.name + '-' + seg.name + '-' + i}
                position={[lat, lng]}
                icon={L.divIcon({
                  className: 'river-marker',
                  html: `<div style="
                    background-color: ${gradeColors[seg.grade] || '#666'};
                    width: ${markerSize - 6}px;
                    height: ${markerSize - 6}px;
                    border-radius: 50%;
                    border: ${markerWeight}px solid white;
                    box-shadow: ${isHighlighted ? '0 0 15px rgba(0,0,0,0.6), 0 0 25px ' + gradeColors[seg.grade] : '0 0 8px rgba(0,0,0,0.3)'};
                    transition: all 0.2s ease;
                  "></div>`,
                  iconSize: [markerSize, markerSize],
                  iconAnchor: [markerSize / 2, markerSize / 2],
                  popupAnchor: [0, -markerSize / 2]
                })}
                eventHandlers={{
                  mouseover: () => setHoveredRiver(river.name),
                  mouseout: () => setHoveredRiver(null)
                }}
              >
                <Popup>
                  <strong>{river.name}</strong><br />
                  Segment: {seg.name}<br />
                  Grade: {seg.grade}<br />
                  {river.usgs_gage && (
                    <>
                      USGS Gage: {river.usgs_gage}<br />
                      Flow: {flows[river.name] !== undefined ? `${Math.round(flows[river.name])} CFS` : 'Loading...'}
                    </>
                  )}
                  {river.geology && (
                    <>
                      <br />
                      🪨 Geology: {river.geology}
                    </>
                  )}
                  {river.forum_url && (
                    <>
                      <br />
                      <a href={river.forum_url} target="_blank" rel="noopener noreferrer" style={{ color: '#ff8c00', fontWeight: 'bold' }}>
                        💬 Community Forum
                      </a>
                    </>
                  )}
                </Popup>
              </Marker>
            );
          }
          
          // If multiple coordinates, create polylines as before
          const lineWeight = isHighlighted ? 8 : isHovered ? 6 : 5;
          const lineOpacity = isHighlighted ? 1 : isHovered ? 0.9 : 0.8;
          
          const outline = (
            <Polyline
              key={river.name + '-outline-' + i}
              positions={coords.map(([lng, lat]) => [lat, lng])}
              pathOptions={{ 
                color: '#000', 
                weight: isHighlighted ? 10 : 8, 
                opacity: isHighlighted ? 0.5 : 0.35 
              }}
              eventHandlers={{
                mouseover: () => setHoveredRiver(river.name),
                mouseout: () => setHoveredRiver(null)
              }}
            />
          );

          const line = (
            <Polyline
              key={river.name + '-' + seg.name + '-' + i}
              positions={coords.map(([lng, lat]) => [lat, lng])}
              pathOptions={{ 
                color: gradeColors[seg.grade] || '#666', 
                weight: lineWeight,
                opacity: lineOpacity
              }}
              eventHandlers={{
                mouseover: () => setHoveredRiver(river.name),
                mouseout: () => setHoveredRiver(null)
              }}
            >
              <Popup>
                <strong>{river.name}</strong><br />
                Segment: {seg.name}<br />
                Grade: {seg.grade}
                {river.geology && (
                  <>
                    <br />
                    🪨 Geology: {river.geology}
                  </>
                )}
                {river.forum_url && (
                  <>
                    <br />
                    <a href={river.forum_url} target="_blank" rel="noopener noreferrer" style={{ color: '#ff8c00', fontWeight: 'bold' }}>
                      💬 Community Forum
                    </a>
                  </>
                )}
              </Popup>
            </Polyline>
          );

          return [outline, line];
        });
      });
  };

  useEffect(() => {
    if (!selectedState) return;
    const riversInState = rivers.filter(r => r.state === selectedState);
    riversInState.forEach(river => {
      if (!river.usgs_gage) return;
      fetchUSGSFlow(river.usgs_gage).then(flow => {
        setFlows(f => ({ ...f, [river.name]: flow }));
      });
    });
  }, [selectedState]);

  if (view === 'home') {
    return (
      <div className="App">
        <HomePage onNavigateToMap={(state) => {
          setSelectedState(state);
          setView('map');
        }} />
      </div>
    );
  }

  const isMobile = window.innerWidth < 768;

  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <button
        onClick={() => {
          setView('home');
          setSelectedState(null);
        }}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          padding: '10px 15px',
          backgroundColor: '#8e44ad',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: isMobile ? '0.9em' : '1em'
        }}
      >
        ← Back
      </button>

      <h1 style={{ 
        paddingTop: isMobile ? '50px' : '20px',
        paddingBottom: '10px',
        margin: '0',
        fontSize: isMobile ? '1.3em' : '2em',
        textAlign: 'center'
      }}>River Flows</h1>
      <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ 
        height: isMobile ? 'calc(100vh - 120px)' : '80vh', 
        width: '100%',
        flex: 1
      }}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Topographic (OpenTopoMap)">
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution='Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay checked name="States">
            <GeoJSON
              data={usStates}
              style={stateStyle}
              onEachFeature={onEachState}
              ref={geoJsonRef}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay checked name="Rivers">
            {renderRivers()}
          </LayersControl.Overlay>
        </LayersControl>

        <StateZoom selectedState={selectedState} />
      </MapContainer>

      <div style={{ padding: '8px 12px' }}>
        <strong>Legend — Rapid classes</strong>
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>
          <li><span style={{ display: 'inline-block', width: 16, height: 12, background: gradeColors['I'], marginRight: 8 }}></span>Class I (green)</li>
          <li><span style={{ display: 'inline-block', width: 16, height: 12, background: gradeColors['II'], marginRight: 8 }}></span>Class II (blue)</li>
          <li><span style={{ display: 'inline-block', width: 16, height: 12, background: gradeColors['III'], marginRight: 8 }}></span>Class III (purple)</li>
          <li><span style={{ display: 'inline-block', width: 16, height: 12, background: gradeColors['IV'], marginRight: 8 }}></span>Class IV (red)</li>
          <li><span style={{ display: 'inline-block', width: 16, height: 12, background: gradeColors['V'], marginRight: 8 }}></span>Class V (black)</li>
        </ul>
      </div>

      {selectedState && (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
          <h2>Selected State: {selectedState}</h2>
          <h3>Major Rivers</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))', gap: '20px' }}>
            {rivers.filter(r => r.state === selectedState).map(river => (
              <div 
                key={river.name} 
                style={{ 
                  backgroundColor: highlightedRiver === river.name ? '#fff9e6' : '#fff', 
                  borderRadius: '12px', 
                  padding: '20px', 
                  boxShadow: highlightedRiver === river.name ? `0 0 15px ${gradeColors[river.grade]}` : '0 2px 8px rgba(0,0,0,0.1)',
                  border: highlightedRiver === river.name ? `2px solid ${gradeColors[river.grade]}` : '1px solid #eee',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredRiver(river.name)}
                onMouseLeave={() => setHoveredRiver(null)}
              >
                <h3 style={{ margin: '0 0 10px 0', color: gradeColors[river.grade] }}>
                  {river.name} (Grade {river.grade})
                </h3>
                <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
                  Current Flow: <strong>{flows[river.name] !== undefined ? `${Math.round(flows[river.name])} CFS` : 'Loading...'}</strong>
                </p>
                {river.usgs_gage && (
                  <p style={{ margin: '5px 0', fontSize: '0.85em' }}>
                    <a href={`https://waterdata.usgs.gov/monitoring-location/${river.usgs_gage}/#parameterCode=00060`} target="_blank" rel="noopener noreferrer">
                      USGS Gage {river.usgs_gage} ↗
                    </a>
                  </p>
                )}
                
                <button
                  onClick={() => setHighlightedRiver(highlightedRiver === river.name ? null : river.name)}
                  style={{
                    marginTop: '10px',
                    marginRight: '8px',
                    padding: '8px 15px',
                    backgroundColor: gradeColors[river.grade],
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    fontWeight: 'bold',
                    opacity: highlightedRiver === river.name ? 1 : 0.9
                  }}
                >
                  {highlightedRiver === river.name ? '🔍 Highlighted' : 'Highlight →'}
                </button>

                <button
                  onClick={() => setSelectedRiver(selectedRiver === river.name ? null : river.name)}
                  style={{
                    marginTop: '10px',
                    padding: '8px 15px',
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9em',
                    fontWeight: 'bold'
                  }}
                >
                  {selectedRiver === river.name ? '▼ Hide Graph' : '▶ Show Graph'}
                </button>

                {river.forum_url && (
                  <a
                    href={river.forum_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-block',
                      marginTop: '10px',
                      marginLeft: '8px',
                      padding: '8px 15px',
                      backgroundColor: '#ff8c00',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9em',
                      fontWeight: 'bold',
                      textDecoration: 'none'
                    }}
                  >
                    💬 Community Forum ↗
                  </a>
                )}
                
                {selectedRiver === river.name && (
                  <FlowChart river={river} currentFlow={flows[river.name]} />
                )}
              </div>
            ))}
          </div>
          
          <p style={{ marginTop: '20px', color: '#666' }}>Rivers are color-coded by rapid grade on the map.</p>
        </div>
      )}
    </div>
  );
}

export default App;
