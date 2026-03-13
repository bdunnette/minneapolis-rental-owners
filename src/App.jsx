import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, List, Map as MapIcon, TrendingUp, Search, Info, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import L from 'leaflet';

const API_URL = 'https://services.arcgis.com/afSMGVsC7QlRK1kZ/arcgis/rest/services/Active_Rental_Licenses/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson';

const getPreferredTheme = () => {
  // Default when running in non-browser environments or if everything else fails
  if (typeof window === 'undefined') {
    return 'light';
  }

  // Try to read a persisted theme from localStorage
  try {
    const saved = window.localStorage ? window.localStorage.getItem('theme') : null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch (e) {
    // Ignore storage errors and fall through to matchMedia / default
  }

  // Fall back to system preference via matchMedia, if available
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  } catch (e) {
    // Ignore matchMedia errors and fall through to default
  }

  return 'light';
};

// Helper to normalize owner names: MY C TRUONG -> MY TRUONG
const normalizeName = (name) => {
  if (!name) return 'Unknown';
  // 1. To Upper Case for consistent matching
  let n = name.toUpperCase().trim();
  // 2. Remove middle initials (e.g., "MY C TRUONG" -> "MY TRUONG")
  // Matches a single uppercase letter followed by optional period, surrounded by spaces
  n = n.replace(/\s+[A-Z]\.?\s+/g, ' ');
  // 3. Remove double spaces
  n = n.replace(/\s+/g, ' ');
  return n.trim();
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [view, setView] = useState('map'); // 'map', 'list', or 'recent'
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState(() => getPreferredTheme());

  useEffect(() => {
    // Sync theme to DOM
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    // We only save to localStorage if it's a manual choice. 
    // Wait, the toggle sets it. So once set, it persists.
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes if no manual preference is saved
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      let storedTheme = null;
      try {
        storedTheme =
          window.localStorage && typeof window.localStorage.getItem === 'function'
            ? window.localStorage.getItem('theme')
            : null;
      } catch (err) {
        storedTheme = null;
      }

      if (!storedTheme) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('theme', newTheme);
      }
    } catch (e) {
      // Ignore storage errors; theme will still update for this session
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(API_URL);
        const features = response.data.features || [];

        // Filter features with valid coordinates (not null, not [0,0])
        const validFeatures = features.filter(f => {
          if (!f.geometry || !f.geometry.coordinates) return false;
          const [lon, lat] = f.geometry.coordinates;
          // Filter out null or missing values, and (0,0) which is usually a placeholder
          return lat !== null && lon !== null && lat !== 0 && lon !== 0 &&
            !isNaN(lat) && !isNaN(lon);
        });

        setData(validFeatures);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const aggregatedOwners = useMemo(() => {
    const counts = {};
    data.forEach(feature => {
      const rawName = feature.properties.ownerName || 'Unknown';
      const owner = normalizeName(rawName);

      if (!counts[owner]) {
        counts[owner] = {
          name: owner,
          count: 0,
          properties: []
        };
      }
      counts[owner].count += 1;
      counts[owner].properties.push(feature);
    });

    return Object.values(counts)
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const topOwners = useMemo(() => aggregatedOwners.slice(0, 100), [aggregatedOwners]);

  const filteredOwners = useMemo(() => {
    return topOwners.filter(owner =>
      owner.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [topOwners, searchQuery]);

  const recentLicenses = useMemo(() => {
    return [...data]
      .filter(f => f.properties.issueDate)
      .sort((a, b) => b.properties.issueDate - a.properties.issueDate)
      .slice(0, 50);
  }, [data]);

  const mapFeatures = useMemo(() => {
    if (selectedOwner) {
      return selectedOwner.properties;
    }
    // Default to top 1000 properties if nothing selected
    return data.slice(0, 1000);
  }, [data, selectedOwner]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const mapUrl = theme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-app)] overflow-hidden transition-colors duration-300">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-[var(--bg-header)] backdrop-blur-md border-b border-[var(--border)] z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-lg">
            <Building2 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-dim)] leading-tight">
              Minneapolis Rental Empire
            </h1>
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Data Reveal Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1 bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border)]">
            <NavButton active={view === 'map'} onClick={() => setView('map')} icon={<MapIcon size={18} />} label="Map" />
            <NavButton active={view === 'list'} onClick={() => setView('list')} icon={<List size={18} />} label="Top Owners" />
            <NavButton active={view === 'recent'} onClick={() => setView('recent')} icon={<TrendingUp size={18} />} label="New Licenses" />
          </nav>
          
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-all hover:scale-105 active:scale-95"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          owners={filteredOwners}
          selectedOwner={selectedOwner}
          setSelectedOwner={setSelectedOwner}
        />

        {/* Content Area */}
        <div className="flex-1 relative bg-[var(--bg-app)]">
          <AnimatePresence mode="wait">
            {view === 'map' && (
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full w-full">
                <MapContainer
                  center={[44.9778, -93.2650]}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    url={mapUrl}
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <MapUpdater selected={selectedOwner} features={mapFeatures} />
                  {mapFeatures.map((feature, idx) => (
                    <CircleMarker
                      key={feature.id || idx}
                      center={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
                      radius={selectedOwner ? 6 : 4}
                      pathOptions={{
                        fillColor: selectedOwner ? '#818cf8' : '#6366f1',
                        fillOpacity: selectedOwner ? 0.8 : 0.6,
                        color: '#ffffff',
                        weight: 1,
                        opacity: 0.8
                      }}
                    >
                      <Popup>
                        <div className="p-1 min-w-[200px]">
                          <h3 className="font-bold text-sm mb-1">{feature.properties.address}</h3>
                          <div className="text-[11px] space-y-1">
                            <p className="text-[var(--text-dim)] flex justify-between"><span>Owner:</span> <span className="text-[var(--primary)]">{feature.properties.ownerName}</span></p>
                            <p className="text-[var(--text-dim)] flex justify-between opacity-80"><span>Licensed Units:</span> <span>{feature.properties.licensedUnits}</span></p>
                            <p className="text-[var(--text-dim)] flex justify-between opacity-80"><span>Issued:</span> <span>{new Date(feature.properties.issueDate).toLocaleDateString()}</span></p>
                          </div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </motion.div>
            )}

            {view === 'list' && (
              <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="p-8 h-full overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOwners.map((owner, idx) => (
                    <OwnerCard key={owner.name} owner={owner} rank={idx + 1} totalDataCount={data.length} maxCount={topOwners[0].count} />
                  ))}
                </div>
              </motion.div>
            )}

            {view === 'recent' && (
              <motion.div key="recent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="p-8 h-full overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-4">
                  <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                    <TrendingUp className="text-emerald-400" /> Recent Licensing Activity
                  </h2>
                  {recentLicenses.map((f, i) => (
                    <div key={i} className="glass p-4 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-primary)] group-hover:text-emerald-500 transition-colors">{f.properties.address}</p>
                          <p className="text-xs text-[var(--text-dim)]">Issued: {new Date(f.properties.issueDate).toLocaleDateString()} • {f.properties.ownerName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[var(--text-secondary)]">{f.properties.licensedUnits} Units</p>
                        <p className="text-[10px] text-[var(--text-dim)] uppercase font-bold opacity-60">{f.properties.neighborhoodDesc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats overlay */}
          <div className="absolute bottom-6 left-6 flex gap-4 pointer-events-none z-[1000]">
            <StatBox label="Total Records" value={data.length.toLocaleString()} />
            <StatBox label="Unique Groups" value={aggregatedOwners.length.toLocaleString()} />
          </div>
        </div>
      </main>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium text-sm ${active ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-white/10'
      }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const Sidebar = ({ searchQuery, setSearchQuery, owners, selectedOwner, setSelectedOwner }) => (
  <aside className="w-80 flex flex-col bg-[var(--bg-sidebar)] backdrop-blur-sm border-r border-[var(--border)] z-20">
    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-app)]/50">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]" />
        <input
          type="text"
          placeholder="Filter by owner name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-[var(--text-primary)] placeholder:text-[var(--text-dim)]/50"
        />
      </div>
    </div>

    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
      <div className="px-3 pt-3 mb-2 text-[10px] uppercase tracking-widest text-[var(--primary)] font-bold flex justify-between">
        <span>Aggregated Portfolio List</span>
        <span>Count</span>
      </div>
      {owners.map((owner, idx) => (
        <motion.div
          key={owner.name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.01 }}
          onClick={() => setSelectedOwner(owner === selectedOwner ? null : owner)}
          className={`p-3 rounded-xl cursor-pointer transition-all flex flex-col ${selectedOwner?.name === owner.name
            ? 'bg-indigo-500 shadow-lg shadow-indigo-500/20'
            : 'hover:bg-white/5 border border-transparent'
            }`}
        >
          <div className="flex justify-between items-center">
            <div className="flex-1 min-w-0 pr-2">
              <p className={`text-sm font-bold truncate ${selectedOwner?.name === owner.name ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                {owner.name}
              </p>
            </div>
            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${selectedOwner?.name === owner.name ? 'bg-black/20 text-white' : 'bg-[var(--bg-input)] text-[var(--text-dim)]'
              }`}>
              {owner.count}
            </span>
          </div>
          {selectedOwner?.name === owner.name && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-3 pt-3 border-t border-white/20 space-y-1"
            >
              {owner.properties.slice(0, 8).map((prop, i) => (
                <div key={i} className="text-[10px] text-indigo-100 flex items-center gap-2 font-medium">
                  <div className="w-1 h-1 rounded-full bg-white/50" />
                  {prop.properties.address}
                </div>
              ))}
              {owner.count > 8 && (
                <div className="text-[10px] text-white/60 font-black pt-1 pl-3">
                  + {owner.count - 8} MORE PROPERTIES
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  </aside>
);

const OwnerCard = ({ owner, rank, totalDataCount, maxCount }) => (
  <div className="glass p-6 hover:translate-y-[-4px] transition-transform duration-300 border-l-4 border-l-indigo-500">
    <div className="flex justify-between items-center mb-4">
      <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
        <Building2 className="text-indigo-400 w-5 h-5" />
      </div>
      <div className="text-3xl font-black text-[var(--text-primary)] opacity-5 tracking-tighter italic">#{rank}</div>
    </div>
    <h3 className="text-lg font-bold mb-1 truncate text-[var(--text-primary)]">{owner.name}</h3>
    <p className="text-[var(--text-dim)] text-[10px] font-bold uppercase tracking-wider mb-6">{owner.count} RENTAL LICENSES</p>
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] font-bold">
        <span className="text-[var(--text-dim)] uppercase">Portfolio Size</span>
        <span className="text-indigo-400">{((owner.count / totalDataCount) * 100).toFixed(2)}% of city</span>
      </div>
      <div className="w-full bg-[var(--bg-input)] h-2 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(owner.count / maxCount) * 100}%` }}
          className="bg-indigo-500 h-full rounded-full"
        />
      </div>
    </div>
  </div>
);

const StatBox = ({ label, value }) => (
  <div className="glass px-6 py-4 flex flex-col pointer-events-auto shadow-2xl">
    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-tighter mb-1">{label}</span>
    <span className="text-2xl font-black text-[var(--text-primary)]">{value}</span>
  </div>
);

function MapUpdater({ selected, features }) {
  const map = useMap();
  useEffect(() => {
    // Invalidate size on mount/update to ensure map renders correctly in flex containers
    map.invalidateSize();

    if (selected && features.length > 0) {
      const coords = features
        .filter(f => f.geometry && f.geometry.coordinates)
        .map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);

      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [100, 100], maxZoom: 16 });
      }
    }
  }, [selected, features, map]);
  return null;
}

export default App;
