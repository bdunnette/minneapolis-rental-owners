# 🤖 AI Agent Documentation

## Project Context
This project, **Minneapolis Rental Empire**, has been developed with significant assistance from **Antigravity**, a powerful agentic AI coding assistant from Google DeepMind.

### AI Persona: Antigravity
Antigravity is optimized for high-performance web development, focusing on premium aesthetics, robust state management, and modern React patterns.

## Tech Stack Overview
Directives provided to the AI for this project:
- **Core**: React 19 + Vite
- **Styling**: Tailwind CSS 4 (Vanilla CSS variables for theming)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Maps**: Leaflet / React-Leaflet
- **Data**: Axios for ArcGIS REST API integration

## Key AI Contributions
- **Theme System**: Implemented a data-attribute based dark/light mode system with system preference detection and flicker-free loading.
- **Data Architecture**: Designed the normalization and aggregation logic to group individual licenses into owner portfolios.
- **Map Interactivity**: Created custom `MapUpdater` and selection logic for zooming to portfolios and highlighting single properties.
- **Routing & Deep Linking**: Transitioned the app to `react-router-dom` to support URL-based state sharing (`?owner=`, `?address=`).
- **Interactive Sidebar**: Developed the expanded owner view with clickable property addresses for map navigation.

## Future AI Instructions
- **Route Handling**: When adding new views, ensure they are integrated into the `Routes` block in `App.jsx` and follow the `basename` configuration in `main.jsx`.
- **Styling**: Prioritize the CSS variables defined in `index.css` for consistent theming. Avoid hardcoding colors unless they are specific brand accents.
- **Performance**: The map renders many `CircleMarker` components. Maintain the `useMemo` optimizations for filtered and aggregated data.

---
*This file serves as a handoff and context document for AI agents working on this codebase.*
