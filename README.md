# Conference Radar - Quick Start Guide

## One-Command Development Setup

This project is set up so you can run both the backend and dashboard together with a single command.

### Prerequisites

- **Node.js** (v16+) and **npm**
- **PostgreSQL** (installed and running)
- **Google Chrome** (for extension testing)

### First Time Setup

1. **Install dependencies** (from project root):

```bash
npm install
npm run install-all
```

2. **Set up database**:

```bash
# Create database
createdb conference_radar

# Create schema
psql -U postgres -h localhost -d conference_radar -f database/schema.sql
```

3. **Configure environment variables**:

Create `backend/.env`:
```
PORT=5000
JWT_SECRET_KEY=your_strong_secret_key_here
DB_USER=postgres
DB_HOST=localhost
DB_NAME=conference_radar
DB_PASSWORD=your_postgres_password
DB_PORT=5432
```

Create `dashboard/.env.local`:
```
VITE_API_URL=http://localhost:5000
```

### Run Everything

```bash
npm run dev
```

This will start both:
- **Backend** at http://localhost:5000 (Node.js + Express + Scheduler)
- **Dashboard** at http://localhost:5173 (React + Vite)

Both run in the same terminal. Press **Ctrl+C** to stop.

### Individual Commands

If you need to run components separately:

```bash
# Backend only
npm run backend

# Dashboard only
npm run dashboard
```

### Load Chrome Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Open any conference website and use the side panel

### Further Documentation

See [documentation/project_documentation_content.md](documentation/project_documentation_content.md) for:
- Full API endpoints
- Database schema details
- Project architecture
- Setup troubleshooting

---

**Happy coding!** 🚀
