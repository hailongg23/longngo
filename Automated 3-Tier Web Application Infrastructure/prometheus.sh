wget https://github.com/prometheus/prometheus/releases/download/v3.7.2/prometheus-3.7.2.linux-amd64.tar.gz
tar -zxvf prometheus-3.7.2.linux-amd64.tar.gz
cd prometheus-3.7.2.linux-amd64
sudo mkdir -p /etc/prometheus
sudo mkdir -p /var/lib/prometheus
sudo mv prometheus /usr/local/bin/
sudo mv consoles/ console_libraries/ /etc/prometheus/
sudo mv prometheus.yml /etc/prometheus/prometheus.yml
sudo vim /etc/prometheus/prometheus.yml

---
global:
  scrape_interval: 5s
  evaluation_interval: 5s

scrape_configs:
  # --- Node Exporter trên 3 server ---
  - job_name: 'node'
    static_configs:
      - targets: ['192.168.1.20:9100','192.168.1.21:9100','192.168.1.22:9100']

  # --- OTel Collector metrics (APP host) ---
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['192.168.1.20:9464']

  # --- RabbitMQ metrics (plugin Prometheus hoặc exporter) ---
  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['192.168.1.20:15692']

  # --- Memcached exporter ---
  - job_name: 'memcached'
    static_configs:
      - targets: ['192.168.1.20:9150']

  # --- MariaDB exporter (mysqld_exporter) ---
  - job_name: 'mariadb'
    static_configs:
      - targets: ['192.168.1.22:9104']

---

sudo groupadd --system prometheus
sudo useradd -s /sbin/nologin --system -g prometheus prometheus
sudo chown -R prometheus:prometheus /etc/prometheus/  /var/lib/prometheus/
sudo chmod -R 775 /etc/prometheus/ /var/lib/prometheus/
sudo vim /etc/systemd/system/prometheus.service

---
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Restart=always
Type=simple
ExecStart=/usr/local/bin/prometheus \
    --config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/var/lib/prometheus/ \
    --web.console.templates=/etc/prometheus/consoles \
    --web.console.libraries=/etc/prometheus/console_libraries \
    --web.listen-address=0.0.0.0:9090

[Install]
WantedBy=multi-user.target
---

sudo systemctl daemon-reload
sudo systemctl start prometheus
sudo systemctl enable prometheus
sudo systemctl status prometheus