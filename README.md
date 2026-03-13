# 🏗️ Minneapolis Rental Empire

A high-performance, interactive dashboard for visualizing the geographic footprint of rental property owners in Minneapolis. This tool aggregates public rental licensing data to reveal the city's largest landlords and their portfolio distributions.

![Dashboard Preview](https://github.com/user-attachments/assets/...) <!-- Placeholder for actual screenshot if available -->

## 🌟 Key Features

- **🗺️ Interactive Map**: Explore rental licenses across the city using a responsive Leaflet-powered map.
- **📊 Portfolio Aggregation**: Groups thousands of individual license records into unified owner portfolios.
- **🔗 Deep Linking**: Share specific views using URL parameters (e.g., `?owner=OWNER_NAME` or `?address=STREET_ADDRESS`).
- **🌓 Dynamic Theming**: Supports Light and Dark modes with automatic system preference detection.
- **⚡ Real-time Filtering**: Instantly search through the top 100 owners by name.
- **✨ Premium UI**: Built with glassmorphism, smooth Framer Motion animations, and a responsive mobile-friendly layout.

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Mapping**: [Leaflet](https://leafletjs.com/) & [React Leaflet](https://react-leaflet.js.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **HTTP Client**: [Axios](https://axios-http.com/)

## 🚀 Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) and [Bun](https://bun.sh/) (recommended) or npm installed.

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/minneapolis-rental-owners.git

# Navigate to the project directory
cd minneapolis-rental-owners

# Install dependencies
bun install
```

### Development

```bash
bun run dev
```
The app will be available at `http://localhost:5173/minneapolis-rental-owners/`.

### Build

```bash
bun run build
```
The production-ready assets will be generated in the `dist/` folder.

## 🌐 Deployment

The project is configured to be served from the `/minneapolis-rental-owners/` subpath (see `vite.config.js`).

### GitHub Pages

1. Ensure the `base` property in `vite.config.js` matches your repository name.
2. Build the project: `bun run build`.
3. Deploy the `dist/` directory to your `gh-pages` branch.

### Manual Hosting

If deploying to the root of a domain, remove the `base` property from `vite.config.js` and the `basename` prop from `BrowserRouter` in `src/main.jsx`.

## 📂 Data Source

This dashboard utilizes the [Minneapolis Active Rental Licenses](https://opendata.minneapolismn.gov/datasets/cityofminneapolis::active-rental-licenses/about) dataset provided by the City of Minneapolis Open Data portal. Data is fetched in real-time via the ArcGIS REST API.

---

*Created with ❤️ for the Minneapolis community.*
