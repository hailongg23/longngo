sudo useradd --no-create-home --shell /usr/sbin/nologin loki || true
sudo mkdir -p /etc/loki /var/lib/loki
cd /tmp
VER="3.0.0"  
curl -LO https://github.com/grafana/loki/releases/download/v${VER}/loki-linux-amd64.zip
unzip loki-linux-amd64.zip
sudo mv loki-linux-amd64 /usr/local/bin/loki
sudo chown loki:loki /usr/local/bin/loki /var/lib/loki
sudo chmod 0755 /usr/local/bin/loki

sudo tee /etc/loki/loki-config.yaml >/dev/null <<'YAML'
auth_enabled: false
server:
  http_listen_port: 3100

common:
  path_prefix: /var/lib/loki
  storage:
    filesystem:
      chunks_directory: /var/lib/loki/chunks
      rules_directory: /var/lib/loki/rules
  replication_factor: 1
  ring:
    instance_addr: 0.0.0.0
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

compactor:
  working_directory: /var/lib/loki/compactor
  compaction_interval: 5m
  retention_enabled: true
  delete_request_store: filesystem   # ← PHẢI là chuỗi

limits_config:
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32
  max_streams_per_user: 0
  max_global_streams_per_user: 0
  allow_structured_metadata: true
  retention_period: 168h             # 7 ngày
  max_query_lookback: 0s

ruler:
  alertmanager_url: http://localhost:9093
YAML

sudo -u loki /usr/local/bin/loki -config.file=/etc/loki/loki-config.yaml -verify-config
sudo systemctl reset-failed loki
sudo systemctl daemon-reload
sudo systemctl enable --now loki
sudo systemctl status loki --no-pager -l
curl -s http://localhost:3100/ready && echo   # mong đợi: ready

sudo tee /etc/systemd/system/loki.service >/dev/null <<'UNIT'
[Unit]
Description=Grafana Loki
After=network-online.target
Wants=network-online.target

[Service]
User=loki
Group=loki
ExecStart=/usr/local/bin/loki -config.file=/etc/loki/loki-config.yaml
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now loki