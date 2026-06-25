# C2 Stenlystresser

**⚠️ WARNING: This project appears to contain code for distributed denial-of-service (DDoS) attacks. This is illegal in most jurisdictions. Use only for authorized testing in controlled environments.**

---

## 📋 Overview

**C2 Stenlystresser** is a command and control (C2) infrastructure application built with modern web technologies. The project combines a React-based frontend with a Node.js/Express backend to manage distributed attack infrastructure across multiple servers via SSH.

**Repository:** `glarceny/c2-stenlystresser`  
**Primary Language:** TypeScript (79.6%)  
**Created:** via RepoFlow  
**Visibility:** Public

---

## 🛠️ Tech Stack

### Frontend
- **React 19.0.0** - UI library
- **Vite 6.2.0** - Build tool & dev server
- **TypeScript** - Type-safe development
- **Tailwind CSS 4.1.14** - Utility-first CSS framework
- **shadcn/ui** - UI component library
- **Socket.io Client** - Real-time communication

### Backend
- **Node.js** - Runtime environment
- **Express 4.21.2** - Web framework
- **TypeScript** - Type-safe backend code
- **MySQL2** - Database driver
- **SSH2** - SSH client for server management
- **Socket.io** - WebSocket communication

### Build & Deployment
- **Vite** - Frontend bundling
- **esbuild** - Fast TypeScript/JavaScript bundler
- **tsx** - TypeScript execution
- **CapRover** - Containerized deployment (via captain-definition)

### Language Composition
| Language | Percent |
|----------|---------|
| TypeScript | 79.6% |
| JavaScript | 16.2% |
| CSS | 4.0% |
| Other | 0.2% |

---

## 📁 Project Structure

```
c2-stenlystresser/
├── src/                          # Frontend React application
│   ├── main.tsx                  # React entry point
│   ├── lib/
│   │   └── db.ts                 # Database connection utilities
│   └── components/               # React components
├── components/                   # UI components directory
├── database/                     # Database schemas/migrations
├── lib/                          # Shared utilities
├── server.ts                     # Express backend server (816 lines)
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies & scripts
├── index.html                    # HTML entry point
├── attack.go                     # Go binary for attack execution
├── components.json               # UI component configuration
├── metadata.json                 # Project metadata
├── captain-definition            # CapRover deployment config
├── .env.example                  # Environment variables template
├── .dockerignore                 # Docker ignore rules
├── .gitignore                    # Git ignore rules
└── test_build.cjs                # Build test file
```

---

## 🚀 Features

### Core Functionality

#### 1. **Server Management**
- Add/remove servers via REST API
- Track server status (active, testing, dead, attacking)
- Monitor server specs (CPU cores, RAM, bandwidth, latency)
- Support password & SSH key authentication

#### 2. **SSH Key Management**
- Generate RSA 2048-bit SSH key pairs
- Store public/private keys securely
- Manage multiple key configurations
- Per-server key assignment

#### 3. **Attack Deployment**
- Launch coordinated attacks across multiple servers
- Support for multiple attack methods (UDP, TCP, etc.)
- Configurable attack parameters (duration, threads, target)
- Real-time attack logs via Socket.io

#### 4. **Real-time Monitoring**
- WebSocket-based live server logs
- Attack status tracking
- Performance statistics (packets, bytes, bandwidth)
- Server health monitoring

#### 5. **Attack Control**
- Stop individual attacks
- Stop all attacks globally
- Server reset & cleanup procedures
- Process cleanup via SSH commands

---

## 🔧 Installation & Setup

### Prerequisites
- **Node.js** 18+ (with npm/yarn)
- **MySQL 8.0+** (for database)
- **Go 1.21+** (for attack binary compilation on remote servers)
- **SSH access** to target servers (port 22)

### 1. Clone Repository
```bash
git clone https://github.com/glarceny/c2-stenlystresser.git
cd c2-stenlystresser
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

**Environment Variables:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=botnet_db

# Application
PORT=3000
NODE_ENV=production
```

### 4. Database Setup
Create MySQL database and tables:
```sql
CREATE DATABASE botnet_db;

USE botnet_db;

CREATE TABLE servers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  host VARCHAR(255),
  port INT DEFAULT 22,
  username VARCHAR(255),
  password VARCHAR(255),
  key_content LONGTEXT,
  managed_key_id INT,
  auth_type VARCHAR(50),
  cpu_cores INT,
  ram_mb INT,
  bandwidth INT,
  latency FLOAT,
  status VARCHAR(50) DEFAULT 'active',
  last_checked TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE managed_keys (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  public_key LONGTEXT,
  private_key LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attack_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  target_ip VARCHAR(255),
  target_port INT,
  method VARCHAR(50),
  duration INT,
  threads INT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stats (
  id INT PRIMARY KEY,
  total_attacks INT DEFAULT 0,
  total_packets INT DEFAULT 0,
  total_bytes INT DEFAULT 0,
  total_time INT DEFAULT 0
);
```

### 5. Build & Run

**Development:**
```bash
npm run dev
```

**Production Build:**
```bash
npm run build
npm start
```

**Clean Build:**
```bash
npm run clean
npm run build
```

**Type Check:**
```bash
npm run lint
```

---

## 📡 API Endpoints

### Health & Statistics

#### `GET /api/health`
Check database connectivity
```json
{ "status": "ok", "database": "connected" }
```

#### `GET /api/stats`
Get global statistics
```json
{
  "total_attacks": 42,
  "total_packets": 1000000,
  "total_bytes": 5000000000,
  "total_time": 3600,
  "servers": { "total": 5, "active": 4, "dead": 1, "total_bw": 1000 }
}
```

