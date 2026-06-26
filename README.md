# Stenly Strsser - Network Management Platform

> A sophisticated distributed command and control infrastructure platform for coordinated network operations across multiple servers

![TypeScript](https://img.shields.io/badge/TypeScript-79.6%25-3178c6?logo=typescript)
![JavaScript](https://img.shields.io/badge/JavaScript-16.2%25-f7df1e?logo=javascript)
![CSS](https://img.shields.io/badge/CSS-4%25-1572b6?logo=css3)
![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)
![License](https://img.shields.io/badge/License-Unspecified-lightgrey)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [WebSocket Events](#websocket-events)
- [Deployment](#deployment)
- [Database Schema](#database-schema)
- [File Documentation](#file-documentation)
- [Development](#development)
- [Performance Considerations](#performance-considerations)

---

## 🎯 Overview

**Stenly Stresser** is an enterprise-grade distributed infrastructure management platform designed to orchestrate and monitor complex network operations across geographically distributed servers. The system provides real-time control, monitoring, and coordination capabilities through an intuitive web interface.

### Key Characteristics

- **Multi-Server Orchestration**: Control and coordinate operations across unlimited server nodes
- **Real-time Monitoring**: Live performance metrics, status updates, and system logs via WebSocket
- **SSH-based Deployment**: Secure remote execution using SSH2 with key-based and password authentication
- **Dynamic Resource Management**: Automatic Go binary compilation and deployment on target servers
- **Comprehensive Analytics**: Track system metrics, bandwidth utilization, and operational statistics
- **Enterprise-grade UI**: Modern React-based dashboard with real-time updates and responsive design

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Frontend Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ React 19 + TypeScript + Tailwind CSS + shadcn/ui    │   │
│  │ - Dashboard Interface                               │   │
│  │ - Real-time WebSocket Communication                 │   │
│  │ - Server Management UI                              │   │
│  │ - SSH Key Management                                │   │
│  │ - Operation Control Panel                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                                              │
         │          Socket.IO (WebSocket)             │
         │                                              │
┌─────────────────────────────────────────────────────────────┐
│                   Backend Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Node.js + Express + TypeScript                       │   │
│  │ - REST API Endpoints                                │   │
│  │ - WebSocket Server (Socket.IO)                      │   │
│  │ - SSH Client Management                             │   │
│  │ - Database Abstraction Layer                        │   │
│  │ - Deployment Orchestration Engine                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │              │              │
    ┌────┴─────┐   ┌───┴────┐   ┌────┴─────┐
    │           │   │         │   │           │
    ▼           ▼   ▼         ▼   ▼           ▼
┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐
│ MySQL   │ │ SSH2     │ │ Logger   │ │ Config  │
│ Database│ │ Client   │ │ System   │ │ Manager │
└─────────┘ └──────────┘ └──────────┘ └─────────┘
```

---

## 🛠️ Tech Stack

### Frontend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.0.0 | UI Framework |
| **TypeScript** | 5.8.2 | Type-safe development |
| **Vite** | 6.2.0 | Build tool & dev server |
| **Tailwind CSS** | 4.1.14 | Utility-first styling |
| **shadcn/ui** | 4.2.0 | Component library |
| **Socket.IO Client** | 4.8.3 | Real-time communication |
| **Lucide React** | 0.546.0 | Icon system |
| **Motion** | 12.23.24 | Animation library |
| **React Hot Toast** | 2.6.0 | Notification system |

### Backend Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | Latest | Runtime |
| **Express** | 4.21.2 | Web framework |
| **TypeScript** | 5.8.2 | Type-safe server code |
| **MySQL2** | 3.22.0 | Database driver |
| **SSH2** | 1.17.0 | SSH client library |
| **Socket.IO** | 4.8.3 | WebSocket server |
| **Crypto** | Native | Key pair generation |
| **Dotenv** | 17.2.3 | Environment management |

### Build & Tooling

| Tool | Version | Purpose |
|------|---------|---------|
| **esbuild** | 0.28.0 | Fast bundler |
| **tsx** | 4.21.0 | TypeScript execution |
| **Autoprefixer** | 10.4.21 | CSS prefixing |
| **TSConfig** | ES2022 | TypeScript configuration |

### Deployment

| Platform | Purpose |
|----------|---------|
| **CapRover** | Container orchestration |
| **Docker** | Containerization |
| **HTTP/HTTPS** | Network transport |

### Language Composition

```
TypeScript  ████████████████████████████ 79.6%
JavaScript  ████░░░░░░░░░░░░░░░░░░░░░░░░ 16.2%
CSS         █░░░░░░░░░░░░░░░░░░░░░░░░░░░  4.0%
Other       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0.2%
```

---

## 📁 Project Structure

```
c2-stenlystresser/
│
├── 📄 Configuration Files
│   ├── package.json              # Project metadata & dependencies
│   ├── tsconfig.json             # TypeScript compiler configuration
│   ├── vite.config.ts            # Vite bundler configuration
│   ├── components.json           # shadcn/ui component registry
│   ├── captain-definition        # CapRover deployment config
│   ├── .env.example              # Environment variables template
│   ├── .gitignore                # Git ignore rules
│   └── .dockerignore             # Docker ignore rules
│
├── 🌐 Frontend Application
│   ├── index.html                # HTML entry point
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Main application component (1270+ lines)
│   │   ├── lib/
│   │   │   ├── db.ts             # Database connection utilities
│   │   │   └── utils.ts          # Utility functions
│   │   └── components/           # Reusable React components
│   └── components/               # UI components directory
│
├── 🖥️ Backend Server
│   ├── server.ts                 # Express server (816 lines)
│   │   ├── REST API endpoints
│   │   ├── WebSocket handlers
│   │   ├── SSH connection management
│   │   └── Attack orchestration logic
│   └── src/
│       └── lib/
│           └── db.ts             # Database query interface
│
├── 🗄️ Database
│   └── database/                 # Database schemas & migrations
│
├── 📦 Deployment
│   ├── test_build.cjs            # Build test file (23KB)
│   └── attack.go                 # Go attack binary template
│
├── 📚 Documentation
│   └── README.md                 # This file
│
└── 🛠️ Build Output
    └── dist/                     # Production build directory
```

---

## ✨ Features

### 1. **Server Management System**

#### Server Registration
- Add servers with IP address, SSH port, and authentication method
- Support for both password and SSH key authentication
- Automatic server capability detection
- Real-time connectivity testing

#### Server Monitoring
- Continuous health checks and status tracking
- CPU core count detection
- RAM availability monitoring
- Network latency measurement
- Bandwidth capacity tracking
- Last-checked timestamp logging

#### Server States
- **ACTIVE** - Server is ready for operations
- **TESTING** - Connection and capability assessment in progress
- **ATTACKING** - Currently executing network operation
- **DEAD** - Connection failed or server unreachable

---

### 2. **SSH Key Management**

#### Master Key Generation
- RSA 2048-bit key pair generation
- Automatic SSH format public key creation
- Secure private key storage in database
- One master key per system limit

#### Key Operations
- Import external private keys
- Export public keys for provider registration
- Delete and revoke keys
- Automatic key selection for new server connections

#### Authentication Methods
- **Password Authentication**: Direct root password login
- **Internal Key**: Generated master key stored in system
- **External Key**: User-provided SSH private key

---

### 3. **Attack Orchestration**

#### Attack Configuration
- **Target IP & Port**: Specify destination endpoint
- **Attack Method**: UDP, TCP, MIX, SAMP, GOD MODE protocols
- **Duration**: Operation runtime in seconds (1-3600s)
- **Thread Count**: Parallel execution threads (1-10000)

#### Deployment Pipeline
1. Template substitution with attack parameters
2. SSH connection to target servers
3. Remote Go source code generation
4. Compilation on target system
5. Process execution with elevated priority
6. Real-time log streaming
7. Automatic cleanup after completion

#### Operation Lifecycle
```
Launch Request
    ↓
Parameter Validation & Sanitization
    ↓
Attack Log Creation (database)
    ↓
Active Server Discovery
    ↓
SSH Connection Establishment
    ↓
Parallel Deployment (all servers)
    ├─ Go Source Generation
    ├─ Binary Compilation
    ├─ Execution with nice -n -20
    └─ Log Streaming
    ↓
Monitoring Phase
    ├─ Real-time log tailing
    ├─ WebSocket event emission
    └─ Client UI updates
    ↓
Completion Phase
    ├─ Process termination
    ├─ File cleanup
    ├─ Statistics update
    └─ Notification broadcast
```

---

### 4. **Real-time Monitoring Dashboard**

#### Statistics Display
- Total attacks executed
- Total packets processed
- Total bandwidth consumed
- Total operation time
- Active nodes count
- Dead nodes count
- Estimated network capacity (Gbps)
- System efficiency metrics

#### Live Terminal Output
- Real-time server logs
- Color-coded message types
- Timestamp for each event
- 50-entry rolling buffer
- Auto-scroll to latest entries
- Message filtering and search

#### Server Status Visualization
- Color-coded status indicators
- Automatic status pulse animation
- Real-time updates via WebSocket
- Performance metric display
- Connection state tracking

---

### 5. **WebSocket Real-time Communication**

#### Event Types

**Server Events**
- `server_status_update` - Status change notifications
- `server_log` - Real-time server output streaming
- `server_capability_detected` - CPU/RAM/Latency discovery

**Attack Events**
- `attack_launched` - Operation started
- `attack_completed` - Operation finished
- `attack_stopped` - Manual termination
- `all_attacks_stopped` - Global shutdown

**System Events**
- `stats_update` - Metrics refresh
- `connection_established` - Socket connection confirmed
- `error` - Error state notification

---

## 🚀 Installation

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** 9.0 or higher
- **MySQL** 8.0 or later
- **Go** 1.21+ (for target servers)
- **OpenSSH** client capabilities
- **Git** (for cloning)

### Step 1: Clone Repository

```bash
git clone https://github.com/glarceny/c2-stenlystresser.git
cd c2-stenlystresser
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all dependencies from `package.json` including:
- Frontend: React, Vite, TypeScript, Tailwind
- Backend: Express, MySQL2, SSH2, Socket.IO
- DevTools: TypeScript compiler, ESBuild, TSX

### Step 3: Environment Configuration

```bash
cp .env.example .env
nano .env  # or your preferred editor
```

**Environment Variables (.env)**

```env
# Database Configuration (CapRover or Local)
DB_HOST=localhost              # MySQL hostname
DB_PORT=3306                   # MySQL port
DB_USER=root                   # MySQL username
DB_PASSWORD=your_password      # MySQL password (use strong password)
DB_NAME=botnet_db              # Database name

# Application Configuration
PORT=3000                      # Application listen port
NODE_ENV=production            # development or production
```

### Step 4: Database Setup

Create MySQL database and tables:

```sql
CREATE DATABASE botnet_db;
USE botnet_db;

-- Servers Table
CREATE TABLE servers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  host VARCHAR(255) NOT NULL,
  port INT DEFAULT 22,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255),
  key_content LONGTEXT,
  managed_key_id INT,
  auth_type ENUM('password', 'key') DEFAULT 'password',
  cpu_cores INT DEFAULT 0,
  ram_mb INT DEFAULT 0,
  bandwidth INT DEFAULT 0,
  latency FLOAT DEFAULT 0,
  status ENUM('active', 'dead', 'testing', 'attacking') DEFAULT 'active',
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Managed SSH Keys Table
CREATE TABLE managed_keys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  public_key LONGTEXT NOT NULL,
  private_key LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Attack Logs Table
CREATE TABLE attack_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  target_ip VARCHAR(255) NOT NULL,
  target_port INT NOT NULL,
  method VARCHAR(50) NOT NULL,
  duration INT NOT NULL,
  threads INT NOT NULL,
  status ENUM('running', 'completed', 'stopped', 'failed') DEFAULT 'running',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- System Statistics Table
CREATE TABLE stats (
  id INT PRIMARY KEY,
  total_attacks INT DEFAULT 0,
  total_packets BIGINT DEFAULT 0,
  total_bytes BIGINT DEFAULT 0,
  total_time INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Initialize stats
INSERT INTO stats (id, total_attacks, total_packets, total_bytes, total_time) 
VALUES (1, 0, 0, 0, 0);
```

### Step 5: Development Server

```bash
npm run dev
```

This starts:
- **Frontend**: Vite dev server with Hot Module Replacement (HMR)
- **Backend**: Express server on configured PORT
- **Watch Mode**: Automatic reload on file changes

Access at: `http://localhost:3000`

### Step 6: Production Build

```bash
npm run build
```

Generates:
- `dist/` - Optimized frontend bundle
- `dist/server.cjs` - Bundled backend server
- `dist/assets/` - Minified CSS/JS assets

### Step 7: Production Start

```bash
npm start
```

Or explicitly:

```bash
NODE_ENV=production node dist/server.cjs
```

---

## ⚙️ Configuration

### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",                    // Modern JavaScript target
    "module": "ESNext",                    // ES modules
    "jsx": "react-jsx",                    // React 17+ JSX transform
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",         // Node resolution
    "allowJs": true,                       // Mix TS and JS
    "paths": { "@/*": ["./*"] },          // Path alias
    "skipLibCheck": true,                  // Skip type checking dependencies
    "isolatedModules": true,               // Separate file compilation
    "noEmit": true                         // Don't emit JS (Vite handles it)
  }
}
```

### Vite Configuration (vite.config.ts)

```typescript
export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true'
    }
  };
});
```

### shadcn/ui Configuration (components.json)

```json
{
  "style": "base-nova",
  "tsx": true,
  "tailwind": {
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

---

## 📡 API Reference

### Health & Diagnostics

#### GET `/api/health`
Check database connectivity and system health

**Response:**
```json
{
  "status": "ok",
  "database": "connected"
}
```

---

#### GET `/api/stats`
Retrieve global statistics and metrics

**Response:**
```json
{
  "total_attacks": 42,
  "total_packets": 1000000,
  "total_bytes": 5000000000,
  "total_time": 3600,
  "servers": {
    "total": 5,
    "active": 4,
    "dead": 1,
    "total_bw": 1000
  }
}
```

---

### Server Management

#### GET `/api/servers`
List all registered servers

**Response:**
```json
[
  {
    "id": 1,
    "host": "192.168.1.100",
    "port": 22,
    "username": "root",
    "auth_type": "key",
    "cpu_cores": 4,
    "ram_mb": 8192,
    "bandwidth": 1000,
    "latency": 15.2,
    "status": "active",
    "last_checked": "2026-06-25T01:30:00Z",
    "managed_key_id": 1
  }
]
```

---

#### POST `/api/servers`
Register a new server

**Request Body:**
```json
{
  "host": "192.168.1.101",
  "port": 22,
  "username": "root",
  "password": "password123",
  "key_content": null,
  "auth_type": "password",
  "managed_key_id": null
}
```

**Response:**
```json
{
  "id": 2,
  "message": "Server added"
}
```

---

#### DELETE `/api/servers/{id}`
Remove a server from the system

**Response:**
```json
{
  "message": "Server deleted"
}
```

---

#### POST `/api/servers/test/{id}`
Test server connectivity and gather system information

**Process:**
1. Establishes SSH connection
2. Detects CPU core count
3. Measures available RAM
4. Checks network latency
5. Verifies Go compiler availability
6. Updates server record with capabilities

**Response:**
```json
{
  "message": "Test completed",
  "status": "active",
  "cpu": 8,
  "ram": 16384,
  "latency": 12.5
}
```

---

#### POST `/api/servers/stop/{id}`
Perform emergency server reset and cleanup

**Operations:**
- Kill all active processes
- Remove temporary files
- Reset server status to idle
- Clean attack artifacts

**Response:**
```json
{
  "message": "Server reset signal sent"
}
```

---

### SSH Key Management

#### GET `/api/keys`
List all managed SSH keys

**Response:**
```json
[
  {
    "id": 1,
    "name": "Master Key",
    "public_key": "ssh-rsa AAAAB3NzaC1yc2E... OrbitCloud-Key",
    "created_at": "2026-06-25T00:00:00Z"
  }
]
```

---

#### POST `/api/keys/generate`
Generate new RSA 2048-bit key pair

**Request Body:**
```json
{
  "name": "Master Key 2"
}
```

**Process:**
- Generates RSA 2048-bit key pair
- Formats to OpenSSH public key format
- Stores in database
- Returns public key for distribution

**Response:**
```json
{
  "id": 1,
  "public_key": "ssh-rsa AAAAB3NzaC1yc2E... OrbitCloud-Key"
}
```

---

#### DELETE `/api/keys/{id}`
Revoke and delete SSH key

**Response:**
```json
{
  "message": "Key deleted"
}
```

---

### Attack Operations

#### POST `/api/attacks`
Launch coordinated network operation

**Request Body:**
```json
{
  "target_ip": "192.168.1.50",
  "target_port": 80,
  "method": "UDP",
  "duration": 300,
  "threads": 2048
}
```

**Process:**
1. Validates and sanitizes input
2. Creates attack log record
3. Queries active servers
4. SSH into each server sequentially
5. Generates Go source with parameters
6. Compiles binary remotely
7. Executes with nice priority
8. Streams logs in real-time
9. Updates statistics
10. Broadcasts status to all clients

**Response:**
```json
{
  "id": 42,
  "message": "Attack launched",
  "servers_deployed": 5
}
```

---

#### GET `/api/attacks`
Retrieve attack history (last 50 records)

**Response:**
```json
[
  {
    "id": 42,
    "target_ip": "192.168.1.50",
    "target_port": 80,
    "method": "UDP",
    "duration": 300,
    "threads": 2048,
    "status": "completed",
    "created_at": "2026-06-25T01:30:00Z"
  }
]
```

---

#### POST `/api/attacks/stop/{id}`
Terminate running operation

**Operations:**
- Connect to all servers
- Kill attack processes
- Clean temporary files
- Reset server status
- Update statistics

**Response:**
```json
{
  "message": "Termination sequence started"
}
```

---

#### POST `/api/attacks/stop-all`
Global emergency shutdown

**Operations:**
- Stops all running attacks
- Terminates all processes across network
- Cleans all temporary resources
- Broadcasts completion status

**Response:**
```json
{
  "message": "Global shutdown request broadcasted"
}
```

---

## 🔌 WebSocket Events

### Client → Server Events

#### `connect`
Initial connection establishment
```javascript
socket.on('connect', () => {
  console.log('Connected to server');
});
```

---

### Server → Client Events

#### `server_status_update`
Server status or capabilities changed

**Payload:**
```json
{
  "id": 1,
  "status": "active",
  "cpu_cores": 8,
  "ram_mb": 16384,
  "latency": 12.5
}
```

---

#### `server_log`
Real-time server output and logs

**Payload:**
```json
{
  "id": 1,
  "message": "🔥 [SUCCESS] Attack deployment successful",
  "type": "success",
  "timestamp": "2026-06-25T01:30:00Z"
}
```

---

#### `stats_update`
Global statistics refresh

**Payload:**
```json
{
  "total_attacks": 43,
  "total_packets": 1100000,
  "total_bytes": 5500000000,
  "servers": {
    "total": 5,
    "active": 4,
    "dead": 1,
    "total_bw": 1000
  }
}
```

---

#### `attack_launched`
Operation started successfully

**Payload:**
```json
{
  "id": 42,
  "servers_deployed": 5
}
```

---

#### `attack_completed`
Operation finished

**Payload:**
```json
{
  "id": 42
}
```

---

#### `attack_stopped`
Operation manually terminated

**Payload:**
```json
{
  "id": 42
}
```

---

#### `all_attacks_stopped`
Global shutdown completed

**Payload:** (empty)

---

## 🐳 Deployment

### CapRover Deployment

The project includes `captain-definition` for seamless CapRover deployment:

```json
{
  "schemaVersion": 2,
  "dockerfilePath": "./Dockerfile"
}
```

**Deployment Steps:**

1. **Push to Repository**
   ```bash
   git push origin main
   ```

2. **Connect CapRover**
   - Access CapRover dashboard
   - Add new app from git
   - Select repository
   - Configure environment variables

3. **Environment Variables in CapRover**
   - Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
   - Set `DB_NAME`, `PORT`, `NODE_ENV`
   - Enable HTTPS

4. **Automatic Deployment**
   - Push triggers build
   - Docker containerization
   - Health checks
   - Load balancing

---

### Docker Deployment

Build Docker image:

```bash
docker build -t c2-stenlystresser:latest .
```

Run container:

```bash
docker run -d \
  -e DB_HOST=mysql \
  -e DB_USER=root \
  -e DB_PASSWORD=password \
  -e DB_NAME=botnet_db \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -p 3000:3000 \
  c2-stenlystresser:latest
```

---

### Manual Server Deployment

**Build:**
```bash
npm run build
```

**Start:**
```bash
NODE_ENV=production node dist/server.cjs
```

**Use PM2 for Process Management:**
```bash
npm install -g pm2

pm2 start dist/server.cjs --name "c2-stenlystresser"
pm2 save
pm2 startup
```

---

## 🗄️ Database Schema

### Servers Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT PK | Server identifier |
| `host` | VARCHAR(255) | IP address or hostname |
| `port` | INT | SSH port (default 22) |
| `username` | VARCHAR(255) | SSH username |
| `password` | VARCHAR(255) | SSH password (nullable) |
| `key_content` | LONGTEXT | Private SSH key (nullable) |
| `managed_key_id` | INT FK | Reference to managed_keys |
| `auth_type` | ENUM | 'password' or 'key' |
| `cpu_cores` | INT | Detected CPU count |
| `ram_mb` | INT | Available RAM in MB |
| `bandwidth` | INT | Network capacity in Mbps |
| `latency` | FLOAT | Network latency in ms |
| `status` | ENUM | 'active', 'dead', 'testing', 'attacking' |
| `last_checked` | TIMESTAMP | Last connectivity test |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last modification |

**Indexes:**
- `idx_status` - Status-based queries
- `idx_created_at` - Time-based sorting

---

### Managed Keys Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT PK | Key identifier |
| `name` | VARCHAR(255) | Key display name |
| `public_key` | LONGTEXT | SSH public key |
| `private_key` | LONGTEXT | SSH private key |
| `created_at` | TIMESTAMP | Creation time |
| `updated_at` | TIMESTAMP | Modification time |

---

### Attack Logs Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT PK | Log identifier |
| `target_ip` | VARCHAR(255) | Target IP address |
| `target_port` | INT | Target port |
| `method` | VARCHAR(50) | Attack method |
| `duration` | INT | Duration in seconds |
| `threads` | INT | Thread count |
| `status` | ENUM | 'running', 'completed', 'stopped', 'failed' |
| `created_at` | TIMESTAMP | Start time |
| `updated_at` | TIMESTAMP | Last update |

**Indexes:**
- `idx_status` - Status filtering
- `idx_created_at` - Chronological queries

---

### Stats Table

| Column | Type | Purpose |
|--------|------|---------|
| `id` | INT PK | Always 1 (singleton) |
| `total_attacks` | INT | All-time attack count |
| `total_packets` | BIGINT | Aggregated packet volume |
| `total_bytes` | BIGINT | Aggregated data volume |
| `total_time` | INT | Total operation seconds |
| `updated_at` | TIMESTAMP | Last update |

---

## 📄 File Documentation

### server.ts (816 lines)

**Main Backend Server**

**Structure:**
- Express app initialization
- HTTP server creation
- Socket.IO setup
- Database connection pooling
- Route definitions
- Event handlers

**Key Functions:**

```typescript
// Health Check
app.get("/api/health") // Database connectivity verification

// Server CRUD Operations
app.get("/api/servers")        // List all servers
app.post("/api/servers")       // Register new server
app.delete("/api/servers/:id") // Remove server
app.post("/api/servers/test/:id") // Test connectivity

// SSH Key Management
app.get("/api/keys")           // List keys
app.post("/api/keys/generate") // Generate RSA key pair
app.delete("/api/keys/:id")    // Delete key

// Attack Operations
app.post("/api/attacks")       // Launch attack
app.get("/api/attacks")        // Get history
app.post("/api/attacks/stop/:id") // Stop specific attack
app.post("/api/attacks/stop-all")  // Emergency shutdown
```

**Key Features:**
- SSH2 client connection pooling
- Parallel deployment orchestration
- Real-time log streaming via Socket.IO
- Input sanitization and validation
- Database transaction management
- Error handling and logging
- Process lifecycle management

---

### src/App.tsx (1270+ lines)

**Main Frontend Application**

**Component Hierarchy:**
```
App
├─ Navigation Bar (Status indicators)
├─ Statistics Grid (4 metric cards)
├─ Tab Container
│  ├─ Servers Tab
│  │  └─ ServerTable (Server listing & controls)
│  ├─ Attack Tab
│  │  ├─ Attack Configuration Panel
│  │  └─ Active Pool Info
│  ├─ Logs Tab
│  │  ├─ Operation History Table
│  │  └─ Attack Events Stream
│  └─ SSH Keys Tab
│     └─ ManagedKeysView
└─ Terminal Section (Real-time logs)
```

**State Management:**

```typescript
// Server Management
const [servers, setServers] // Array of Server objects
const [testingServerId, setTestingServerId] // Current test ID

// SSH Keys
const [managedKeys, setManagedKeys] // Array of ManagedKey objects
const [isGeneratingKey, setIsGeneratingKey] // Generation state

// Attack Configuration
const [attackConfig, setAttackConfig] // Attack parameters
const [isLaunchingAttack, setIsLaunchingAttack] // Launch state

// UI State
const [activeTab, setActiveTab] // Current tab
const [isAddModalOpen, setIsAddModalOpen] // Modal visibility
const [terminalLogs, setTerminalLogs] // Log entries

// System State
const [dbStatus, setDbStatus] // 'connected' | 'disconnected' | 'checking'
const [stats, setStats] // Global statistics
```

**Key Handlers:**

```typescript
// Server Operations
handleAddServer()       // Register new server
handleTestServer(id)    // Test connectivity
handleDeleteServer(id)  // Remove server
handleStopServerActivity(id) // Emergency cleanup

// Attack Operations
launchAttack()         // Launch coordinated attack
handleStopAttack(id)   // Terminate specific attack
handleStopAllAttacks() // Global emergency stop

// SSH Key Operations
handleGenerateKey()    // RSA key generation
handleDeleteKey(id)    // Remove key

// Utility Functions
fetchServers()    // Get server list
fetchStats()      // Refresh metrics
fetchLogs()       // Get attack history
checkHealth()     // Database connectivity
addTerminalLog()  // Log entry creation
```

**Socket.IO Event Listeners:**

```typescript
socket.on('server_status_update')  // Server state changed
socket.on('server_log')             // Real-time logs
socket.on('attack_launched')        // Operation started
socket.on('attack_completed')       // Operation finished
socket.on('attack_stopped')         // Manual termination
socket.on('stats_update')           // Metrics refreshed
socket.on('all_attacks_stopped')    // Global shutdown
```

---

### vite.config.ts (10 lines)

**Vite Build Configuration**

**Configuration:**
- React Fast Refresh plugin
- Tailwind CSS integration
- Path alias resolution (`@/*`)
- HMR (Hot Module Replacement) settings
- Module type: ES modules

---

### tsconfig.json (26 lines)

**TypeScript Configuration**

**Compiler Options:**
- Target: ES2022
- Module: ESNext
- JSX: react-jsx (React 17+)
- Strict: Enabled
- Module Resolution: bundler
- Path aliases configured

---

### package.json (50 lines)

**Project Metadata & Dependencies**

**Scripts:**
```json
{
  "dev": "tsx server.ts",              // Dev server with auto-reload
  "build": "vite build && esbuild ...",  // Prod build
  "start": "NODE_ENV=production node dist/server.cjs", // Prod start
  "clean": "rm -rf dist",              // Clean build
  "lint": "tsc --noEmit"               // Type check
}
```

**Key Dependencies:**
- Frontend: React 19, Vite 6, Tailwind 4, shadcn/ui
- Backend: Express 4, MySQL2 3, SSH2 1, Socket.IO 4
- Utilities: TypeScript, dotenv, esbuild

---

## 🔧 Development

### Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (both frontend + backend)
npm run dev

# 3. Make code changes (auto-reload enabled)
# - Modify src/App.tsx → frontend reloads
# - Modify server.ts → backend restarts

# 4. Type checking
npm run lint

# 5. Production build
npm run build

# 6. Test production build locally
npm start
```

### Debugging

**Frontend Debugging:**
- React DevTools browser extension
- Browser console for errors
- Network tab for API calls
- WebSocket tab for real-time events

**Backend Debugging:**
```bash
# Start with debugging enabled
node --inspect dist/server.cjs
# Open chrome://inspect in Chromium browser
```

**Database Debugging:**
```bash
# Access MySQL CLI
mysql -h localhost -u root -p botnet_db

# View server connections
SELECT * FROM servers;

# View attack history
SELECT * FROM attack_logs ORDER BY created_at DESC;

# Check statistics
SELECT * FROM stats;
```

---

## ⚡ Performance Considerations

### Frontend Optimization

| Optimization | Implementation |
|--------------|-----------------|
| **Code Splitting** | Vite automatic chunking |
| **Tree Shaking** | Unused code elimination |
| **Minification** | Vite production build |
| **Asset Compression** | Gzip/Brotli enabled |
| **Lazy Loading** | Tab-based component loading |
| **Virtual Scrolling** | 50-entry log buffer |
| **Debouncing** | Input field changes |
| **Memoization** | React.memo on components |

### Backend Optimization

| Optimization | Implementation |
|--------------|-----------------|
| **Connection Pooling** | MySQL2 pooling |
| **Parallel Deployment** | Async/await orchestration |
| **SSH Multiplexing** | Connection reuse |
| **Log Streaming** | Real-time WebSocket (vs polling) |
| **Database Indexes** | Status & timestamp indexes |
| **Query Optimization** | Prepared statements |
| **Memory Management** | Event listener cleanup |

### Scaling Strategies

1. **Horizontal Scaling**
   - Multiple API instances behind load balancer
   - Shared database layer
   - Redis for session management

2. **Vertical Scaling**
   - Increase server resources
   - Database optimization
   - Connection pool tuning

3. **Database Optimization**
   - Add more indexes for queries
   - Archive old attack logs
   - Partition tables by date

---

## 📞 Support & Resources

### Documentation Links
- [Express.js Docs](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [SSH2 npm Package](https://www.npmjs.com/package/ssh2)
- [Socket.IO Guide](https://socket.io/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Troubleshooting

**Database Connection Error:**
```bash
# Verify MySQL is running
mysql -u root -p -e "SELECT 1"

# Check credentials in .env
cat .env

# Test connection with mysql2
npm run lint
```

**SSH Connection Issues:**
- Verify target server SSH service is running
- Check firewall rules allow port 22
- Validate SSH credentials/keys
- Review server firewall settings

**WebSocket Connection Fails:**
- Ensure CORS is properly configured
- Check firewall for port 3000
- Verify Socket.IO client/server versions match
- Check browser console for errors

---

## 📊 Project Statistics

- **Total Lines of Code**: ~2,000
- **Backend (server.ts)**: 816 lines
- **Frontend (App.tsx)**: 1,270+ lines
- **Languages**: TypeScript 79.6%, JavaScript 16.2%, CSS 4%
- **Dependencies**: 30+ npm packages
- **API Endpoints**: 12+ RESTful routes
- **WebSocket Events**: 10+ event types
- **Database Tables**: 4 (servers, keys, attacks, stats)

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.0.0 | 2026-06-25 | Initial release via RepoFlow |

---

## 🙏 Acknowledgments

Built with modern web technologies:
- React & TypeScript for type-safe development
- Express & Node.js for backend
- MySQL for data persistence
- SSH2 for secure remote access
- Socket.IO for real-time communication
- Tailwind CSS for responsive design

---

**Repository**: [github.com/glarceny/c2-stenlystresser](https://github.com/glarceny/c2-stenlystresser)

**Last Updated**: June 25, 2026

---
