import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Building2, List, Map as MapIcon, TrendingUp, Search, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import L from 'leaflet';

// Fix for default marker icon in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = 'https://services.arcgis.com/afSMGVsC7QlRK1kZ/arcgis/rest/services/Active_Rental_Licenses/FeatureServer/0/query?outFields=*&where=1%3D1&f=geojson';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(API_URL);
        setData(response.data.features || []);
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
      <div className="flex items-center justify-center h-screen bg-[#0f172a] text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0b0f1a] overflow-hidden">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-[#1e293b]/50 backdrop-blur-md border-b border-white/5 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500 rounded-lg">
            <Building2 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 leading-tight">
              Minneapolis Rental Empire
            </h1>
            <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Data Reveal Dashboard</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5">
          <NavButton active={view === 'map'} onClick={() => setView('map')} icon={<MapIcon size={18} />} label="Map" />
          <NavButton active={view === 'list'} onClick={() => setView('list')} icon={<List size={18} />} label="Top Owners" />
          <NavButton active={view === 'recent'} onClick={() => setView('recent')} icon={<TrendingUp size={18} />} label="New Licenses" />
        </nav>
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
        <div className="flex-1 relative bg-black">
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
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <MapUpdater selected={selectedOwner} features={mapFeatures} />
                  {mapFeatures.map((feature, idx) => (
                    <Marker
                      key={feature.id || idx}
                      position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
                    >
                      <Popup>
                        <div className="p-1 min-w-[200px]">
                          <h3 className="font-bold text-sm mb-1 text-white">{feature.properties.address}</h3>
                          <div className="text-[11px] space-y-1">
                            <p className="text-slate-300 flex justify-between"><span>Owner:</span> <span className="text-indigo-400">{feature.properties.ownerName}</span></p>
                            <p className="text-slate-400 flex justify-between"><span>Licensed Units:</span> <span>{feature.properties.licensedUnits}</span></p>
                            <p className="text-slate-400 flex justify-between"><span>Issued:</span> <span>{new Date(feature.properties.issueDate).toLocaleDateString()}</span></p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
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
                          <p className="font-bold text-white group-hover:text-emerald-400 transition-colors">{f.properties.address}</p>
                          <p className="text-xs text-slate-500">Issued: {new Date(f.properties.issueDate).toLocaleDateString()} • {f.properties.ownerName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-300">{f.properties.licensedUnits} Units</p>
                        <p className="text-[10px] text-slate-600 uppercase font-bold">{f.properties.neighborhoodDesc}</p>
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

      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium text-sm ${active ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const Sidebar = ({ searchQuery, setSearchQuery, owners, selectedOwner, setSelectedOwner }) => (
  <aside className="w-80 flex flex-col bg-[#1e293b]/30 backdrop-blur-sm border-r border-white/5 z-20">
    <div className="p-4 border-b border-white/5 bg-[#0b0f1a]/50">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter by owner name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-slate-600"
        />
      </div>
    </div>

    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
      <div className="px-3 pt-3 mb-2 text-[10px] uppercase tracking-widest text-indigo-400 font-bold flex justify-between">
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
              <p className={`text-sm font-bold truncate ${selectedOwner?.name === owner.name ? 'text-white' : 'text-slate-200'}`}>
                {owner.name}
              </p>
            </div>
            <span className={`text-xs font-black px-2 py-0.5 rounded-md ${selectedOwner?.name === owner.name ? 'bg-black/20' : 'bg-white/5 text-slate-400'
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
      <div className="text-3xl font-black text-white/5 tracking-tighter italic">#{rank}</div>
    </div>
    <h3 className="text-lg font-bold mb-1 truncate text-white">{owner.name}</h3>
    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-6">{owner.count} RENTAL LICENSES</p>
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] font-bold">
        <span className="text-slate-500 uppercase">Portfolio Size</span>
        <span className="text-indigo-400">{((owner.count / totalDataCount) * 100).toFixed(2)}% of city</span>
      </div>
      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
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
    <span className="text-2xl font-black text-white">{value}</span>
  </div>
);

function MapUpdater({ selected, features }) {
  const map = useMap();
  useEffect(() => {
    if (selected && features.length > 0) {
      const coords = features.map(f => [f.geometry.coordinates[1], f.geometry.coordinates[0]]);
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [100, 100], maxZoom: 16 });
    }
  }, [selected, features, map]);
  return null;
}

export default App;
