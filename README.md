# 🕵️‍♀️ Totally Spies (OSINT Suite)

<p align="center">
  <strong>A Modular Open Source Intelligence (OSINT) Automation Platform & Interactive Investigation Graph Suite</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.14-blue?logo=python" alt="Python Version" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TypeScript-5.5+-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-18.3+-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Tests-22%20Passed-10b981?logo=pytest" alt="Pytest" />
  <img src="https://img.shields.io/badge/License-MIT-amber" alt="License" />
</p>

---

## ⚡ Overview

**Totally Spies** is a tactical Open Source Intelligence (OSINT) suite and cyber surveillance command center. Built with an asynchronous Python backend and a React/TypeScript interface, Totally Spies enables investigators and security researchers to orchestrate cross-platform reconnaissance, correlate threat actors, audit network perimeters, and map complex relationships through a force-directed visual knowledge graph.

Inspired by WOOHP tactical aesthetics, the platform features high-density analytical workspaces, real-time WebSocket telemetry, and theme customization.

---

## 🌟 Key Capabilities & Modules

### 🍀 1. Clover: Identity Reconnaissance
- **30+ Platform Profiling**: High-concurrency username discovery across social networks, code repositories, forums, and developer platforms (GitHub, Twitter/X, Reddit, Mastodon, Keybase, Steam, etc.).
- **Permutation Generator**: Deterministic handle permutations and alias variations.
- **False-Positive Prevention**: Content heuristics, status-code verification, and confidence ratings.
- **One-Click Case Attachment**: Instant creation of case artifacts and directed relationship edges (`OWNS_ACCOUNT`).

### 🌐 2. Exposure: Host & Perimeter Intelligence
- **Powered by Shodan InternetDB**: High-speed, keyless IP reconnaissance.
- **Automatic Domain Resolution**: Automatically resolves domain names to IPv4 before probing.
- **Port & Service Fingerprinting**: Identifies open ports (HTTP, HTTPS, SSH, DNS, RTSP, etc.) and software signatures.
- **Vulnerability Mapping**: Correlates discovered CPEs with NIST National Vulnerability Database (NVD) CVE entries.

### 📹 3. Streaming & Camera Exposure Monitor
- **Video Protocol Auditing**: Audits exposed perimeters for streaming protocols (`RTSP:554`, `HTTP/MJPEG:80/81/8080`, `RTMP:1935`, `ONVIF:37777/8000`).
- **Vendor Fingerprinting**: Detects camera manufacturers (Hikvision, Dahua, Axis, Panasonic, Avigilon) and correlates critical firmware advisories.
- **Dossier Attachment**: Directly attach exposed camera perimeters into active investigation cases.

### 🛡️ 4. Breach Intelligence Suite
- **10B+ Incident Records**: Instant querying across email addresses, usernames, domains, and credential hashes.
- **Global Breach Telemetry**: Real-time visual threat nodes and incident metrics.
- **Exposure Graphing**: Directly attach verified breach events to target nodes (`EXPOSED_IN_BREACH`).

### 🕸️ 5. Case Investigation Workspace (6 Synchronized Views)
Each investigation dossier features 6 synchronized views sharing the same underlying data graph:
1. **Graph View**: Interactive 2D WebGL/SVG relationship canvas powered by **React Flow**, featuring radial auto-organization, category filters, and entity side drawer.
2. **Table View**: High-density tabular spreadsheet with real-time text search, column sorting, confidence gauges, and instant CSV export.
3. **Entities Dossier**: Catalog cards grouping primary targets, accounts, and infrastructure with quick focus in the graph.
4. **Relationships Matrix**: Directed edge ledger detailing source &rarr; relation type &rarr; target semantics.
5. **Evidence Vault**: Chain-of-custody forensic records with verification badges, SHA-256 stamps, and raw JSON inspectors.
6. **Chronological Timeline**: Surveillance progression timeline mapping historical breaches, discovery dates, and scan milestones.

### 🎨 6. Authentic WOOHP Tactical Themes
- 🩵 **WOOHP Cyan**: Tactical Command & Operations (Default)
- 🩷 **Clover Rose**: Neon Identity Reconnaissance
- 💚 **Sam Emerald**: Cyber Intelligence & Cryptography
- 🧡 **Alex Amber**: Tactical Pursuit & Infrastructure
- Quick-access palette dropdown in the top bar with local persistence and backend synchronization.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│           Vite + React 18 + TypeScript Frontend        │
│    (React Flow, Lucide Icons, Tailwind CSS, Themes)     │
└───────────────────────────┬────────────────────────────┘
                            │ REST API & WebSockets
