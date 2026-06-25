CREATE TABLE IF NOT EXISTS servers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INT DEFAULT 22,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NULL,
    key_content TEXT NULL,
    managed_key_id INT NULL,
    auth_type ENUM('password', 'key') NOT NULL,
    cpu_cores INT DEFAULT 0,
    ram_mb INT DEFAULT 0,
    bandwidth INT DEFAULT 100,
    latency FLOAT DEFAULT 0,
    status ENUM('active', 'dead', 'testing', 'attacking') DEFAULT 'testing',
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attack_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    target_ip VARCHAR(255) NULL,
    target_port INT NULL,
    target_url TEXT NULL,
    method VARCHAR(50) NOT NULL,
    duration INT NOT NULL,
    threads INT NOT NULL,
    status ENUM('running', 'completed', 'failed', 'stopped') DEFAULT 'running',
    packets_sent BIGINT DEFAULT 0,
    bytes_sent BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stats (
    id INT PRIMARY KEY DEFAULT 1,
    total_attacks INT DEFAULT 0,
    total_packets BIGINT DEFAULT 0,
    total_bytes BIGINT DEFAULT 0,
    total_time BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS managed_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS proxies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proxy VARCHAR(255) NOT NULL UNIQUE,
    status ENUM('active', 'dead') DEFAULT 'active',
    last_checked TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO stats (id, total_attacks, total_packets, total_bytes, total_time) VALUES (1, 0, 0, 0, 0);
