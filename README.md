# NewsPulse AI — Cloud-Native News Intelligence & Classification Platform

[![Python](https://img.shields.io/badge/Python-3.11.9-blue.svg)](https://www.python.org/)
[![Apache Spark](https://img.shields.io/badge/Apache%20Spark-4.2.0-E25A1C.svg)](https://spark.apache.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg)](https://www.typescriptlang.org/)
[![AWS](https://img.shields.io/badge/AWS-EC2%20%7C%20S3-232F3E.svg)](https://aws.amazon.com/)
[![Tests](https://img.shields.io/badge/Tests-21%2F21%20Passing-brightgreen.svg)]()

> A cloud-native editorial intelligence platform designed for media newsrooms, intelligence analysts, and data engineering teams. Combines **Apache Spark 4.2.0**, **Spark MLlib**, **FastAPI**, **React/TypeScript**, and **Amazon S3** with an **editorial design system**.

---

## 1. What NewsPulse AI Does

NewsPulse AI ingests, normalizes, audits, classifies, explores, and analyzes high-volume news dispatches across four core editorial desks:
- **World:** International diplomacy, foreign policy, treaties, conflict resolution.
- **Sports:** Athletics, tournaments, league competitions, athletic records.
- **Business:** Macroeconomics, corporate mergers, Wall Street markets, fiscal policy.
- **Sci/Tech:** Quantum computing, artificial intelligence, aerospace, biotechnology.

It pairs a scalable **Spark MLlib Pipeline** with a typed **FastAPI REST API**, a modern **React + TypeScript + Tailwind CSS** frontend, **SQLite** operational audit logs, and **Amazon S3** cloud object storage.

---

## 2. Core Architecture & Technologies

| Layer | Technology | Architectural Role |
| :--- | :--- | :--- |
| **Frontend Application** | **React 19 + TypeScript + Vite + Tailwind CSS** | Editorial minimalism interface, Newsreader serif headings, Plus Jakarta Sans controls, interactive telemetry charts, and live Spark inference forms. |
| **Backend REST API** | **FastAPI + Pydantic v2** | Modular, typed API routers (`/api/v1/...`) with input validation, error handling, background task execution, and single-origin static SPA serving. |
| **Distributed Data Engine** | **Apache Spark 4.2.0 & PySpark** | Vectorized text extraction, tokenization, StopWords filtering, HashingTF term projection, IDF scaling, and parallel batch prediction. |
| **Machine Learning** | **Spark MLlib** | Multinomial Logistic Regression (`L2` regularized) fitted as an immutable `PipelineModel` artifact. |
| **Cloud Compute Host** | **Amazon EC2 (Ubuntu 22.04 LTS)** | Cloud host running FastAPI and Spark background execution via `systemd`. |
| **Cloud Storage** | **Amazon S3 (Boto3)** | Durable persistence for input archives, serialized model artifacts, prediction outputs, and JSON audit telemetry. |
| **Audit Ledger** | **SQLite** | Transactional ledger recording job states (`queued` ➔ `running` ➔ `succeeded` / `failed`), throughput, and durations. |

---

## 3. Machine Learning Pipeline Architecture

The platform implements an Apache Spark MLlib `Pipeline`:
```
Raw Text ➔ RegexTokenizer ➔ StopWordsRemover ➔ HashingTF(4,000) ➔ IDF ➔ LogisticRegression
```

- **Feature Space:** 4,000 hashed features via MurmurHash3 to bound memory usage on cloud instances.
- **Reproducibility:** Seeded train/test split on canonical AG News benchmark. Preprocessing transformations are strictly fitted on the training split only.
- **Evaluation:** Evaluated using `MulticlassClassificationEvaluator` across Accuracy (64.0%), Weighted Precision (70.3%), Weighted Recall (64.0%), and F1-Score (63.8).

---

## 4. Quick Start (Local Installation)

### Prerequisites
- Python 3.11+
- Java 17 LTS (OpenJDK)
- Node.js 18+ & npm

### 1. Clone & Set Up Environment
```bash
git clone https://github.com/your-username/bdaPBL.git newspulse-ai
cd newspulse-ai

# Python Virtual Environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Install Frontend dependencies
cd frontend
npm install
npm run build
cd ..
```

### 2. Launch the Application (Single-Origin Server)
```bash
python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000
```
Open **`http://127.0.0.1:8000`** in your browser.

FastAPI serves both the production REST API at `/api/v1` and the React single-page application at `/`.

### 3. Frontend Development Mode (Optional)
If modifying the frontend with Vite hot-module reloading:
```bash
# Terminal 1: FastAPI API backend
python -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000

# Terminal 2: Vite Dev Server
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser (proxies API requests to port 8000).

---

## 5. Running Tests

NewsPulse AI includes a test suite covering the FastAPI REST endpoints, schema validation, Spark MLlib inference, SQLite job state transitions, metrics, and S3 connectivity fallback:

```bash
python -m pytest tests/ -v
```

Expected output:
```
tests/test_api.py::test_api_health PASSED                                [  4%]
tests/test_api.py::test_api_overview PASSED                              [  9%]
tests/test_api.py::test_api_classify_presets PASSED                      [ 14%]
tests/test_api.py::test_api_classify_single PASSED                       [ 19%]
tests/test_api.py::test_api_classify_empty PASSED                        [ 23%]
tests/test_api.py::test_api_batch_template PASSED                        [ 28%]
tests/test_api.py::test_api_list_articles PASSED                         [ 33%]
tests/test_api.py::test_api_jobs_history PASSED                          [ 38%]
tests/test_api.py::test_api_analytics PASSED                             [ 42%]
tests/test_api.py::test_api_model_lab PASSED                             [ 47%]
tests/test_api.py::test_api_infrastructure PASSED                        [ 52%]
tests/test_jobs_repository.py::test_job_lifecycle PASSED                 [ 57%]
tests/test_metrics.py::test_compute_confidence_buckets PASSED            [ 61%]
tests/test_metrics.py::test_dataset_overview_metrics_empty PASSED        [ 66%]
tests/test_spark_inference.py::test_predict_single_article PASSED        [ 71%]
tests/test_spark_inference.py::test_predict_single_article_empty PASSED  [ 76%]
tests/test_storage_s3.py::test_storage_adapter_connectivity_unconfigured PASSED [ 80%]
tests/test_storage_s3.py::test_save_predictions_local PASSED             [ 85%]
tests/test_validation.py::test_clean_text_field PASSED                   [ 90%]
tests/test_validation.py::test_auto_detect_columns PASSED                [ 95%]
tests/test_validation.py::test_validation_valid_and_malformed PASSED     [100%]
============================= 21 passed in 56.89s =============================
```

---

## 6. Batch CSV Schema

The platform supports flexible schema ingestion with auto-detection for common column variants:

| Canonical Field | Recognized Headers | Required? | Description |
| :--- | :--- | :--- | :--- |
| **`title`** | `title`, `headline`, `article_title`, `header` | Recommended | Primary news headline |
| **`description`** | `description`, `summary`, `abstract`, `desc` | Optional | Lead paragraph or editorial summary |
| **`text`** | `text`, `content`, `body`, `news_text`, `full_text` | Recommended | Complete body text of dispatch |
| **`label`** | `label`, `category`, `class`, `topic` | Optional | Ground truth label (if auditing accuracy) |

A sample batch template can be downloaded directly from the **Batch Processing** page or retrieved via `GET /api/v1/batches/template`.

---

## 7. Amazon EC2 & S3 Cloud Deployment

For detailed EC2 deployment commands, systemd service units, and cost-safety teardown checklists, see [docs/aws_deployment.md](docs/aws_deployment.md).

Quick summary:
```bash
# On Ubuntu 22.04 LTS EC2 instance:
./scripts/setup.sh
cp .env.example .env
nano .env # Configure S3 bucket and AWS region
./scripts/deploy_ec2.sh
```

---

## 8. Security & Credential Protection

- **Zero Secret Exposure:** AWS Access Keys and session tokens are **never** logged, rendered in the UI, or committed to Git.
- **Credential Provider Chain:** Boto3 resolves credentials via EC2 Instance Profiles or standard environment variables.
- **Local Fallback:** In the absence of cloud credentials, local mode persists outputs to `data/processed/` and transparently flags the storage engine as `Local Fallback`—never misrepresenting local writes as cloud uploads.

---

## 9. AWS Zero-Cost Cleanup Instructions

To avoid cloud charges after a demonstration:
1. **Terminate EC2 Instance:** Compute, EBS volumes, and public IPv4 charges stop.
2. **Empty & Delete S3 Bucket:** Remove temporary test batch archives and prediction outputs.
3. See [docs/aws_deployment.md](docs/aws_deployment.md) for full step-by-step instructions.
