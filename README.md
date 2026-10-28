# CloudNative 3-Tier Enterprise Infrastructure Platform

![Build Status](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?logo=github-actions)
![Docker](https://img.shields.io/badge/Containers-Docker%20Compose-2496ED?logo=docker)
![NGINX](https://img.shields.io/badge/Reverse%20Proxy-NGINX%20Alpine-009639?logo=nginx)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20Express-339933?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1?logo=postgresql)
![Cloud](https://img.shields.io/badge/Cloud%20Hosting-AWS%20EC2-FF9900?logo=amazon-aws)

---

## 📌 Executive Architecture Overview

This repository hosts a production-grade, containerized **3-Tier Web Infrastructure** designed with cloud-native engineering principles. The platform features an automated Continuous Integration & Continuous Deployment (CI/CD) lifecycle, stateful database persistence, isolated internal network bridging, and an NGINX reverse-proxy tier deployed onto **Amazon Web Services (AWS EC2)**.

```mermaid
flowchart TD
    Client(["Client Browser / Mobile"])
    
    subgraph AWS_EC2 ["AWS EC2 Cloud Instance (Sydney: ap-southeast-2)"]
        subgraph Perimeter ["Security Group Firewall"]
            Port80["Port 80 (HTTP / Public)"]
        end
        
        subgraph BridgeNet ["Isolated Docker Bridge Network (cloudnative-net)"]
            NGINX["Presentation Tier: NGINX (Alpine)
Reverse Proxy and Static Asset Server"]
            Backend["Application Tier: Express REST API
PID 1 Signal Handling (Node.js 20)"]
            Postgres[("Persistence Tier: PostgreSQL 16
Stateful Relational Store")]
        end
        
        subgraph Storage ["Host Persistence"]
            DockerVol[("Docker Volume: postgres_data
Attached to EBS Storage")]
        end
    end

    Client -->|HTTP GET / POST| Port80
    Port80 --> NGINX
    NGINX -->|Serves Static UI /| Client
    NGINX -->|Proxy Pass /api/ to :5000| Backend
    Backend -->|TCP Connection Pool :5432| Postgres
    Postgres <--> DockerVol
```

---

## 🏗️ 3-Tier Architectural Specifications

### 1. Presentation Tier (Frontend / Web Server)
* **Technology:** NGINX Alpine Linux (~25MB image footprint).
* **Role:** High-throughput static file server and gateway reverse proxy.
* **Network Binding:** Host Port `80` mapped to Container Port `80`.
* **Routing Logic:**
  * Request path `/` -> Dispatches client storefront UI.
  * Request path `/api/` -> Proxies upstream to `http://backend:5000/api/` with forwarded client headers.

### 2. Application Logic Tier (Backend API)
* **Technology:** Node.js 20 LTS, Express Framework.
* **Security Hardening:**
  * Multi-Stage Dockerfile separating build dependencies from the runtime image.
  * Drops root privileges to unprivileged user `node` (UID `1000`).
  * Exec-form entrypoint (`CMD ["node", "server.js"]`) ensuring direct `SIGTERM` signal propagation for graceful database pool teardowns.

### 3. Persistence Tier (Stateful Relational Store)
* **Technology:** PostgreSQL 16 Alpine.
* **Data Integrity:** Automated seed script mounted via `/docker-entrypoint-initdb.d/init.sql` populating 162 catalog records.
* **Storage:** Docker Named Volume `postgres_data` guarantees zero data loss across container teardowns.

---

## 🚀 Automated CI/CD Lifecycle (GitOps Automation)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer (WSL2)
    participant Git as GitHub Repository
    participant Actions as GitHub Actions Runner
    participant Registry as Docker Hub Registry
    participant EC2 as AWS EC2 Host

    Dev->>Git: git push origin main
    Git->>Actions: Trigger CI/CD Workflow
    activate Actions
    Note over Actions: Stage 1: Quality Gate
    Actions->>Actions: Run Syntax and Schema Verification
    Note over Actions: Stage 2: Containerization
    Actions->>Registry: Build and Push Images (:latest, :sha)
    Note over Actions: Stage 3: Deployment
    Actions->>EC2: SSH Session to AWS Host
    activate EC2
    EC2->>Git: git pull origin main
    EC2->>Registry: docker compose pull
    EC2->>EC2: docker compose up -d --remove-orphans
    EC2-->>Actions: Deployment Complete (Exit 0)
    deactivate EC2
    deactivate Actions
```

### Pipeline Quality Gates:
1. **Lint & Syntax Validation:** Evaluates JavaScript AST integrity using `node --check` before triggering container compilation.
2. **Deterministic Buildx Compilation:** Employs Docker Buildx layer caching for sub-minute container builds.
3. **Automated SSH Orchestration:** Authenticates via non-interactive RSA keys to trigger remote Rolling Container Re-spawns.

---

## ⚙️ Quick Start Guide

### Local Deployment
```bash
# 1. Clone repository
git clone https://github.com/abdullahmasaud10/cloudnative-3tier-platform.git
cd cloudnative-3tier-platform

# 2. Spin up the full 3-tier platform
docker compose up -d

# 3. Access endpoints
# Web UI:       http://localhost:80
# API Health:   http://localhost:80/health
# Catalog API:  http://localhost:80/api/products
```

### Remote AWS Production Access
* **Base URL:** `http://16.178.157.45`
* **Health Check Probe:** `http://16.178.157.45/health`

---

## 🛡️ Security Architecture Matrix

| Dimension | Implementation | Risk Mitigation |
| :--- | :--- | :--- |
| **Identity & Access** | Linux Non-Root User (UID `1000`) | Mitigates Container-to-Host privilege escalation / breakout exploits |
| **Ingress Control** | AWS Security Groups (`0.0.0.0/0` on Ports 80 & 22) | Port 5432 and 5000 are shielded from brute-force exposure |
| **Network Isolation** | Private Docker Bridge (`cloudnative-net`) | Establishes zero-trust container-to-container boundary |
| **Secret Encryption** | GitHub Actions Encrypted Secrets Vault | Eliminates credential leakage in version control manifests |

---

## 👨‍💻 Maintainer
**Abdullah Masaud**  
*Cloud & Infrastructure Engineer | Computer Engineering Graduate*  
* GitHub: [@abdullahmasaud10](https://github.com/abdullahmasaud10)
