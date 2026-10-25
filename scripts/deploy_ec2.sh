#!/usr/bin/env bash
# ==============================================================================
# NewsPulse AI — EC2 Systemd Service Deployment Script
# ==============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CURRENT_USER="$(whoami)"
SERVICE_NAME="newspulse"

echo "Deploying NewsPulse AI as a managed systemd service on EC2..."

# 1. Ensure model is trained and baseline data is initialized
cd "${PROJECT_DIR}"
source "${PROJECT_DIR}/.venv/bin/activate"

if [ ! -d "${PROJECT_DIR}/models/v1.0.0-spark-lr/spark_model" ]; then
    echo "Training initial Spark MLlib model artifact..."
    python scripts/train_model.py
fi

# 2. Generate Systemd Service File
SERVICE_FILE="/tmp/${SERVICE_NAME}.service"
cat <<EOF > "${SERVICE_FILE}"
[Unit]
Description=NewsPulse AI — Cloud-Native News Intelligence Platform
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${PROJECT_DIR}
Environment="PATH=${PROJECT_DIR}/.venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment="PYTHONPATH=${PROJECT_DIR}"
Environment="NEWSPULSE_ENV=ec2"
Environment="EXECUTION_MODE=aws"
ExecStart=${PROJECT_DIR}/.venv/bin/streamlit run app.py --server.port 8501 --server.headless true --server.address 0.0.0.0
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# 3. Install and start service
echo "Installing service unit to /etc/systemd/system/${SERVICE_NAME}.service..."
sudo mv "${SERVICE_FILE}" "/etc/systemd/system/${SERVICE_NAME}.service"
sudo systemctl daemon-reload
sudo systemctl enable "${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"

echo "Checking service status..."
sudo systemctl status "${SERVICE_NAME}" --no-pager

echo "================================================================="
echo "   NewsPulse AI successfully deployed on EC2!                    "
echo "   Access URL: http://<EC2-PUBLIC-IP>:8501                       "
echo "   View logs: sudo journalctl -u ${SERVICE_NAME} -f              "
echo "================================================================="
