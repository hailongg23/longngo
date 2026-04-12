sudo useradd --no-create-home --shell /usr/sbin/nologin nodeusr || true
cd /tmp
VER="1.8.1"
curl -LO https://github.com/prometheus/node_exporter/releases/download/v${VER}/node_exporter-${VER}.linux-amd64.tar.gz
tar xzf node_exporter-${VER}.linux-amd64.tar.gz
sudo cp node_exporter-${VER}.linux-amd64/node_exporter /usr/local/bin/
sudo chown nodeusr:nodeusr /usr/local/bin/node_exporter

sudo tee /etc/systemd/system/node_exporter.service >/dev/null <<'UNIT'
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=nodeusr
Group=nodeusr
Type=simple
ExecStart=/usr/local/bin/node_exporter --web.listen-address=:9100
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now node_exporter


# Nếu cài RabbitMQ bằng package (bare metal)
sudo rabbitmq-plugins enable rabbitmq_prometheus
sudo rabbitmq-plugins enable rabbitmq_management

# (tuỳ) đảm bảo port 15692 mở. Nếu cần cấu hình:
# sudo tee -a /etc/rabbitmq/rabbitmq.conf <<'CONF'
# prometheus.tcp.port = 15692
# CONF
sudo systemctl restart rabbitmq-server


# Tải binary memcached_exporter (Prometheus community)
cd /usr/local/bin
sudo wget https://github.com/prometheus/memcached_exporter/releases/download/v0.15.3/memcached_exporter-0.15.3.linux-amd64.tar.gz
sudo chmod +x memcached_exporter

# Systemd unit
sudo tee /etc/systemd/system/memcached_exporter.service >/dev/null <<'UNIT'
[Unit]
Description=Memcached Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/memcached_exporter --memcached.address=192.168.1.20:11211 --web.listen-address=:9150
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now memcached_exporter


# DB exporter
# Đăng nhập MariaDB
sudo mysql -u root -p

# Tạo user chỉ-đọc phục vụ exporter
CREATE USER 'exporter'@'192.168.1.22' IDENTIFIED BY 'exporter_password';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'exporter'@'10.1.10.22';
FLUSH PRIVILEGES;

# Tải exporter
cd /tmp
VER="0.15.1"
curl -LO https://github.com/prometheus/mysqld_exporter/releases/download/v${VER}/mysqld_exporter-${VER}.linux-amd64.tar.gz
tar xzf mysqld_exporter-${VER}.linux-amd64.tar.gz
sudo cp mysqld_exporter-${VER}.linux-amd64/mysqld_exporter /usr/local/bin/

# File cấu hình thông tin kết nối (chỉ trên .22)
sudo tee /etc/.mysqld_exporter.cnf >/dev/null <<'CFG'
[client]
user=exporter
password=exporter_password
host=10.1.10.22
CFG
sudo chmod 600 /etc/.mysqld_exporter.cnf

# Systemd unit
sudo tee /etc/systemd/system/mysqld_exporter.service >/dev/null <<'UNIT'
[Unit]
Description=mysqld Exporter
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/mysqld_exporter \
  --config.my-cnf=/etc/.mysqld_exporter.cnf \
  --web.listen-address=:9104
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now mysqld_exporter
