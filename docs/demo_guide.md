# NewsPulse AI — Demonstration & Presentation Guide

This guide provides a structured, verifiable demonstration sequence for academic reviewers, project presentations, and stakeholder reviews.

---

## Pre-Demonstration Checklist
1. Ensure the application is running:
   ```bash
   streamlit run app.py
   ```
2. Open `http://localhost:8501` in your browser.
3. Verify that `PySpark 4.2.0 Online` appears in the top bar.

---

## 1. Overview & Operational Telemetry
- **Action:** Open the **Overview** page from the sidebar.
- **Talking Points:**
  - Emphasize that the platform operates like a newsroom editorial intelligence SaaS, not a toy CRUD app.
  - Point out the **top bar status badges**: clearly distinguishing between `Local Environment` and `AWS Cloud (EC2/S3)` to guarantee honesty.
  - Highlight the **4 operational metric cards**: Cumulative Processed Records, Succeeded/Failed Jobs, Mean Spark Throughput (articles/sec), and Active Session Records.
  - Show the **Recent Processing Jobs** ledger reflecting live transactional records from SQLite.

---

## 2. Real-Time Single Article Classification
- **Action:** Navigate to **Classify Wire** in the sidebar.
- **Demonstration:**
  1. Click the **"Sports (Championship)"** preset button to populate the headline and lead paragraph.
  2. Click **"Run Spark MLlib Classification"**.
  3. Show the prediction output:
     - Desk badge: `Sports`
     - Decisive confidence score (e.g. `85%+`)
     - Class Probability Spectrum: Visualizing the distribution across World, Sports, Business, and Sci/Tech.
     - Spark execution latency in milliseconds.
  4. Next, test an intentionally ambiguous or diplomatic headline: click **"World (Diplomacy)"** and observe the **Editorial Uncertainty Indicator** that warns when confidence falls below the editorial threshold.

---

## 3. Distributed Batch Processing Pipeline
- **Action:** Navigate to **Batch Processing**.
- **Demonstration:**
  1. Click **"Download Sample CSV Template"** to inspect the 60-article demonstration batch.
  2. Drag and drop `data/sample_news_batch.csv` into the file uploader.
  3. **Step 1 — Schema Alignment:** Show how the system auto-detects `article_title`, `summary`, and `content_body`.
  4. **Step 2 — Quality Audit:** Click to review the validation breakdown: 60 accepted records, 0 malformed, duplicates filtered.
  5. **Step 3 — Spark Execution:** Click **"Submit Batch Processing Job"**.
  6. Watch the real-time progress bar execute the 5 pipeline stages (`RegexTokenizer` ➔ `StopWords` ➔ `HashingTF` ➔ `IDF` ➔ `LogisticRegression`).
  7. Show the completion banner with exact duration, throughput, and the **"Download Full Prediction Results (CSV)"** button.

---

## 4. Article Explorer & Editorial Drawer
- **Action:** Navigate to **Article Explorer**.
- **Demonstration:**
  1. Filter by category: Select **"Business"** to filter the active batch to corporate finance articles.
  2. Use the **Confidence Range** slider to isolate articles above 50% confidence.
  3. Expand any individual article card to inspect the article ID, headline, probability spectrum, and editorial classification rationale.
  4. Click **"Export Current Filtered View (CSV)"** to demonstrate editorial export functionality.

---

## 5. Analytics & Model Evaluation Workspace
- **Action:** Navigate to **Analytics**.
- **Demonstration:**
  1. **Production Batch Telemetry Tab:**
     - Point out the **Category Distribution** horizontal bar chart.
     - Review the **Prediction Confidence Histogram**.
     - Review the **Spark Processing Duration & Throughput History** timeline across recent jobs.
  2. **Model Evaluation & Benchmarks Tab:**
     - Point out the test benchmark accuracy, weighted F1, precision, and recall calculated on the AG News test split.
     - Hover over the interactive **Confusion Matrix** heatmap to show true vs. predicted classifications.
     - Review the **Per-Desk Statistical Breakdown** chart comparing precision, recall, and F1.

---

## 6. Jobs & Audit History
- **Action:** Navigate to **Jobs & Audit**.
- **Demonstration:**
  - Show the SQLite-persisted operational ledger.
  - Select any previous Job ID in the **Job Forensics Inspector** to audit its submission timestamp, start/completion times, execution mode, throughput, and output path.

---

## 7. Model Lab & Governance
- **Action:** Navigate to **Model Lab**.
- **Demonstration:**
  - Walk through the 5 Spark MLlib pipeline stages.
  - Explain why `HashingTF` with 4,000 features is chosen for memory efficiency on small compute instances.
  - Show the **Interactive Retraining Workbench** where hyperparameters (`numFeatures`, `regParam`, `maxIter`) can be customized to trigger a live Spark retraining run.

---

## 8. Infrastructure & S3 Cloud Connectivity
- **Action:** Navigate to **Infrastructure & Cloud**.
- **Demonstration:**
  - Show the live runtime diagnostics: Spark version (`4.2.0`), JVM version (`Java 17 OpenJDK`), and Python interpreter.
  - Click **"Run Live S3 Connectivity Ping"**:
    - When unconfigured, it safely identifies `UNCONFIGURED (Local Development Fallback)` without crashing.
    - When AWS keys/role are present, it tests `head_bucket` and reports latency in ms.
  - Review the **Sanitized Configuration Table**: verify that zero AWS secret keys or sensitive tokens are exposed.
