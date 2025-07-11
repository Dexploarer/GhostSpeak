# Deployment Guide

Comprehensive deployment strategy for GhostSpeak across multiple environments using modern DevOps practices and cloud-native technologies.

## Quick Navigation

| Environment | Purpose | Automation | Monitoring |
|-------------|---------|------------|------------|
| [Development](#development-environment) | Local development | 🔧 Docker Compose | 📊 Local Logs |
| [Staging](#staging-environment) | Pre-production testing | 🚀 GitHub Actions | 📈 Basic Metrics |
| [Production](#production-environment) | Live application | ✅ Full CI/CD | 🔍 Complete Observability |
| [Monitoring](#monitoring-setup) | System health | 📊 Grafana + Prometheus | 🚨 Alert Manager |

## Deployment Architecture

### Cloud-Native Stack
```mermaid
graph TB
    subgraph "Production Environment"
        LB[Load Balancer]
        
        subgraph "Kubernetes Cluster"
            API[API Gateway]
            SMART[Smart Contract Service]
            SDK[SDK Services]
            CLI[CLI Tools]
            DB[(Database)]
            CACHE[(Redis Cache)]
        end
        
        subgraph "Monitoring"
            PROM[Prometheus]
            GRAF[Grafana]
            ALERT[AlertManager]
        end
        
        subgraph "External Services"
            SOLANA[Solana RPC]
            IPFS[IPFS Network]
            CDN[Content Delivery Network]
        end
    end
    
    LB --> API
    API --> SMART
    API --> SDK
    API --> CLI
    SMART --> DB
    SDK --> CACHE
    PROM --> GRAF
    PROM --> ALERT
    API --> SOLANA
    SDK --> IPFS
    LB --> CDN
```

## Prerequisites

### System Requirements
- **Kubernetes**: 1.28+ cluster with RBAC enabled
- **Docker**: 24.0+ with BuildKit support
- **Node.js**: 18+ for build tools
- **Bun**: 1.0+ for package management
- **Rust**: 1.79+ for smart contract compilation
- **Solana CLI**: 1.18+ for program deployment

### Required Accounts & Services
- **Cloud Provider**: AWS, GCP, or Azure account
- **Container Registry**: Docker Hub, ECR, or GCR
- **Domain Management**: Route53, CloudFlare, or equivalent
- **Monitoring**: DataDog, New Relic, or self-hosted stack
- **Secrets Management**: AWS Secrets Manager, Azure Key Vault, or HashiCorp Vault

## Development Environment

### Local Development Setup

**1. Clone and Setup**
```bash
git clone https://github.com/ghostspeak/core.git
cd core

# Install dependencies
bun install

# Setup environment variables
cp .env.example .env.development.local
```

**2. Docker Compose for Local Services**
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ghostspeak_dev
      POSTGRES_USER: ghostspeak
      POSTGRES_PASSWORD: development_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  solana-test-validator:
    image: solanalabs/solana:v1.18.0
    command: >
      sh -c "solana-test-validator 
        --ledger /tmp/test-ledger 
        --bind-address 0.0.0.0 
        --rpc-bind-address 0.0.0.0 
        --faucet-sol 1000000"
    ports:
      - "8899:8899"
      - "9900:9900"
    volumes:
      - solana_data:/tmp/test-ledger

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=development
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  redis_data:
  solana_data:
  grafana_data:
```

**3. Start Development Environment**
```bash
# Start infrastructure services
docker compose -f docker-compose.dev.yml up -d

# Deploy smart contracts to local validator
bun run deploy:local

# Start development servers
bun run dev
```

### Development Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"bun dev:api\" \"bun dev:frontend\"",
    "dev:api": "bun --watch src/api/server.ts",
    "dev:frontend": "vite dev",
    "test:local": "vitest --watch",
    "deploy:local": "anchor deploy --provider.cluster localnet",
    "build:docker": "docker build -t ghostspeak/core:dev ."
  }
}
```

## Staging Environment

### Kubernetes Staging Deployment

**1. Namespace Configuration**
```yaml
# k8s/staging/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ghostspeak-staging
  labels:
    env: staging
    app: ghostspeak-core
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: ghostspeak-staging
data:
  NODE_ENV: "staging"
  LOG_LEVEL: "info"
  DATABASE_URL: "postgresql://ghostspeak:$(DB_PASSWORD)@postgres:5432/ghostspeak_staging"
  REDIS_URL: "redis://redis:6379"
  SOLANA_RPC_URL: "https://api.devnet.solana.com"
```

**2. Application Deployment**
```yaml
# k8s/staging/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ghostspeak-api
  namespace: ghostspeak-staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ghostspeak-api
  template:
    metadata:
      labels:
        app: ghostspeak-api
    spec:
      containers:
      - name: api
        image: ghostspeak/core:staging
        ports:
        - containerPort: 3000
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: password
        envFrom:
        - configMapRef:
            name: app-config
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ghostspeak-api-service
  namespace: ghostspeak-staging
spec:
  selector:
    app: ghostspeak-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

**3. Ingress Configuration**
```yaml
# k8s/staging/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ghostspeak-ingress
  namespace: ghostspeak-staging
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-staging"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  tls:
  - hosts:
    - staging.api.ghostspeak.com
    secretName: ghostspeak-staging-tls
  rules:
  - host: staging.api.ghostspeak.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ghostspeak-api-service
            port:
              number: 80
```

### CI/CD Pipeline for Staging

**GitHub Actions Workflow**
```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: bun install
        
      - name: Run tests
        run: bun test:ci
        
      - name: Build smart contracts
        run: |
          cargo install --git https://github.com/coral-xyz/anchor avm --force
          avm install 0.31.1
          avm use 0.31.1
          anchor build
          
      - name: Test smart contracts
        run: anchor test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
        
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          
      - name: Deploy to Kubernetes
        uses: azure/k8s-deploy@v1
        with:
          namespace: 'ghostspeak-staging'
          manifests: |
            k8s/staging/namespace.yaml
            k8s/staging/configmap.yaml
            k8s/staging/secrets.yaml
            k8s/staging/api-deployment.yaml
            k8s/staging/ingress.yaml
          images: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

## Production Environment

### Production Infrastructure

**1. High-Availability Deployment**
```yaml
# k8s/production/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ghostspeak-api
  namespace: ghostspeak-production
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
  selector:
    matchLabels:
      app: ghostspeak-api
  template:
    metadata:
      labels:
        app: ghostspeak-api
        version: v1
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - ghostspeak-api
              topologyKey: kubernetes.io/hostname
      containers:
      - name: api
        image: ghostspeak/core:v1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: LOG_LEVEL
          value: "warn"
        envFrom:
        - secretRef:
            name: production-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
          timeoutSeconds: 10
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1001
          capabilities:
            drop:
              - ALL
```

**2. Horizontal Pod Autoscaler**
```yaml
# k8s/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ghostspeak-api-hpa
  namespace: ghostspeak-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ghostspeak-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Production Deployment Pipeline

**Blue-Green Deployment Strategy**
```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  release:
    types: [published]

jobs:
  deploy-blue-green:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Blue Environment
        run: |
          # Deploy new version to blue environment
          kubectl apply -f k8s/production/blue/ --namespace=ghostspeak-production
          
          # Wait for blue deployment to be ready
          kubectl rollout status deployment/ghostspeak-api-blue --namespace=ghostspeak-production --timeout=600s
          
      - name: Run Smoke Tests
        run: |
          # Run comprehensive smoke tests against blue environment
          bun run test:smoke --endpoint=https://blue.api.ghostspeak.com
          
      - name: Switch Traffic to Blue
        if: success()
        run: |
          # Update service to point to blue deployment
          kubectl patch service ghostspeak-api-service --namespace=ghostspeak-production \
            --patch '{"spec":{"selector":{"version":"blue"}}}'
            
      - name: Verify Production Health
        run: |
          # Monitor production metrics for 5 minutes
          bun run monitor:production --duration=5m
          
      - name: Cleanup Green Environment
        if: success()
        run: |
          # Scale down green deployment
          kubectl scale deployment ghostspeak-api-green --replicas=0 --namespace=ghostspeak-production
```

## Database Management

### Migration Strategy

**1. Database Migrations**
```typescript
// migrations/001_initial_schema.ts
import { Migration } from '../src/db/migration';

export const migration: Migration = {
  name: '001_initial_schema',
  up: async (db) => {
    await db.query(`
      CREATE TABLE agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        public_key VARCHAR(44) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        capabilities JSONB NOT NULL DEFAULT '[]',
        reputation DECIMAL(3,2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX idx_agents_public_key ON agents(public_key);
      CREATE INDEX idx_agents_reputation ON agents(reputation);
    `);
  },
  down: async (db) => {
    await db.query('DROP TABLE IF EXISTS agents CASCADE;');
  }
};
```

**2. Migration Runner**
```typescript
// scripts/migrate.ts
import { DatabaseMigrator } from '../src/db/migrator';

async function runMigrations() {
  const migrator = new DatabaseMigrator();
  
  try {
    const pending = await migrator.getPendingMigrations();
    console.log(`Found ${pending.length} pending migrations`);
    
    for (const migration of pending) {
      console.log(`Running migration: ${migration.name}`);
      await migrator.runMigration(migration);
      console.log(`✅ Completed migration: ${migration.name}`);
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
```

### Backup Strategy

**Automated Database Backups**
```yaml
# k8s/production/backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: ghostspeak-production
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            command:
            - /bin/bash
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="ghostspeak_backup_${TIMESTAMP}.sql"
              
              pg_dump "${DATABASE_URL}" > "/backups/${BACKUP_FILE}"
              
              # Upload to S3
              aws s3 cp "/backups/${BACKUP_FILE}" "s3://ghostspeak-backups/database/"
              
              # Keep only last 30 days of local backups
              find /backups -name "*.sql" -mtime +30 -delete
            env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-secrets
                  key: url
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

## Monitoring Setup

### Prometheus Configuration

**Application Metrics**
```yaml
# monitoring/prometheus-config.yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ghostspeak-api'
    kubernetes_sd_configs:
    - role: pod
      namespaces:
        names:
        - ghostspeak-production
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
      action: replace
      target_label: __metrics_path__
      regex: (.+)

  - job_name: 'solana-metrics'
    static_configs:
    - targets: ['solana-rpc:8899']
    metrics_path: /metrics

rule_files:
  - "alert_rules.yml"

alerting:
  alertmanagers:
  - static_configs:
    - targets:
      - alertmanager:9093
```

**Alert Rules**
```yaml
# monitoring/alert-rules.yml
groups:
- name: ghostspeak.alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }} for {{ $labels.instance }}"

  - alert: HighMemoryUsage
    expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.9
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage"
      description: "Memory usage is {{ $value }} for {{ $labels.pod }}"

  - alert: DatabaseConnectionFailure
    expr: up{job="postgres"} == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Database connection failed"
      description: "Cannot connect to PostgreSQL database"
```

### Grafana Dashboards

**API Performance Dashboard**
```json
{
  "dashboard": {
    "title": "GhostSpeak API Performance",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{ method }} {{ status }}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "95th percentile"
          }
        ]
      },
      {
        "title": "Active Agents",
        "type": "stat",
        "targets": [
          {
            "expr": "ghostspeak_agents_active_total",
            "legendFormat": "Active Agents"
          }
        ]
      }
    ]
  }
}
```

## Security Considerations

### Network Security

**Network Policies**
```yaml
# k8s/security/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ghostspeak-network-policy
  namespace: ghostspeak-production
spec:
  podSelector:
    matchLabels:
      app: ghostspeak-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS outbound
    - protocol: TCP
      port: 8899  # Solana RPC
```

### Secret Management

**External Secrets Operator**
```yaml
# k8s/security/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: ghostspeak-secrets
  namespace: ghostspeak-production
spec:
  refreshInterval: 15s
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: production-secrets
    creationPolicy: Owner
  data:
  - secretKey: database-url
    remoteRef:
      key: ghostspeak/production
      property: database_url
  - secretKey: redis-url
    remoteRef:
      key: ghostspeak/production
      property: redis_url
  - secretKey: jwt-secret
    remoteRef:
      key: ghostspeak/production
      property: jwt_secret
```

## Disaster Recovery

### Backup and Recovery Plan

**1. Data Backup Strategy**
- **Database**: Daily full backups, hourly incrementals
- **File Storage**: Real-time replication to secondary region
- **Configuration**: Version controlled in Git
- **Secrets**: Encrypted backups in secure vault

**2. Recovery Procedures**
```bash
# Database Recovery
kubectl create job --from=cronjob/postgres-backup manual-backup
kubectl wait --for=condition=complete job/manual-backup --timeout=600s

# Restore from backup
kubectl run postgres-restore --image=postgres:15-alpine --rm -it -- \
  psql "${DATABASE_URL}" < backup.sql

# Application Recovery
kubectl rollout undo deployment/ghostspeak-api --namespace=ghostspeak-production
kubectl rollout status deployment/ghostspeak-api --namespace=ghostspeak-production
```

**3. Regional Failover**
```yaml
# Global Load Balancer Configuration
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: ghostspeak-ssl-cert
spec:
  domains:
    - api.ghostspeak.com
---
apiVersion: v1
kind: Service
metadata:
  name: ghostspeak-global-service
  annotations:
    cloud.google.com/global-access: "true"
spec:
  type: LoadBalancer
  loadBalancerClass: gce
  ports:
  - port: 80
    targetPort: 3000
  selector:
    app: ghostspeak-api
```

## Performance Optimization

### Caching Strategy

**Redis Configuration**
```yaml
# k8s/production/redis.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: ghostspeak-production
spec:
  serviceName: redis
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command:
        - redis-server
        - /etc/redis/redis.conf
        - --cluster-enabled
        - "yes"
        - --cluster-config-file
        - nodes.conf
        - --cluster-node-timeout
        - "5000"
        - --appendonly
        - "yes"
        volumeMounts:
        - name: redis-data
          mountPath: /data
        - name: redis-config
          mountPath: /etc/redis
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

### CDN Configuration

**CloudFlare Setup**
```yaml
# terraform/cloudflare.tf
resource "cloudflare_zone" "ghostspeak" {
  zone = "ghostspeak.com"
}

resource "cloudflare_record" "api" {
  zone_id = cloudflare_zone.ghostspeak.id
  name    = "api"
  value   = var.load_balancer_ip
  type    = "A"
  ttl     = 300
  proxied = true
}

resource "cloudflare_page_rule" "api_cache" {
  zone_id  = cloudflare_zone.ghostspeak.id
  target   = "api.ghostspeak.com/static/*"
  priority = 1

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 86400
  }
}
```

## Troubleshooting

### Common Deployment Issues

**Pod Startup Issues**
```bash
# Check pod status
kubectl get pods -n ghostspeak-production

# View pod logs
kubectl logs -f deployment/ghostspeak-api -n ghostspeak-production

# Describe pod for events
kubectl describe pod <pod-name> -n ghostspeak-production

# Check resource usage
kubectl top pods -n ghostspeak-production
```

**Network Connectivity Issues**
```bash
# Test internal service connectivity
kubectl exec -it deployment/ghostspeak-api -n ghostspeak-production -- wget -qO- http://postgres:5432

# Test external connectivity
kubectl exec -it deployment/ghostspeak-api -n ghostspeak-production -- wget -qO- https://api.devnet.solana.com/health

# Check DNS resolution
kubectl exec -it deployment/ghostspeak-api -n ghostspeak-production -- nslookup postgres
```

**Performance Debugging**
```bash
# Check resource limits
kubectl describe deployment ghostspeak-api -n ghostspeak-production

# Monitor real-time metrics
kubectl top pods -n ghostspeak-production --watch

# Check HPA status
kubectl describe hpa ghostspeak-api-hpa -n ghostspeak-production
```

## Useful Commands

### Deployment Commands
```bash
# Deploy to staging
kubectl apply -k k8s/staging/

# Deploy to production
kubectl apply -k k8s/production/

# Check deployment status
kubectl rollout status deployment/ghostspeak-api -n ghostspeak-production

# Scale deployment
kubectl scale deployment ghostspeak-api --replicas=10 -n ghostspeak-production

# Update image
kubectl set image deployment/ghostspeak-api api=ghostspeak/core:v1.1.0 -n ghostspeak-production
```

### Monitoring Commands
```bash
# Port forward to Grafana
kubectl port-forward svc/grafana 3000:3000 -n monitoring

# Port forward to Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n monitoring

# Check alerts
kubectl exec -it prometheus-0 -n monitoring -- promtool query instant 'up{job="ghostspeak-api"}'
```

### Backup Commands
```bash
# Trigger manual backup
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n ghostspeak-production

# List backups
aws s3 ls s3://ghostspeak-backups/database/

# Download backup
aws s3 cp s3://ghostspeak-backups/database/ghostspeak_backup_20240115_020000.sql ./
```

## Support

Need help with deployment?

- 📚 [Kubernetes Documentation](https://kubernetes.io/docs/)
- 🔧 [Troubleshooting Guide](./troubleshooting.md)
- 💬 [DevOps Discord](https://discord.gg/ghostspeak-devops)
- 📧 [Infrastructure Support](mailto:infra-support@ghostspeak.com)
- 🐛 [Report Issues](https://github.com/ghostspeak/core/issues) 