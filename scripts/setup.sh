#!/usr/bin/env bash
# ==============================================================================
# NewsPulse AI — EC2 Host Environment Setup (Ubuntu 22.04 LTS)
# ==============================================================================

set -euo pipefail

echo "================================================================="
echo "   NewsPulse AI — Provisioning Ubuntu Cloud Host Environment     "
echo "================================================================="

# 1. Update OS package lists
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install OpenJDK 17 Runtime (Required for Apache Spark 4.x)
echo "Installing OpenJDK 17 headless runtime..."
sudo apt-get install -y openjdk-17-jre-headless ca-certificates-java

# 3. Install Python 3.11 and build dependencies
echo "Installing Python 3.11 and system libraries..."
sudo apt-get install -y python3 python3-pip python3-venv git curl

# 4. Create virtual environment
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${PROJECT_DIR}"

echo "Creating Python virtual environment in ${PROJECT_DIR}/.venv..."
python3 -m venv .venv
source .venv/bin/activate

# 5. Upgrade pip and install pinned requirements
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

# 6. Verify installations
echo "Verifying runtimes:"
java -version
python --version
python -c "import pyspark, streamlit, boto3, plotly; print('All core Python modules verified successfully!')"

echo "================================================================="
echo "   Host setup complete! Run 'source .venv/bin/activate' to use.  "
echo "================================================================="
