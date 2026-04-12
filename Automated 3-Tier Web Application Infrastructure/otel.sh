# Tải bản contrib (có nhiều exporter/receiver)
cd /tmp
VER="0.106.0"
curl -LO https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v${VER}/otelcol-contrib_${VER}_linux_amd64.tar.gz
sudo mkdir -p /opt/otelcol
sudo tar xzf otelcol-contrib_${VER}_linux_amd64.tar.gz -C /opt/otelcol
sudo ln -sf /opt/otelcol/otelcol-contrib /usr/local/bin/otelcol-contrib

# Config Collector
sudo tee /etc/otelcol-contrib.yaml >/dev/null <<'YAML'
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 2s
    limit_mib: 1024
    spike_limit_mib: 256
  batch: {}

exporters:
  # Prometheus — để Prometheus scrape metrics của Collector (port 9464)
  prometheus:
    endpoint: 0.0.0.0:9464

  # Loki (.21) — nhận logs từ agent
  loki:
    endpoint: http://10.1.10.21:3100/loki/api/v1/push
  # In log của chính Collector để dễ debug
  logging:
    loglevel: info

service:
  pipelines:
    # ĐỂ CHẮC ĂN: bật đủ 3 pipeline
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [logging]       # chưa cấu hình Tempo thì tạm log ra

    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki, logging]

    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus, logging]
YAML

# systemd unit
sudo tee /etc/systemd/system/otelcol-contrib.service >/dev/null <<'UNIT'
[Unit]
Description=OpenTelemetry Collector (Contrib)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/otelcol-contrib --config /etc/otelcol-contrib.yaml
Restart=on-failure

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now otelcol-contrib


# Add opentelemetry java agent to tomcat
sudo mkdir -p /opt/otel
cd /opt/otel
sudo curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
sudo chown root:root /opt/otel/opentelemetry-javaagent.jar

# Create set env to tomcat
sudo tee /opt/tomcat/bin/setenv.sh >/dev/null <<'SH'
#!/usr/bin/env bash
export CATALINA_OPTS="$CATALINA_OPTS -javaagent:/opt/otel/opentelemetry-javaagent.jar"

export OTEL_SERVICE_NAME="my-application-services"
export OTEL_RESOURCE_ATTRIBUTES="service.version=1.0.0,env=prod"

# App gửi về Collector cục bộ
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"
export OTEL_EXPORTER_OTLP_PROTOCOL="grpc"

# Xuất traces/metrics/logs qua OTLP
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"

# Sampling & tối ưu
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.25"
export OTEL_EXPORTER_OTLP_COMPRESSION="gzip"

# Log4j2: inject trace_id/span_id vào MDC
export OTEL_INSTRUMENTATION_LOGS_MDC_INJECTION_ENABLE=true
SH
sudo chmod +x /opt/tomcat/bin/setenv.sh
sudo systemctl restart tomcat  