┌───────────────────────────▼────────────────────────────┐
│                  FastAPI Asynchronous Core              │
├───────────────────────────┬────────────────────────────┤
│   Reconnaissance Modules  │      Core Engine           │
│   • Clover (Identity)     │      • Scan Orchestrator   │
│   • Exposure (Shodan)     │      • Graph Engine        │
│   • Breaches Intelligence │      • Report Generator    │
│   • Streaming Monitor     │      • Audit Logger        │
└───────────────────────────┴────────────────────────────┘
                            │ SQLAlchemy Async
┌───────────────────────────▼────────────────────────────┐
│            SQLite Database (aiosqlite)                 │
│      Cases ── Targets ── Scans ── Artifacts ── Edges   │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites
- **Python**: Version 3.10, 3.11, 3.12, or 3.14
- **Node.js**: Version 18.0+ or 20.0+ (`npm` or `pnpm`)
- **Docker & Docker Compose** (Optional, for containerized deployment)

---

### Option 1: Local Development

#### 1. Clone Repository:
```bash
git clone https://github.com/your-username/totally-spies.git
cd totally-spies
```

#### 2. Start Backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate       # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # Optional: customize environment variables
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Documentation (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- Interactive ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health Check: [http://localhost:8000/api/health](http://localhost:8000/api/health)

#### 3. Start Frontend:
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
- Web Application: [http://localhost:3000](http://localhost:3000)

---

### Option 2: Docker Compose (Single Command)

```bash
docker compose up --build -d
```

- Frontend UI: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)
- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

To stop the containers:
```bash
docker compose down
```

---

## 🧪 Testing

### Backend Unit & Integration Tests:
```bash
cd backend
pytest -v
```
All **22 tests** covering API lifecycle, Clover identity matching, Shodan exposure, breach correlation, and database cascade deletions pass with 100% health.

### Frontend Typechecking & Production Build:
```bash
cd frontend
npm run build
```

---

## 📁 Repository Structure

```
totally-spies/
├── .github/
│   └── workflows/
│       └── ci.yml               # Automated CI (pytest & npm build)
├── backend/
│   ├── app/
│   │   ├── api/                 # FastAPI routers (cases, targets, scans, etc.)
│   │   ├── core/                # Database engine, config, rate limiting
│   │   ├── models/              # SQLAlchemy models & Pydantic schemas
│   │   ├── modules/             # Reconnaissance scanners (Clover, Exposure)
│   │   ├── services/            # Graph service & scan orchestrator
│   │   └── main.py              # Application entrypoint & middleware
│   ├── tests/                   # 22 automated pytest test suites
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Backend Docker container
│   └── .env.example             # Configuration template
├── frontend/
│   ├── src/
│   │   ├── components/          # Reusable tactical UI components
│   │   ├── contexts/            # Theme & application state providers
│   │   ├── pages/               # Dashboard, Cases, Clover, Breaches, etc.
│   │   ├── services/            # API client & WebSocket connections
│   │   └── types/               # TypeScript interfaces matching backend
│   ├── package.json             # Frontend dependencies & scripts
│   ├── vite.config.ts           # Vite build configuration
│   ├── tailwind.config.js       # Tailwind theme configuration
│   ├── nginx.conf               # Production Nginx reverse proxy
│   └── Dockerfile               # Frontend multi-stage Docker build
├── docker-compose.yml           # Unified container orchestration
├── .gitignore                   # Multi-language git ignore
├── LICENSE                      # MIT Open Source License
└── README.md                    # Project documentation
```

---

## ⚖️ Ethical & Legal Disclaimer

> [!IMPORTANT]
> **Totally Spies** is designed and distributed strictly for authorized Open Source Intelligence (OSINT) research, security auditing, digital defense, and privacy analysis.
>
> Users are solely responsible for complying with all applicable local, state, national, and international laws, regulations, and third-party terms of service when utilizing this tool. The authors and contributors assume no liability for misuse, unauthorized access, or actions taken using this software.

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
