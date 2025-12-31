# GhostSpeak Load Testing

This directory contains k6 load tests for the GhostSpeak platform.

## Installation

### macOS
```bash
brew install k6
```

### Linux
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Windows
```powershell
choco install k6
```

Or download from: https://k6.io/docs/getting-started/installation/

## Test Files

### 1. b2b-api.js
Tests the B2B API endpoints with realistic production load.

**Scenarios:**
- 100 concurrent users
- 1000+ requests/minute for 5 minutes
- Mix of /verify, /agents/:address/score, and /agents endpoints
- Target: 95th percentile latency < 500ms

**Usage:**
```bash
# Test against local development
k6 run b2b-api.js

# Test against staging with custom API key
API_KEY=your_test_api_key \
API_BASE_URL=https://staging.ghostspeak.io \
TEST_AGENT_ADDRESS=YourTestAgentAddress123... \
k6 run b2b-api.js

# Run with custom thresholds
k6 run --vus 50 --duration 2m b2b-api.js
```

### 2. ghost-score.js
Simulates real users browsing the Ghost Score B2C application.

**Scenarios:**
- 50 concurrent users
- Browse homepage, search agents, view details
- Freemium verification attempts
- Target: 95th percentile latency < 1000ms

**Usage:**
```bash
# Test against local development
k6 run ghost-score.js

# Test against staging
APP_BASE_URL=https://staging.ghostspeak.io \
k6 run ghost-score.js
```

### 3. payai-webhook.js
Tests high-volume PayAI webhook processing and blockchain writes.

**Scenarios:**
- 500 webhooks/minute
- Mix of payment.succeeded and payment.failed events
- Verify all successful webhooks trigger blockchain transactions
- Target: < 1% error rate

**Usage:**
```bash
# Test against local webhook endpoint
k6 run payai-webhook.js

# Test against staging
WEBHOOK_URL=https://staging.ghostspeak.io/api/payai/webhook \
PAYAI_SECRET=your_webhook_secret \
k6 run payai-webhook.js
```

## Running All Tests

```bash
# Run all load tests in sequence
for test in b2b-api.js ghost-score.js payai-webhook.js; do
  echo "Running $test..."
  k6 run $test
  sleep 10  # Cool down between tests
done
```

## Understanding Results

### Key Metrics

- **http_req_duration**: How long requests take (p95 = 95th percentile)
- **http_req_failed**: Percentage of failed requests
- **errors**: Custom error rate from our checks
- **requests**: Total number of HTTP requests made

### Thresholds

Tests will FAIL if:
- 95th percentile latency exceeds target
- Error rate exceeds 5% (1% for webhooks)
- Any custom threshold is not met

### Example Output

```
✓ b2b-api: 95th percentile latency < 500ms
✓ b2b-api: Error rate < 5%
✓ score: has ghostScore

http_req_duration..........: avg=234ms p(95)=456ms
http_req_failed............: 0.12% ✓ 12 ✗ 9988
iterations.................: 10000 (333.33/s)
```

## Load Test Best Practices

### 1. Never Test Production
- Use staging/development environments
- Set up dedicated load test environment
- Use test data only

### 2. Gradual Ramp-Up
- Start with low load
- Gradually increase to target
- Monitor system metrics

### 3. Monitor During Tests
- Watch server CPU, memory, disk I/O
- Monitor database connections
- Check Solana RPC rate limits
- Watch Convex function quotas

### 4. Cleanup After Tests
- Remove test data
- Clear caches
- Reset rate limiters

## Interpreting Results

### Successful Test
```
✓ All thresholds passed
✓ p95 latency under target
✓ Error rate acceptable
✓ No timeouts or connection errors
```

### Failed Test - High Latency
**Symptoms:** p95 > 500ms but no errors

**Possible Causes:**
- Database queries not optimized
- Solana RPC slow responses
- Missing indexes in Convex
- CPU throttling

**Solutions:**
- Add database indexes
- Implement caching
- Use faster RPC endpoint
- Scale horizontally

### Failed Test - High Error Rate
**Symptoms:** > 5% requests failing

**Possible Causes:**
- Rate limiting too aggressive
- Database connection pool exhausted
- Solana RPC rate limits hit
- Memory leaks

**Solutions:**
- Increase rate limits for test traffic
- Increase connection pool size
- Use dedicated RPC endpoint
- Fix memory leaks

### Failed Test - Timeouts
**Symptoms:** Requests timing out

**Possible Causes:**
- Blockchain transaction confirmation delays
- Webhook processing too slow
- Database locks/deadlocks
- Network issues

**Solutions:**
- Implement async processing
- Add request timeouts
- Optimize database queries
- Check network connectivity

## Advanced Usage

### Custom Test Duration
```bash
k6 run --vus 100 --duration 10m b2b-api.js
```

### Output to File
```bash
k6 run --out json=results.json b2b-api.js
```

### Cloud Execution (k6 Cloud)
```bash
k6 cloud b2b-api.js
```

### With Grafana
```bash
k6 run --out influxdb=http://localhost:8086/k6 b2b-api.js
```

## Troubleshooting

### "Connection refused"
- Ensure the server is running
- Check the BASE_URL is correct
- Verify firewall settings

### "Too many open files"
- Increase system file descriptor limit:
  ```bash
  ulimit -n 10000
  ```

### "Rate limit exceeded"
- Use test API keys with higher limits
- Reduce VU count
- Increase ramp-up time

## Next Steps

After successful load tests:

1. Document results in LOAD_TEST_RESULTS.md
2. Identify and fix performance bottlenecks
3. Set up continuous load testing in CI/CD
4. Establish performance baselines
5. Create alerts for production metrics
