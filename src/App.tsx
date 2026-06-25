import { useState, useEffect } from "react";
import { 
  Shield, Server as ServerIcon, Zap, Activity, Plus, Globe, 
  Lock, Key, Cpu, Database, Trash2, RefreshCw, BarChart3, 
  History, ChevronRight, AlertCircle, Terminal, Info, Copy
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Toaster, toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const socket = io();

interface Server {
  id: number;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'key';
  cpu_cores: number;
  ram_mb: number;
  bandwidth: number;
  latency: number;
  status: 'active' | 'dead' | 'testing' | 'attacking';
  last_checked: string;
  managed_key_id?: number | null;
}

interface ManagedKey {
  id: number;
  name: string;
  public_key: string;
  created_at: string;
}

interface Stats {
  total_attacks: number;
  total_packets: number;
  total_bytes: number;
  total_time: number;
  servers: {
    total: number;
    active: number;
    dead: number;
    total_bw: number;
  };
}

export default function App() {
  const [servers, setServers] = useState<Server[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [managedKeys, setManagedKeys] = useState<ManagedKey[]>([]);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [testingServerId, setTestingServerId] = useState<number | null>(null);
  const [isLaunchingAttack, setIsLaunchingAttack] = useState(false);
  const [activeTab, setActiveTab] = useState("servers");
  const [terminalLogs, setTerminalLogs] = useState<{id: string, time: string, msg: string, type?: 'info' | 'error' | 'success'}[]>([]);

  useEffect(() => {
    const el = document.getElementById('terminal-end');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  const addTerminalLog = (msg: string, type: 'info' | 'error' | 'success' = 'info') => {
    setTerminalLogs(prev => [...prev.slice(-49), {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString(),
      msg,
      type
    }]);
  };

  useEffect(() => {
    if (isAddModalOpen) {
      fetchManagedKeys();
    }
  }, [isAddModalOpen]);

  const [attackConfig, setAttackConfig] = useState({
    target_ip: '',
    target_port: 7777,
    method: 'UDP',
    duration: 60,
    threads: 64
  });
  const [newServer, setNewServer] = useState({
    host: '',
    port: 22,
    username: 'root',
    password: '',
    key_content: '',
    managed_key_id: null as number | null,
    auth_type: 'password' as 'password' | 'key'
  });

  const fetchServers = async () => {
    try {
      const res = await fetch('/api/servers');
      const data = await res.json();
      if (Array.isArray(data)) {
        setServers(data);
      } else {
        console.error("Servers data is not an array:", data);
        setServers([]);
      }
    } catch (error) {
      toast.error("Failed to fetch servers");
      setServers([]);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.details || "Server error");
      }
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      toast.error(`Gagal mengambil statistik: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/attacks');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch logs");
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setDbStatus(data.database === 'connected' ? 'connected' : 'disconnected');
    } catch (error) {
      setDbStatus('disconnected');
    }
  };

  useEffect(() => {
    checkHealth();
    fetchServers();
    fetchStats();
    fetchLogs();

    socket.on("server_status_update", (update) => {
      setServers(prev => prev.map(s => s.id === update.id ? { ...s, ...update } : s));
      fetchStats();
    });

    socket.on("server_log", (data) => {
      const type = data.message.includes('❌') ? 'error' : data.message.includes('🔥') || data.message.includes('✅') ? 'success' : 'info';
      addTerminalLog(data.message, type);
      toast(data.message, { 
        id: `log-${data.id}`,
        icon: type === 'error' ? '❌' : type === 'success' ? '✅' : '⚙️',
        duration: 3000
      });
    });

    socket.on("attack_launched", (data) => {
      toast.success(`Attack launched on ${data.servers_deployed} servers!`, { icon: '🚀' });
      fetchLogs();
      fetchStats();
      fetchServers();
    });

    socket.on("attack_completed", (data) => {
      toast.success(`Operation ${data.id} completed!`, { icon: '🏁' });
      fetchLogs();
      fetchStats();
      fetchServers();
    });

    socket.on("attack_stopped", (data) => {
      toast(`Attack #${data.id} stopped manually.`, { icon: '🛑' });
      addTerminalLog(`🛑 [SYSTEM] Serangan #${data.id} telah dihentikan oleh user.`, 'info');
      fetchLogs();
      fetchStats();
      fetchServers();
    });

    socket.on("all_attacks_stopped", () => {
      toast.success("All attacks stopped and cleaned up.", { icon: '🛑' });
      addTerminalLog(`🛑 [SYSTEM] GLOBAL SHUTDOWN: Semua aktivitas dihentikan.`, 'success');
      fetchLogs();
      fetchStats();
      fetchServers();
    });

    socket.on("stats_update", (newStats) => {
      setStats(newStats);
    });

    fetchManagedKeys();

    return () => {
      socket.off("server_status_update");
      socket.off("attack_completed");
    };
  }, []);

  const fetchManagedKeys = async () => {
    try {
      const res = await fetch('/api/keys');
      const data = await res.json();
      setManagedKeys(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch managed keys");
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Gunakan nama untuk kunci ini");
      return;
    }
    setIsGeneratingKey(true);
    try {
      const res = await fetch('/api/keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("SSH Key berhasil dibuat!");
        setNewKeyName("");
        fetchManagedKeys();
      } else {
        toast.error("Gagal membuat kunci");
      }
    } catch (error) {
      toast.error("Masalah jaringan");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleDeleteKey = async (id: number) => {
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Kunci dihapus");
        fetchManagedKeys();
      }
    } catch (error) {
      toast.error("Gagal menghapus kunci");
    }
  };

  const handleAddServer = async () => {
    if (isAddingServer) return;
    if (dbStatus !== 'connected') {
      toast.error("Database belum terkoneksi! Harap set environment variables di CapRover.");
      return;
    }

    if (!newServer.host) {
      toast.error("Host wajib diisi");
      return;
    }
    
    setIsAddingServer(true);
    const loadingToast = toast.loading("Sedang menghubungkan ke server...");
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServer)
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Server berhasil ditambahkan!", { id: loadingToast });
        setIsAddModalOpen(false);
        fetchServers();
        
        // Auto trigger test
        if (data.id) {
          handleTestServer(data.id);
        }

        setNewServer({
          host: '',
          port: 22,
          username: 'root',
          password: '',
          key_content: '',
          managed_key_id: managedKeys.length > 0 ? managedKeys[0].id : null,
          auth_type: managedKeys.length > 0 ? 'key' : 'password'
        });
      } else {
        toast.error("Gagal menambahkan server", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan", { id: loadingToast });
    } finally {
      setIsAddingServer(false);
    }
  };

  const handleDeleteServer = async (id: number) => {
    try {
      const res = await fetch(`/api/servers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Server deleted");
        fetchServers();
      }
    } catch (error) {
      toast.error("Failed to delete server");
    }
  };

  const handleTestServer = async (id: number) => {
    if (testingServerId === id) return;
    setTestingServerId(id);
    try {
      toast("Testing server connection...", { icon: '🔄' });
      const res = await fetch(`/api/servers/test/${id}`, { method: 'POST' });
      if (!res.ok) throw new Error();
    } catch (error) {
      toast.error("Server test failed");
    } finally {
      setTestingServerId(null);
    }
  };

  const handleStopAttack = async (id: number) => {
    const loadingToast = toast.loading(`Stopping attack #${id}...`);
    addTerminalLog(`🛑 [REQ] Mengirim sinyal stop untuk serangan #${id}...`, 'info');
    try {
      const res = await fetch(`/api/attacks/stop/${id}`, { method: 'POST' });
      if (res.ok) {
        toast.success("Termination signal sent!", { id: loadingToast });
        setTimeout(() => {
          fetchLogs();
          fetchServers();
          fetchStats();
        }, 1500);
      } else {
        toast.error("Failed to stop attack", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Network error stopping attack", { id: loadingToast });
    }
  };

  const handleStopServerActivity = async (id: number) => {
    const loadingToast = toast.loading("Clearing all activity on server...");
    addTerminalLog(`🛑 [REQ] Resetting VPS #${id} activity...`, 'info');
    try {
      const res = await fetch(`/api/servers/stop/${id}`, { method: 'POST' });
      if (res.ok) {
        toast.success("Cleanup signal sent!", { id: loadingToast });
        setTimeout(() => fetchServers(), 1500);
      } else {
        toast.error("Failed to clear node activity", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Network error clearing activity", { id: loadingToast });
    }
  };

  const handleStopAllAttacks = async () => {
    const loadingToast = toast.loading("SHUTTING DOWN ALL SESSIONS...");
    try {
      const res = await fetch('/api/attacks/stop-all', { method: 'POST' });
      if (res.ok) {
        toast.success("GLOBAL SHUTDOWN COMPLETE", { id: loadingToast });
        fetchLogs();
        fetchServers();
      } else {
        toast.error("Global stop failed", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Network error in global stop", { id: loadingToast });
    }
  };

  const launchAttack = async () => {
    if (!attackConfig.target_ip) {
      toast.error("Target IP is required");
      return;
    }
    
    addTerminalLog(`🚀 [REQ] Meluncurkan serangan ${attackConfig.method} ke ${attackConfig.target_ip}:${attackConfig.target_port}...`, 'info');
    setIsLaunchingAttack(true);
    try {
      const res = await fetch('/api/attacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attackConfig)
      });
      if (res.ok) {
        toast.success("Attack operation launched");
        fetchLogs();
        fetchStats();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to launch attack");
      }
    } catch (error) {
      toast.error("Network error launching attack");
    } finally {
      setIsLaunchingAttack(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#18181B] font-sans selection:bg-black selection:text-white">
      <nav className="glass-nav">
        <div className="max-w-7xl mx-auto px-3 h-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-sm font-bold tracking-tight uppercase">Stenly Stresser <span className="text-[10px] font-normal text-muted-foreground ml-1">v8.0</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase text-muted-foreground font-medium leading-none">Database</span>
                <span className={cn(
                  "text-[10px] font-bold flex items-center gap-1",
                  dbStatus === 'connected' ? "text-green-600" : dbStatus === 'checking' ? "text-amber-500" : "text-red-600"
                )}>
                  {dbStatus === 'checking' ? (
                    <RefreshCw className="w-2 h-2 animate-spin" />
                  ) : (
                    <span className="status-pulse">
                      <span className={cn("status-pulse-inner", dbStatus === 'connected' ? "bg-green-400" : "bg-red-400")}></span>
                      <span className={cn("status-pulse-dot", dbStatus === 'connected' ? "bg-green-500" : "bg-red-500")}></span>
                    </span>
                  )}
                  {dbStatus.toUpperCase()}
                </span>
              </div>
              <div className="w-px h-6 bg-border/50 mx-1" />
              <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase text-muted-foreground font-medium leading-none">System Status</span>
                <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                  <span className="status-pulse">
                    <span className="status-pulse-inner bg-green-400"></span>
                    <span className="status-pulse-dot bg-green-500"></span>
                  </span>
                  OPERATIONAL
                </span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-3 space-y-3">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard 
            title="Total Attacks" 
            value={stats?.total_attacks || 0} 
            icon={<Zap className="w-3 h-3" />} 
            color="text-amber-500"
            subValue="+12% from last session"
          />
          <StatCard 
            title="Active Nodes" 
            value={stats?.servers?.active || 0} 
            icon={<ServerIcon className="w-3 h-3" />} 
            color="text-emerald-500"
            subValue={`${stats?.servers?.total || 0} total registered`}
          />
          <StatCard 
            title="Network Power" 
            value={`${((stats?.servers?.total_bw || 0) / 1000).toFixed(1)}`} 
            unit="Gbps"
            icon={<Activity className="w-3 h-3" />} 
            color="text-blue-500"
            subValue="Estimated throughput"
          />
          <StatCard 
            title="Uptime" 
            value="99.9" 
            unit="%"
            icon={<Shield className="w-3 h-3" />} 
            color="text-purple-500"
            subValue="System availability"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="servers" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <TabsList className="bg-muted/50 p-1 rounded-xl border border-border/50">
              <TabsTrigger value="servers" className="rounded-lg px-4 py-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Database className="w-3.5 h-3.5 mr-1.5" />
                Servers
              </TabsTrigger>
              <TabsTrigger value="attack" className="rounded-lg px-4 py-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Attack
              </TabsTrigger>
              <TabsTrigger value="logs" className="rounded-lg px-4 py-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Activity className="w-3.5 h-3.5 mr-1.5" />
                Logs
              </TabsTrigger>
              <TabsTrigger value="keys" className="rounded-lg px-4 py-1.5 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Key className="w-3.5 h-3.5 mr-1.5" />
                SSH Keys
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger render={<Button size="sm" className="rounded-xl px-4 shadow-md shadow-primary/5 transition-all">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add VPS
                </Button>} />
                <DialogContent className="sm:max-w-[400px] rounded-2xl border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">Add New Server</DialogTitle>
                  <DialogDescription>Connect a new VPS to your botnet controller.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="host" className="text-right">Host</Label>
                    <Input id="host" placeholder="1.2.3.4" className="col-span-3 rounded-xl" value={newServer.host} onChange={e => setNewServer({...newServer, host: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="port" className="text-right">Port</Label>
                    <Input id="port" type="number" placeholder="22" className="col-span-3 rounded-xl" value={newServer.port} onChange={e => setNewServer({...newServer, port: parseInt(e.target.value)})} />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="user" className="text-right">User</Label>
                    <Input id="user" placeholder="root" className="col-span-3 rounded-xl" value={newServer.username} onChange={e => setNewServer({...newServer, username: e.target.value})} />
                  </div>
                  
                  <div className="space-y-4 p-4 bg-muted/20 rounded-2xl border border-border/50">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Authentication Method</Label>
                    <div className="grid grid-cols-3 gap-2">
                       <Button 
                        type="button"
                        variant={newServer.auth_type === 'password' ? 'default' : 'outline'}
                        className="h-16 rounded-xl flex flex-col gap-1 items-center justify-center p-0"
                        onClick={() => setNewServer({...newServer, auth_type: 'password', managed_key_id: null})}
                       >
                         <Lock className="w-4 h-4" />
                         <span className="text-[10px] font-bold">PASSWORD</span>
                       </Button>
                       <Button 
                        type="button"
                        variant={newServer.auth_type === 'key' && newServer.managed_key_id !== null ? 'default' : 'outline'}
                        className="h-16 rounded-xl flex flex-col gap-1 items-center justify-center p-0"
                        onClick={() => {
                          if (managedKeys.length > 0) {
                            setNewServer({...newServer, auth_type: 'key', managed_key_id: managedKeys[0].id, key_content: ''});
                          } else {
                            toast.error("Generate Master Key terlebih dahulu!");
                          }
                        }}
                       >
                         <Shield className="w-4 h-4" />
                         <span className="text-[10px] font-bold">INTERNAL KEY</span>
                       </Button>
                       <Button 
                        type="button"
                        variant={newServer.auth_type === 'key' && newServer.managed_key_id === null ? 'default' : 'outline'}
                        className="h-16 rounded-xl flex flex-col gap-1 items-center justify-center p-0"
                        onClick={() => setNewServer({...newServer, auth_type: 'key', managed_key_id: null})}
                       >
                         <Key className="w-4 h-4" />
                         <span className="text-[10px] font-bold">PRIVATE KEY</span>
                       </Button>
                    </div>

                    <div className="pt-2">
                      {newServer.auth_type === 'password' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Label htmlFor="pass" className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Root Password</Label>
                          <Input id="pass" type="password" placeholder="••••••••" className="rounded-xl h-9 bg-white" value={newServer.password} onChange={e => setNewServer({...newServer, password: e.target.value})} />
                        </div>
                      )}

                      {newServer.auth_type === 'key' && newServer.managed_key_id !== null && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Select Master Key</Label>
                          <select 
                            className="w-full flex h-9 rounded-xl border border-input bg-emerald-50/30 px-3 py-1 text-xs shadow-sm focus:ring-1 focus:ring-black outline-none appearance-none"
                            value={newServer.managed_key_id || ""}
                            onChange={e => setNewServer({...newServer, managed_key_id: e.target.value ? parseInt(e.target.value) : null, key_content: ''})}
                          >
                            {managedKeys.map(k => (
                              <option key={k.id} value={k.id}>Active: {k.name}</option>
                            ))}
                          </select>
                          <p className="text-[9px] text-emerald-600 font-medium ml-1">Kunci OrbitCloud ini akan digunakan otomatis.</p>
                        </div>
                      )}

                      {newServer.auth_type === 'key' && newServer.managed_key_id === null && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Label htmlFor="key" className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Private Key Content</Label>
                          <textarea 
                            id="key" 
                            placeholder="-----BEGIN RSA PRIVATE KEY-----" 
                            className="w-full rounded-xl min-h-[100px] p-3 text-[10px] font-mono bg-white border border-input focus:ring-2 focus:ring-black outline-none"
                            value={newServer.key_content}
                            onChange={e => setNewServer({...newServer, key_content: e.target.value, managed_key_id: null})}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleAddServer} 
                    disabled={isAddingServer}
                    className="w-full rounded-2xl py-6 text-lg font-medium relative overflow-hidden"
                  >
                    {isAddingServer ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Initializing...
                      </div>
                    ) : (
                      "Initialize Server"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

          <TabsContent value="servers" className="mt-0">
            <div className="premium-card overflow-hidden">
              <Tabs defaultValue="all" className="w-full">
                <div className="px-3 py-2 border-b border-border/50 bg-muted/10 flex items-center justify-between">
                  <TabsList className="bg-transparent h-6 p-0 gap-4">
                    <TabsTrigger value="all" className="h-auto p-0 text-[10px] uppercase font-bold data-[state=active]:text-black text-muted-foreground bg-transparent shadow-none">All Pool</TabsTrigger>
                    <TabsTrigger value="password" className="h-auto p-0 text-[10px] uppercase font-bold data-[state=active]:text-black text-muted-foreground bg-transparent shadow-none">Password</TabsTrigger>
                    <TabsTrigger value="key" className="h-auto p-0 text-[10px] uppercase font-bold data-[state=active]:text-black text-muted-foreground bg-transparent shadow-none">SSH Key</TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-[8px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50"
                      onClick={handleStopAllAttacks}
                    >
                      <Shield className="w-2.5 h-2.5 mr-1" />
                      Global Shutdown
                    </Button>
                    <div className="text-[9px] text-muted-foreground font-medium">
                      {servers.length} Nodes Connected
                    </div>
                  </div>
                </div>
                
                <TabsContent value="all" className="mt-0">
                  <ServerTable servers={servers} onTest={handleTestServer} onDelete={handleDeleteServer} onStopActivity={handleStopServerActivity} testingId={testingServerId} />
                </TabsContent>
                <TabsContent value="password" className="mt-0">
                  <ServerTable servers={servers.filter(s => s.auth_type === 'password')} onTest={handleTestServer} onDelete={handleDeleteServer} onStopActivity={handleStopServerActivity} testingId={testingServerId} />
                </TabsContent>
                <TabsContent value="key" className="mt-0">
                  <ServerTable servers={servers.filter(s => s.auth_type === 'key')} onTest={handleTestServer} onDelete={handleDeleteServer} onStopActivity={handleStopServerActivity} testingId={testingServerId} />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="attack" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 space-y-3">
                <div className="premium-card p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 bg-black rounded flex items-center justify-center">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <h3 className="text-[11px] uppercase font-bold tracking-wider">Attack Configuration</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Target Endpoint</Label>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-4 flex gap-2">
                            <Input 
                              placeholder="IP Address" 
                              className="w-full h-8 text-[11px] bg-muted/30 border-none"
                              value={attackConfig.target_ip}
                              onChange={e => setAttackConfig({...attackConfig, target_ip: e.target.value})}
                            />
                            <Input 
                              placeholder="Port" 
                              className="w-20 h-8 text-[11px] bg-muted/30 border-none"
                              value={attackConfig.target_port.toString()}
                              onChange={e => setAttackConfig({...attackConfig, target_port: parseInt(e.target.value) || 0})}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Attack Method</Label>
                        <select 
                          className="w-full h-8 px-2 text-[11px] bg-muted/30 border-none rounded-md outline-none focus:ring-1 focus:ring-black font-bold"
                          value={attackConfig.method}
                          onChange={e => {
                            const newMethod = e.target.value;
                            setAttackConfig({
                              ...attackConfig, 
                              method: newMethod
                            })
                          }}
                        >
                          <optgroup label="LAYER 4 METHODS">
                            <option value="GOD">GOD MODE (Universal Flood)</option>
                            <option value="SAMP">SAMP Protocol (Direct Query)</option>
                            <option value="UDP">UDP Flood (Raw Bandwidth)</option>
                            <option value="MIX">MIX Mode (Hybrid Attack)</option>
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] uppercase font-bold text-muted-foreground">Duration (Sec)</Label>
                          <Input 
                            type="number" 
                            className="h-8 text-[11px] bg-muted/30 border-none"
                            value={attackConfig.duration}
                            onChange={e => setAttackConfig({...attackConfig, duration: parseInt(e.target.value) || 0})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] uppercase font-bold text-muted-foreground">Threads</Label>
                          <Input 
                            type="number" 
                            className="h-8 text-[11px] bg-muted/30 border-none"
                            value={attackConfig.threads}
                            onChange={e => setAttackConfig({...attackConfig, threads: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-muted/20 rounded-md border border-border/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground">Resource Usage</span>
                          <span className="text-[10px] font-bold">OPTIMIZED</span>
                        </div>
                        <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                          <div className="bg-black h-full w-[65%]"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={launchAttack} 
                    disabled={isLaunchingAttack}
                    className="w-full h-9 bg-black hover:bg-black/90 text-white text-[11px] uppercase font-bold mt-6 shadow-lg shadow-black/10"
                  >
                    {isLaunchingAttack ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Launching...
                      </div>
                    ) : (
                      "Launch Operation"
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="premium-card p-4">
                  <h3 className="text-[11px] uppercase font-bold tracking-wider mb-4">Active Pool</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[10px] font-medium">Ready Nodes</span>
                      </div>
                      <span className="text-[10px] font-bold">{stats?.servers?.active || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-[10px] font-medium">Est. Bandwidth</span>
                      </div>
                      <span className="text-[10px] font-bold">{((stats?.servers?.total_bw || 0) / 1000).toFixed(1)} Gbps</span>
                    </div>
                    <div className="pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium">Efficiency</span>
                        <span className="text-[10px] font-bold">94%</span>
                      </div>
                      <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[94%]"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="premium-card p-4 bg-black text-white border-none">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-3 h-3 text-white/60" />
                    <span className="text-[9px] uppercase font-bold tracking-widest text-white/60">Security Notice</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-white/80">
                    All operations are encrypted and proxied. Ensure target authorization before launching any high-bandwidth tests.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-3">
                <div className="premium-card overflow-hidden">
                  <div className="px-3 py-2 border-b border-border/50 bg-muted/10 flex items-center justify-between">
                    <h3 className="text-[10px] uppercase font-bold">Operation History</h3>
                    <div className="text-[9px] text-muted-foreground font-medium">Last 50 Records</div>
                  </div>
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="h-7 text-[9px] uppercase font-bold">Target</TableHead>
                        <TableHead className="h-7 text-[9px] uppercase font-bold">Method</TableHead>
                        <TableHead className="h-7 text-[9px] uppercase font-bold">Duration</TableHead>
                        <TableHead className="h-7 text-[9px] uppercase font-bold">Status</TableHead>
                        <TableHead className="h-7 text-[9px] uppercase font-bold">Time</TableHead>
                        <TableHead className="h-7 text-[9px] uppercase font-bold text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-20 text-center text-[10px] text-muted-foreground">No logs found</TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id} className="hover:bg-muted/30 border-border/50">
                            <TableCell className="py-1.5 text-[10px] font-medium max-w-[200px] truncate">
                              {log.target_ip}:{log.target_port}
                            </TableCell>
                            <TableCell className="py-1.5">
                              <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-bold border-black/10 bg-black/5">{log.method}</Badge>
                            </TableCell>
                            <TableCell className="py-1.5 text-[10px]">{log.duration}s</TableCell>
                            <TableCell className="py-1.5">
                              <Badge className={cn(
                                "text-[8px] h-4 px-1.5 uppercase font-bold",
                                log.status === 'completed' ? "bg-emerald-500" : log.status === 'running' ? "bg-blue-500" : log.status === 'stopped' ? "bg-amber-500" : "bg-red-500"
                              )}>
                                {log.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1.5 text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                            <TableCell className="py-1.5 text-right">
                              {log.status === 'running' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-red-500 hover:bg-red-50"
                                  onClick={() => handleStopAttack(log.id)}
                                >
                                  <Shield className="w-3 h-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="lg:col-span-1">
                 <div className="premium-card h-full flex flex-col">
                    <div className="px-3 py-2 border-b border-border/50 bg-muted/10 flex items-center justify-between">
                      <h3 className="text-[10px] uppercase font-bold">Attack Events</h3>
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto max-h-[400px] space-y-2 font-mono scrollbar-hide">
                       {terminalLogs.filter(l => 
                         l.msg.includes('[ATTACK]') || 
                         l.msg.includes('[REQ]') || 
                         l.msg.includes('[SHUTDOWN]') ||
                         l.msg.includes('[SYSTEM]') ||
                         l.msg.includes('[KILL]') ||
                         l.msg.includes('[PURGE]') ||
                         l.msg.includes('[WIPE]') ||
                         l.msg.includes('[DONE]') ||
                         l.msg.includes('[CLEAN]') ||
                         l.msg.includes('[CONN]') ||
                         l.msg.includes('[INFO]') ||
                         l.msg.includes('[READY]') ||
                         l.msg.includes('[RESET]') ||
                         l.msg.includes('[SUCCESS]')
                       ).slice(-30).reverse().map(log => (
                         <div key={log.id} className="text-[9px] border-l-2 border-primary/20 pl-2 py-1 bg-muted/10 rounded-r">
                            <div className="text-muted-foreground mb-0.5">{log.time}</div>
                            <div className={cn(
                              "break-all font-bold",
                              log.type === 'error' ? 'text-red-500' : 
                              log.type === 'success' ? 'text-emerald-500' : 
                              log.msg.includes('[KILL]') || log.msg.includes('[PURGE]') ? 'text-amber-600' :
                              'text-blue-600'
                            )}>{log.msg.replace(/\[\w+\]\s*/, '')}</div>
                         </div>
                       ))}
                       {terminalLogs.filter(l => 
                         l.msg.includes('[ATTACK]') || 
                         l.msg.includes('[REQ]') || 
                         l.msg.includes('[SHUTDOWN]') ||
                         l.msg.includes('[SYSTEM]') ||
                         l.msg.includes('[KILL]') ||
                         l.msg.includes('[PURGE]') ||
                         l.msg.includes('[WIPE]') ||
                         l.msg.includes('[DONE]') ||
                         l.msg.includes('[CLEAN]') ||
                         l.msg.includes('[SUCCESS]')
                       ).length === 0 && (
                         <div className="text-center py-10 text-[10px] text-muted-foreground">No attack events recorded</div>
                       )}
                    </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="keys" className="mt-0">
            <ManagedKeysView 
              keys={managedKeys} 
              onDelete={handleDeleteKey} 
              onGenerate={handleGenerateKey} 
              newKeyName={newKeyName}
              setNewKeyName={setNewKeyName}
              isGenerating={isGeneratingKey}
            />
          </TabsContent>
        </Tabs>

        {/* Terminal Section */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-0 bg-[#0a0a0a] text-white/90 p-2.5 rounded-t-xl border-x border-t border-white/5">
            <div className="flex gap-1.5 ml-1">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            </div>
            <span className="text-[9px] font-mono font-bold ml-2 uppercase tracking-widest opacity-60">System Realtime Logs</span>
          </div>
          <div className="bg-[#050505] border border-white/5 rounded-b-xl p-4 font-mono text-[11px] h-[180px] overflow-y-auto scrollbar-hide shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(20,20,20,0.4),transparent)]" />
            {terminalLogs.length === 0 ? (
              <div className="text-neutral-700 italic flex items-center gap-2">
                <span className="animate-pulse">_</span>
                System standby. Ready for execution.
              </div>
            ) : (
              terminalLogs.map((log) => (
                <div key={log.id} className="mb-1.5 flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                  <span className="text-neutral-600 shrink-0 font-bold">[{log.time}]</span>
                  <span className={cn(
                    "break-all",
                    log.type === 'error' ? 'text-red-400' : 
                    log.type === 'success' ? 'text-emerald-400' : 
                    'text-neutral-400'
                  )}>
                    {log.msg}
                  </span>
                </div>
              ))
            )}
            <div id="terminal-end" />
          </div>
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

function ManagedKeysView({ keys, onDelete, onGenerate, newKeyName, setNewKeyName, isGenerating }: any) {
  return (
    <div className="space-y-6">
      <div className="premium-card p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg font-bold">OrbitCloud Master Key</h1>
            <p className="text-xs text-muted-foreground mt-1">Kelola kunci SSH utama untuk integrasi otomatis VPS.</p>
          </div>
          {keys.length === 0 && (
            <div className="flex items-center gap-3">
              <Input 
                placeholder="Nama Kunci (OrbitCloud Key)" 
                className="h-9 w-[220px] rounded-xl" 
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <Button 
                onClick={onGenerate} 
                disabled={isGenerating}
                className="h-9 bg-black hover:bg-black/90 text-white rounded-xl px-4 flex items-center gap-2"
              >
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Generate Master Key
              </Button>
            </div>
          )}
        </div>

        {keys.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-muted/20 rounded-2xl border border-dashed">
            <Key className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada kunci internal.</p>
            <p className="text-[10px] text-muted-foreground/60 max-w-[200px] mt-1">Gunakan form di atas untuk men-generate kunci SSH baru.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {keys.map((key: any) => (
              <div key={key.id} className="p-4 bg-white rounded-2xl border border-border/50 shadow-sm flex flex-col md:flex-row gap-4 justify-between md:items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-muted/50 rounded-xl flex items-center justify-center">
                    <Key className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{key.name}</h4>
                    <p className="text-[10px] text-muted-foreground">Dibuat pada {new Date(key.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-1 max-w-md mx-4">
                  <div className="w-full relative">
                    <pre className="text-[9px] bg-muted/30 p-2.5 rounded-lg border border-border/50 overflow-x-auto font-mono text-muted-foreground break-all whitespace-pre-wrap min-h-[40px] max-h-[100px]">
                      {key.public_key}
                    </pre>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button 
                        size="sm" 
                        variant="secondary" 
                        className="h-7 px-2 text-[10px] bg-white shadow-sm border border-border/50 font-bold hover:bg-black hover:text-white transition-all group active:scale-95"
                        onClick={() => {
                          navigator.clipboard.writeText(key.public_key);
                          toast.success("Public Key tersalin!");
                        }}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        SALIN KEY
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg"
                    onClick={() => onDelete(key.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="premium-card p-4 flex gap-4 items-start">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Info className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-wider mb-1">Cara Penggunaan</h5>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Salin <strong>Public Key</strong> di atas dan tambahkan ke provider VPS Anda (DigitalOcean, Vultr, dsb) saat proses pembuatan VPS baru.
            </p>
          </div>
        </div>
        <div className="premium-card p-4 flex gap-4 items-start">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h5 className="text-[11px] font-bold uppercase tracking-wider mb-1">Koneksi Otomatis</h5>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Saat menambahkan VPS, pilih <strong>Internal Key</strong>. Stenly akan otomatis menggunakan kunci privat yang tersimpan untuk koneksi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServerTable({ servers, onTest, onDelete, onStopActivity, testingId }: { servers: any[], onTest: (id: number) => void, onDelete: (id: number) => void, onStopActivity: (id: number) => void, testingId: number | null }) {
  return (
    <Table>
      <TableHeader className="bg-muted/30">
        <TableRow className="hover:bg-transparent border-border/50">
          <TableHead className="h-7 text-[9px] uppercase font-bold w-[180px]">Node Endpoint</TableHead>
          <TableHead className="h-7 text-[9px] uppercase font-bold">Status</TableHead>
          <TableHead className="h-7 text-[9px] uppercase font-bold">Specs</TableHead>
          <TableHead className="h-7 text-[9px] uppercase font-bold">Latency</TableHead>
          <TableHead className="h-7 text-[9px] uppercase font-bold text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {servers.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-20 text-center text-[10px] text-muted-foreground">No nodes found in this pool</TableCell>
          </TableRow>
        ) : (
          servers.map((server) => (
            <TableRow key={server.id} className="hover:bg-muted/30 border-border/50">
              <TableCell className="py-1.5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold">{server.host}</span>
                  <span className="text-[9px] text-muted-foreground uppercase flex items-center gap-1">
                    {server.auth_type === 'password' ? <Lock className="w-2.5 h-2.5" /> : <Key className="w-2.5 h-2.5" />}
                    {server.username}@{server.port} • {server.auth_type === 'key' && server.managed_key_id ? 'OrbitKey' : server.auth_type}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-1.5">
                <StatusBadge status={server.id === testingId ? 'testing' : server.status} />
              </TableCell>
              <TableCell className="py-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-medium leading-tight">{server.cpu_cores} vCPU</span>
                    <span className="text-[9px] text-muted-foreground leading-tight">{server.ram_mb} MB RAM</span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-1.5">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] font-medium">{Math.round(server.latency || 0)}ms</span>
                </div>
              </TableCell>
              <TableCell className="py-1.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {(server.status === 'attacking' || server.status === 'dead') && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 px-2 text-[9px] border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-bold"
                      onClick={() => onStopActivity(server.id)}
                    >
                      STOP
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "h-7 px-3 text-[9px] font-bold uppercase tracking-wider transition-all",
                      (server.status === 'active' || server.status === 'attacking') 
                        ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100" 
                        : "border-border hover:bg-black hover:text-white"
                    )}
                    onClick={() => onTest(server.id)}
                    disabled={server.id === testingId}
                  >
                    {server.id === testingId ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                        TESTING...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3 mr-1.5" />
                        TEST VPS
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    onClick={() => onDelete(server.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

function StatCard({ title, value, unit, subValue, icon, color }: any) {
  return (
    <Card className="premium-card border-none">
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <div className={`p-1.5 rounded-lg bg-muted/50 ${color}`}>
            {icon}
          </div>
          <Badge variant="secondary" className="bg-muted/50 text-[8px] font-bold uppercase tracking-wider px-1 h-4">Live</Badge>
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">{title}</p>
          <div className="flex items-baseline gap-0.5">
            <h3 className="text-xl font-display font-bold tracking-tight">{value}</h3>
            {unit && <span className="text-[10px] font-medium text-muted-foreground">{unit}</span>}
          </div>
          <p className="text-[9px] text-muted-foreground mt-1 flex items-center">
            <ChevronRight className="w-2.5 h-2.5 mr-0.5" />
            {subValue}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: Server['status'] }) {
  const configs = {
    active: { color: 'bg-green-500', text: 'AKTIF', bg: 'bg-green-50 text-green-700' },
    dead: { color: 'bg-red-500', text: 'MATI', bg: 'bg-red-50 text-red-700' },
    testing: { color: 'bg-blue-500', text: 'MENGECEK', bg: 'bg-blue-50 text-blue-700' },
    attacking: { color: 'bg-amber-500', text: 'MENYERANG', bg: 'bg-amber-50 text-amber-700' }
  };
  const config = configs[status] || configs.dead;
  return (
    <Badge variant="outline" className={cn("text-[8px] h-4 px-1.5 uppercase font-bold border-none", config.bg)}>
      <span className={cn("w-1 h-1 rounded-full mr-1.5", config.color, (status === 'testing' || status === 'attacking') && "animate-pulse")} />
      {config.text}
    </Badge>
  );
}

function formatNumber(n: number) {
  if (n < 1000) return n.toString();
  if (n < 1000000) return (n / 1000).toFixed(1) + 'K';
  if (n < 1000000000) return (n / 1000000).toFixed(1) + 'M';
  return (n / 1000000000).toFixed(1) + 'G';
}
