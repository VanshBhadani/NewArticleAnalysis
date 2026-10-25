# NewsPulse AI — AWS EC2 & S3 Deployment and Cost Safety Guide

This guide details how to deploy NewsPulse AI to an Ubuntu EC2 instance, integrate Amazon S3, and follow AWS zero-cost cleanup procedures.

---

## 1. Cloud Architecture & Sizing

| Component | Recommended Target | Free Tier Eligible? | Considerations |
| :--- | :--- | :--- | :--- |
| **EC2 Instance** | `t3.small` (2 vCPU, 2GB RAM) or `t2.micro` (1 vCPU, 1GB RAM) | `t2.micro` / `t3.micro` | For `t2.micro` (1GB RAM), configure a 1.5GB swap file to prevent Java OOM kills when PySpark, Java 17, and Streamlit run concurrently. |
| **OS Image** | Ubuntu 22.04 LTS (x86_64) | Yes | Long-term support with standard OpenJDK 17. |
| **EBS Storage** | 15 GB gp3 Volume | Yes (Up to 30 GB free) | General purpose root volume. |
| **S3 Storage** | Standard S3 Bucket | Yes (5 GB free) | For prediction archives and model artifacts. |

---

## 2. EC2 Provisioning & Security Group Setup

### Security Group Inbound Rules
Always restrict administrative access to your current public IP address:

| Type | Protocol | Port Range | Source | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | 22 | `My IP` (`xxx.xxx.xxx.xxx/32`) | Secure terminal access |
| **Custom TCP** | TCP | 8501 | `My IP` or Authorized Office CIDR | NewsPulse Streamlit Web UI |

> [!WARNING]
> Never open port 22 or port 8501 to `0.0.0.0/0` (the entire internet) without proper firewall filtering.

---

## 3. IAM Role for S3 (Instance Profile)

Instead of hardcoding AWS Access Keys on the instance, attach an **EC2 Instance Profile** with a least-privilege policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "NewsPulseS3Access",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation",
                "s3:HeadBucket"
            ],
            "Resource": "arn:aws:s3:::newspulse-ai-storage"
        },
        {
            "Sid": "NewsPulseS3ObjectAccess",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject"
            ],
            "Resource": "arn:aws:s3:::newspulse-ai-storage/*"
        }
    ]
}
```

Attach this IAM role to your EC2 instance via **Actions ➔ Security ➔ Modify IAM role**.

---

## 4. Deployment Instructions

### Step 1: Connect via SSH
```bash
ssh -i "your-key.pem" ubuntu@<EC2-PUBLIC-IP>
```

### Step 2: Configure Swap (Crucial for 1GB RAM instances)
```bash
sudo fallocate -l 1.5G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Step 3: Clone Code and Run Setup
```bash
git clone https://github.com/your-username/bdaPBL.git newspulse-ai
cd newspulse-ai
chmod +x scripts/*.sh
./scripts/setup.sh
```

### Step 4: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
nano .env
```
Set:
```bash
NEWSPULSE_ENV=ec2
EXECUTION_MODE=aws
AWS_S3_BUCKET=your-actual-bucket-name
AWS_REGION=us-east-1
```

### Step 5: Deploy Systemd Background Service
```bash
./scripts/deploy_ec2.sh
```

### Step 6: Verify Service Health
```bash
sudo systemctl status newspulse --no-pager
# View live application logs:
sudo journalctl -u newspulse -f
```
Open `http://<EC2-PUBLIC-IP>:8501` in your browser.

---

## 5. Cost Breakdown & Zero-Cost Cleanup Guide

### Cost Caveats & Pricing Risks
1. **Public IPv4 Address:** AWS charges ~$0.005/hour for in-use public IPv4 addresses (~$3.60/month if left running).
2. **EBS Volumes:** Unattached EBS volumes continue to accrue storage charges even if an instance is stopped.
3. **S3 Requests:** Free tier provides 20,000 GET and 2,000 PUT requests per month.

### Complete Teardown Checklist (To Incur $0 Charges)
Follow these steps immediately after completing your demonstration:

1. **Stop vs. Terminate:**
   - **Stopping** the instance stops compute charges, but **EBS and IPv4 charges continue**.
   - To completely eliminate charges, **Terminate** the instance.
2. **Backup Evidence:**
   - Download prediction CSVs from `data/processed/`.
   - Download the model summary `models/v1.0.0-spark-lr/evaluation_summary.json`.
3. **Terminate EC2 Instance:**
   - AWS Console ➔ EC2 ➔ Instances ➔ Select instance ➔ **Instance State ➔ Terminate Instance**.
4. **Delete Unused EBS Volumes:**
   - AWS Console ➔ EC2 ➔ Volumes ➔ Verify the attached root volume terminates (status: deleted).
5. **Empty and Delete S3 Bucket:**
   - AWS Console ➔ S3 ➔ Select `newspulse-ai-storage` ➔ **Empty** ➔ **Delete Bucket**.
6. **Release Elastic IPs (if allocated):**
   - EC2 ➔ Elastic IPs ➔ Actions ➔ Release Elastic IP address.
