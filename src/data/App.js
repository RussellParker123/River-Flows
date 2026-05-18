import './App.css';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, useMap, Polyline, Marker, Popup, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import usStates from './us-states.json';
import { fetchUSGSFlow, fetchHistoricalFlow } from './fetchUSGSFlow';
import { rivers } from './rivers';
import { CommentsSection } from './CommentsSection';

// v1.5 - User location tracking + Salmon River accurate coordinates
// Fix for default Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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
    if (!selectedState) return;
    
    // Find the state in the GeoJSON data and calculate its bounds
    const stateFeature = usStates.features.find(f => f.properties.name === selectedState);
    if (!stateFeature) return;
    
    const coordinates = stateFeature.geometry.coordinates[0];
    if (!coordinates || coordinates.length === 0) return;
    
    // Calculate bounds from coordinates [lng, lat]
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];
    let minLng = coordinates[0][0];
    let maxLng = coordinates[0][0];
    
    coordinates.forEach(([lng, lat]) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
    
    // Fit map to state bounds with padding
    const bounds = [[minLat, minLng], [maxLat, maxLng]];
    setTimeout(() => {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
    }, 100);
  }, [selectedState, map]);
  
  return null;
}

function UserLocationMarker({ userLocation }) {
  if (!userLocation) return null;
  
  return (
    <Marker
      position={[userLocation.latitude, userLocation.longitude]}
      icon={L.divIcon({
        className: 'user-location-marker',
        html: `<div style="
          width: 30px;
          height: 30px;
          background-color: #007bff;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(0, 123, 255, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
          "></div>
        </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
      })}
    >
      <Popup>
        <strong>📍 Your Location</strong><br />
        Lat: {userLocation.latitude.toFixed(4)}<br />
        Lng: {userLocation.longitude.toFixed(4)}<br />
        Accuracy: {Math.round(userLocation.accuracy)}m
      </Popup>
    </Marker>
  );
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
    
    // Initial fetch
    fetchAllFlows();
    
    // Refresh every 5 minutes (300000 ms) to keep data current
    const interval = setInterval(fetchAllFlows, 300000);
    
    return () => clearInterval(interval);
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
      <h1 style={{ textAlign: 'center', fontSize: isMobile ? '1.8em' : '2.5em', marginBottom: '10px', color: '#fff', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
        🏞️ River Flows
      </h1>
      <p style={{ textAlign: 'center', fontSize: isMobile ? '0.95em' : '1.1em', color: '#e0e0e0', marginBottom: isMobile ? '20px' : '40px', textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>
        Real-time water flow data for your next adventure
      </p>

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
            style={(feature) => ({
              color: '#333',
              weight: 2,
              opacity: 0.8,
              fillColor: '#8e44ad',
              fillOpacity: 0.4,
              cursor: 'pointer'
            })}
            onEachFeature={(feature, layer) => {
              layer.on('click', () => {
                onNavigateToMap(feature.properties.name);
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

      {/* Alternative: Show River Cards Grid Below */}
      <h2 style={{ textAlign: 'center', color: '#fff', marginBottom: '30px', textShadow: '1px 1px 3px rgba(0,0,0,0.5)' }}>Featured Rivers by Grade</h2>
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

function FlowChart({ river, currentFlow, segment }) {
  const [historicalData, setHistoricalData] = useState([]);
  const [loadingHistorical, setLoadingHistorical] = useState(true);
  const isMobile = window.innerWidth < 768;
  
  // Use segment's youtube_url if available, otherwise use river's youtube_url
  const youtubeUrl = segment?.youtube_url || river.youtube_url;

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
      
      {youtubeUrl && !youtubeUrl.includes('placeholder') && (
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
  const [flows, setFlows] = useState({});
  const [view, setView] = useState('home'); // 'home' or 'map'
  const [selectedRiver, setSelectedRiver] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [hoveredRiver, setHoveredRiver] = useState(null);
  const [highlightedRiver, setHighlightedRiver] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const geoJsonRef = useRef();

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }
    
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({ latitude, longitude, accuracy });
        setShowUserLocation(true);
      },
      (error) => {
        let errorMsg = 'Unable to retrieve your location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Enable in browser settings.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }
        setLocationError(errorMsg);
        console.error('Geolocation error:', error);
      }
    );
  };

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

  // Memoize click handlers to prevent unnecessary re-renders
  const handleRiverClick = useCallback((river, seg) => {
    setSelectedRiver(river.name);
    setSelectedSegment(seg);
    setHighlightedRiver(river.name);
  }, []);

  const handleRiverHover = useCallback((riverName) => {
    setHoveredRiver(riverName);
  }, []);

  const handleRiverLeave = useCallback(() => {
    setHoveredRiver(null);
  }, []);

  // Memoize the rivers rendering to prevent recalculation on every render
  const renderedRivers = useMemo(() => {
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
                  mouseover: () => handleRiverHover(river.name),
                  mouseout: handleRiverLeave,
                  click: () => handleRiverClick(river, seg)
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
          
          // Pre-compute transformed coordinates
          const transformedCoords = coords.map(([lng, lat]) => [lat, lng]);
          
          const outline = (
            <Polyline
              key={river.name + '-outline-' + i}
              positions={transformedCoords}
              pathOptions={{ 
                color: '#000', 
                weight: isHighlighted ? 10 : 8, 
                opacity: isHighlighted ? 0.5 : 0.35 
              }}
              eventHandlers={{
                mouseover: () => handleRiverHover(river.name),
                mouseout: handleRiverLeave,
                click: () => handleRiverClick(river, seg)
              }}
            />
          );

          const line = (
            <Polyline
              key={river.name + '-' + seg.name + '-' + i}
              positions={transformedCoords}
              pathOptions={{ 
                color: gradeColors[seg.grade] || '#666', 
                weight: lineWeight,
                opacity: lineOpacity
              }}
              eventHandlers={{
                mouseover: () => handleRiverHover(river.name),
                mouseout: handleRiverLeave,
                click: () => handleRiverClick(river, seg)
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
  }, [selectedState, highlightedRiver, hoveredRiver, flows, handleRiverClick, handleRiverHover, handleRiverLeave]);

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

  useEffect(() => {
    if (selectedState) {
      setShowLegend(true);
      const timer = setTimeout(() => setShowLegend(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [selectedState]);

  useEffect(() => {
    if (!showUserLocation || !navigator.geolocation) return;
    
    // Watch user location for real-time updates
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation({ latitude, longitude, accuracy });
        setLocationError(null);
      },
      (error) => {
        console.error('Location watch error:', error);
        // Don't show error for watch, only for initial request
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, [showUserLocation]);

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
    <div className="App" style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* HEADER - Only on mobile */}
      {isMobile && (
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          zIndex: 999, 
          backgroundColor: '#fff', 
          borderBottom: '2px solid #ddd',
          padding: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '50px',
          boxSizing: 'border-box'
        }}>
          <button
            onClick={() => {
              setView('home');
              setSelectedState(null);
              setSelectedRiver(null);
            }}
            style={{
              padding: '10px 15px',
              backgroundColor: '#8e44ad',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.95em',
              transition: 'all 0.2s ease',
              touchAction: 'manipulation',
              userSelect: 'none'
            }}
            onTouchStart={(e) => e.currentTarget.style.opacity = '0.7'}
            onTouchEnd={(e) => e.currentTarget.style.opacity = '1'}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: '1.2em', color: '#333', flex: 1, textAlign: 'center' }}>River Flows</h1>
          <button
            onClick={() => {
              if (showUserLocation) {
                setShowUserLocation(false);
                setUserLocation(null);
              } else {
                requestLocation();
              }
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: showUserLocation ? '#e74c3c' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85em',
              fontWeight: 'bold',
              minWidth: '70px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = showUserLocation ? '#c0392b' : '#0056b3'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = showUserLocation ? '#e74c3c' : '#007bff'}
            onTouchStart={(e) => e.currentTarget.style.opacity = '0.7'}
            onTouchEnd={(e) => e.currentTarget.style.opacity = '1'}
          >
            {showUserLocation ? '📍 Hide' : '📍 Locate'}
          </button>
        </div>
      )}

      {/* Show location error if any */}
      {locationError && view !== 'home' && (
        <div style={{
          position: 'absolute',
          top: isMobile ? '60px' : '10px',
          left: '10px',
          right: isMobile ? '10px' : 'auto',
          backgroundColor: '#e74c3c',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '6px',
          fontSize: '0.9em',
          zIndex: 900,
          maxWidth: isMobile ? 'auto' : '300px'
        }}>
          ⚠️ {locationError}
        </div>
      )}

      {/* MAP - LEFT SIDE on desktop, TOP on mobile */}
      <div style={{ 
        flex: isMobile ? '0 0 40%' : 2, 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        position: 'relative',
        marginTop: isMobile ? '50px' : 0,
        borderBottom: isMobile ? '3px solid #8e44ad' : 'none'
      }}>
        {/* Back button - desktop only */}
        {!isMobile && (
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
              fontSize: '1em'
            }}
          >
            ← Back
          </button>
        )}

        {/* Map Header - desktop only */}
        {!isMobile && (
          <h1 style={{ 
            position: 'absolute',
            top: '50px',
            left: '10px',
            right: '10px',
            margin: 0,
            fontSize: '1.8em',
            color: '#333',
            zIndex: 800,
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: '10px',
            borderRadius: '6px'
          }}>🏞️ River Flows</h1>
        )}
        
        <MapContainer center={[39.8283, -98.5795]} zoom={4} style={{ width: '100%', height: '100%' }}>
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
              {renderedRivers}
            </LayersControl.Overlay>

            <LayersControl.Overlay checked={showUserLocation} name="Your Location">
              {showUserLocation && <UserLocationMarker userLocation={userLocation} />}
            </LayersControl.Overlay>
          </LayersControl>

          <StateZoom selectedState={selectedState} />
        </MapContainer>

        {/* Legend */}
        {showLegend && (
          <div style={{ 
            padding: '6px 10px', 
            position: 'absolute', 
            bottom: isMobile && selectedRiver ? '10px' : isMobile ? '60px' : 0, 
            left: 0, 
            zIndex: isMobile && selectedRiver ? 400 : 500, 
            backgroundColor: 'white', 
            borderRadius: '4px', 
            margin: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            fontSize: isMobile ? '0.75em' : '0.8em',
            maxWidth: '160px',
            animation: 'fadeOut 0.5s ease-in 4.5s forwards',
            opacity: 1
          }}>
            <style>{`
              @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; pointer-events: none; }
              }
            `}</style>
            <strong style={{ fontSize: '0.9em' }}>Rapid Classes</strong>
            <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0 0' }}>
              <li style={{ margin: '3px 0' }}><span style={{ display: 'inline-block', width: 12, height: 10, background: gradeColors['I'], marginRight: 6 }}></span><span style={{ fontSize: '0.9em' }}>I</span></li>
              <li style={{ margin: '3px 0' }}><span style={{ display: 'inline-block', width: 12, height: 10, background: gradeColors['II'], marginRight: 6 }}></span><span style={{ fontSize: '0.9em' }}>II</span></li>
              <li style={{ margin: '3px 0' }}><span style={{ display: 'inline-block', width: 12, height: 10, background: gradeColors['III'], marginRight: 6 }}></span><span style={{ fontSize: '0.9em' }}>III</span></li>
              <li style={{ margin: '3px 0' }}><span style={{ display: 'inline-block', width: 12, height: 10, background: gradeColors['IV'], marginRight: 6 }}></span><span style={{ fontSize: '0.9em' }}>IV</span></li>
              <li style={{ margin: '3px 0' }}><span style={{ display: 'inline-block', width: 12, height: 10, background: gradeColors['V'], marginRight: 6 }}></span><span style={{ fontSize: '0.9em' }}>V</span></li>
            </ul>
          </div>
        )}

        {/* Mobile info toggle button */}
        {isMobile && selectedRiver && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            zIndex: 500,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '8px 12px',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            fontSize: '0.85em',
            fontWeight: 'bold',
            color: '#333'
          }}>
            👆 Scroll up to see more
          </div>
        )}
      </div>

      {/* MOBILE RIVER LIST - Shows below map */}
      {isMobile && selectedState && (
        <div style={{
          flex: '1 1 60%',
          width: '100%',
          backgroundColor: '#fff',
          borderTop: '2px solid #8e44ad',
          overflow: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          padding: '10px'
        }}>
          {rivers.filter(r => r.state === selectedState).map((river) => (
            <div
              key={river.name}
              style={{
                padding: '12px',
                marginBottom: '10px',
                backgroundColor: '#f9f9f9',
                border: `2px solid ${gradeColors[river.grade]}`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
            >
              <h3 style={{ margin: '0 0 8px 0', color: gradeColors[river.grade], fontSize: '1.1em' }}>
                <a 
                  href={`https://www.americanwhitewater.org/content/River-Guides/?name=${encodeURIComponent(river.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: gradeColors[river.grade], textDecoration: 'none', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  {river.name}
                </a>
                {' '}<span style={{ fontSize: '0.85em', color: '#666' }}>Class {river.grade}</span>
              </h3>
              <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
                Current Flow: <strong>
                  {flows[river.name] !== undefined ? (
                    `${Math.round(flows[river.name])} CFS`
                  ) : (
                    <span style={{ color: '#999' }}>
                      No USGS data available
                    </span>
                  )}
                </strong>
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setHighlightedRiver(highlightedRiver === river.name ? null : river.name)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: gradeColors[river.grade],
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85em',
                    fontWeight: 'bold'
                  }}
                >
                  {highlightedRiver === river.name ? '🔍' : '🔍 Highlight'}
                </button>

                <button
                  onClick={() => {
                    if (selectedRiver === river.name) {
                      setSelectedRiver(null);
                      setSelectedSegment(null);
                    } else {
                      setSelectedRiver(river.name);
                      // Set segment to the first segment of this river
                      if (river.segments && river.segments.length > 0) {
                        setSelectedSegment(river.segments[0]);
                      }
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85em',
                    fontWeight: 'bold'
                  }}
                >
                  {selectedRiver === river.name ? '▼ Hide' : '▶ Show'}
                </button>

                <a
                  href="https://www.americanwhitewater.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '6px 12px',
                    backgroundColor: '#ff8c00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85em',
                    fontWeight: 'bold',
                    textDecoration: 'none'
                  }}
                >
                  💬 Forum
                </a>
              </div>

              {selectedRiver === river.name && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #ddd', paddingTop: '12px' }}>
                  <p style={{ margin: '8px 0', fontSize: '0.9em', color: '#555' }}>
                    {river.description}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MOBILE SIDE PANEL - Slides in from bottom when river selected */}
      {isMobile && selectedRiver && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          top: '50px',
          zIndex: 1001,
          backgroundColor: '#fff',
          borderTop: '3px solid #8e44ad',
          overflow: 'auto',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          animation: 'slideUp 0.3s ease',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.2)'
        }}>
          <style>{`
            @keyframes slideUp {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
          `}</style>
          
          <div style={{ 
            position: 'sticky',
            top: 0,
            padding: '15px', 
            borderBottom: '2px solid #ddd',
            backgroundColor: '#fff',
            zIndex: 10,
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}>
            <h2 style={{ 
              margin: 0, 
              color: gradeColors[rivers.find(r => r.name === selectedRiver)?.grade || 'III'], 
              fontSize: '1.3em',
              flex: 1
            }}>
              {selectedRiver}
            </h2>
            <button
              onClick={() => setSelectedRiver(null)}
              style={{
                backgroundColor: '#ff6b6b',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                fontSize: '20px',
                cursor: 'pointer',
                fontWeight: 'bold',
                flexShrink: 0,
                marginLeft: '10px',
                transition: 'all 0.2s ease'
              }}
              onTouchStart={(e) => e.currentTarget.style.opacity = '0.7'}
              onTouchEnd={(e) => e.currentTarget.style.opacity = '1'}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: '15px', paddingBottom: '80px' }}>
            {rivers.find(r => r.name === selectedRiver) && (
              <>
                <FlowChart 
                  river={rivers.find(r => r.name === selectedRiver)} 
                  currentFlow={flows[selectedRiver]}
                  segment={selectedSegment}
                />
                <CommentsSection riverName={selectedRiver} riverState={rivers.find(r => r.name === selectedRiver)?.state} />
              </>
            )}
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR - RIGHT SIDE */}
      {selectedState && !isMobile && (
        <div style={{ 
          flex: 1, 
          width: '100%',
          height: '100%',
          overflow: 'auto',
          backgroundColor: '#f9f9f9',
          borderLeft: '2px solid #ddd',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <h2 style={{ marginTop: 0, color: '#333' }}>🗺️ {selectedState}</h2>
          <h3 style={{ color: '#666', marginBottom: '15px' }}>Major Rivers</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
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
                  <a 
                    href={`https://www.americanwhitewater.org/content/River-Guides/?name=${encodeURIComponent(river.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: gradeColors[river.grade], textDecoration: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {river.name} (Grade {river.grade})
                  </a>
                </h3>
                <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
                  Current Flow: <strong>
                    {flows[river.name] !== undefined ? (
                      `${Math.round(flows[river.name])} CFS`
                    ) : (
                      <span style={{ color: '#999' }}>
                        No USGS data available
                      </span>
                    )}
                  </strong>
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
                  <>
                    <FlowChart river={river} currentFlow={flows[river.name]} segment={selectedSegment} />
                    <CommentsSection riverName={river.name} riverState={river.state} />
                  </>
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