### Server Management

#### `GET /api/servers`
List all servers

#### `POST /api/servers`
Add new server
```json
{
  "host": "1.2.3.4",
  "port": 22,
  "username": "root",
  "password": "pass",
  "auth_type": "password"
}
```

#### `DELETE /api/servers/:id`
Delete server

#### `POST /api/servers/test/:id`
Test server connectivity & gather specs

#### `POST /api/servers/stop/:id`
Reset server (kill processes, cleanup files)

### SSH Key Management

#### `GET /api/keys`
List all managed SSH keys

#### `POST /api/keys/generate`
Generate new RSA key pair
```json
{
  "name": "Master Key",
  "public_key": "ssh-rsa AAAAB3... OrbitCloud-Key"
}
```

#### `DELETE /api/keys/:id`
Delete SSH key

### Attack Operations

#### `POST /api/attacks`
Launch attack
```json
{
  "target_ip": "192.168.1.1",
  "target_port": 80,
  "method": "UDP",
  "duration": 60,
  "threads": 1000
}
```

#### `GET /api/attacks`
Get attack history (last 50)

#### `POST /api/attacks/stop/:id`
Stop specific attack

#### `POST /api/attacks/stop-all`
Stop all active attacks

---

## 🔌 WebSocket Events

### Server Events (Emitted)

- `server_log` - Real-time server output
- `server_status_update` - Server status change
- `stats_update` - Statistics update
- `attack_launched` - Attack started
- `attack_completed` - Attack finished
- `attack_stopped` - Attack terminated
- `all_attacks_stopped` - Global stop complete

---

## 🔐 Security Notes

⚠️ **IMPORTANT DISCLAIMERS:**

1. **Illegal Activity**: DDoS attacks are illegal in most jurisdictions without explicit authorization
2. **No Encryption**: Authentication credentials are not encrypted in transit (use HTTPS/TLS in production)
3. **SSH Key Storage**: Private keys stored in plaintext database - high security risk
4. **Input Sanitization**: Basic IP/port sanitization present but incomplete
5. **No Rate Limiting**: No API rate limiting implemented
6. **Database**: No SQL injection protection beyond basic input validation

**Recommendations for Production:**
- Use HTTPS/TLS for all communications
- Implement proper authentication & authorization
- Encrypt sensitive data (keys, passwords)
- Add SQL parameterized queries (partially done)
- Implement rate limiting
- Use secrets management (HashiCorp Vault, AWS Secrets Manager)
- Enable firewall rules
- Implement comprehensive logging & auditing

---

## 📊 Attack Flow

1. **Deployment Phase**
   - Read `attack.go` template
   - Substitute parameters (duration, threads, method, target IP/port)
   - SSH into each active server
   - Write parameterized script to `/tmp/stenly_${attackId}.go`
   - Compile with Go compiler
   - Execute with elevated priority (`nice -n -20`)

2. **Execution Phase**
   - Monitor logs via SSH `tail -f`
   - Stream output to UI via Socket.io
   - Update server status to "attacking"
   - Emit real-time log messages

3. **Completion Phase**
   - Wait for attack duration timeout
   - Kill processes (`pkill -9 -f stenly_${attackId}`)
   - Cleanup temporary files (`rm -f /tmp/stenly_${attackId}*`)
   - Reset server status to "active"
   - Update global statistics

---

## 🧪 Testing

### Build Test
```bash
node test_build.cjs
```

### Type Checking
```bash
npm run lint
```

---

## 📦 Deployment

### Docker (CapRover)
The project includes `captain-definition` for CapRover deployment:
```json
{
  "schemaVersion": 2,
  "dockerfilePath": "./Dockerfile",
  "imageName": "c2-stenlystresser"
}
```

### Local Production
```bash
npm run build
NODE_ENV=production npm start
```

---

## 🐛 Known Issues & Limitations

1. **Single Master Key Limit**: Only 1 managed SSH key allowed
2. **No Pagination**: Attack logs limited to last 50 entries
3. **No Encryption**: SSH keys stored in plaintext
4. **No Access Control**: All endpoints publicly accessible
5. **Process Cleanup**: Relies on `pkill` availability on remote servers
6. **Go Dependency**: Remote servers must have Go installed or auto-install 60MB runtime
7. **Error Handling**: Limited error context in some API responses

---

## 📄 Configuration Files

### vite.config.ts
- React Fast Refresh for HMR
- Tailwind CSS integration
- Path alias `@/*` pointing to project root
- Environment variable injection for `GEMINI_API_KEY`
- HMR can be disabled via `DISABLE_HMR` env var

### tsconfig.json
- Target: ES2022
- Module: ESNext
- Strict mode enabled
- Path aliases configured
- JSX: react-jsx

### package.json
- **Scripts:**
  - `dev` - Start dev server with tsx
  - `build` - Vite build + esbuild for Node binary
  - `start` - Run production build
  - `clean` - Remove dist directory
  - `lint` - Type check with TypeScript

---

## 📝 License

Not specified. Appears to be created via RepoFlow.

---

## 🚨 Legal & Ethical Notice

**This project facilitates DDoS attacks and similar malicious activities.** 

- **Unauthorized use is illegal** and subject to criminal prosecution
- **Violates Terms of Service** of hosting providers and ISPs
- **Causes harm** to infrastructure and services

Use **only in controlled, authorized environments** for legitimate security research and penetration testing with proper documentation and legal authorization.

---

## 📞 Support & Questions

For inquiries, refer to the repository issues page on GitHub.

---

**Last Updated:** June 25, 2026  
**Repository:** https://github.com/glarceny/c2-stenlystresser
