# 1) Cài promtail (Linux x86_64)
VERSION="2.9.0"
cd /tmp
curl -LO https://github.com/grafana/loki/releases/download/v${VERSION}/promtail-linux-amd64.zip
sudo apt-get -y install unzip || true
unzip promtail-linux-amd64.zip
sudo mv promtail-linux-amd64 /usr/local/bin/promtail
sudo chmod +x /usr/local/bin/promtail

# 3) Tạo systemd service
sudo tee /etc/systemd/system/promtail.service >/dev/null <<'EOF'
[Unit]
Description=Promtail service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/promtail -config.file=/home/wasadm/promtail.yml
Restart=always
RestartSec=5s
User=root
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# 4) Kiểm tra cấu hình & khởi động
sudo /usr/local/bin/promtail -config.file=/home/wasadm/promtail.yml -verify-config
sudo systemctl daemon-reload
sudo systemctl enable --now promtail
sudo systemctl status promtail --no-pager -l

# 5) Test nhanh: xem label 'job' đã lên chưa (từ Loki)
curl -sG http://10.1.10.21:3100/loki/api/v1/label/job/values