pub mod metrics;
pub mod dashboard;
pub mod alerts;

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};

use crate::{
    client::PodAIClient,
    errors::{PodAIError, PodAIResult},
};

/// Performance monitoring configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitoringConfig {
    /// Enable performance metrics collection
    pub enable_metrics: bool,
    /// Enable real-time dashboard
    pub enable_dashboard: bool,
    /// Enable alerting system
    pub enable_alerts: bool,
    /// Metrics retention period in hours
    pub retention_hours: u32,
    /// Sampling rate for transactions (0.0 to 1.0)
    pub sampling_rate: f64,
    /// Dashboard update interval in seconds
    pub dashboard_update_interval_secs: u64,
    /// Alert thresholds
    pub alert_thresholds: AlertThresholds,
}

impl Default for MonitoringConfig {
    fn default() -> Self {
        Self {
            enable_metrics: true,
            enable_dashboard: true,
            enable_alerts: true,
            retention_hours: 24,
            sampling_rate: 1.0, // Monitor all transactions by default
            dashboard_update_interval_secs: 5,
            alert_thresholds: AlertThresholds::default(),
        }
    }
}

/// Alert thresholds configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertThresholds {
    /// Maximum allowed error rate (0.0 to 1.0)
    pub max_error_rate: f64,
    /// Maximum allowed average transaction time in milliseconds
    pub max_avg_transaction_time_ms: u64,
    /// Maximum allowed RPC failure rate
    pub max_rpc_failure_rate: f64,
    /// Minimum required transactions per minute
    pub min_transactions_per_minute: u32,
}

impl Default for AlertThresholds {
    fn default() -> Self {
        Self {
            max_error_rate: 0.05, // 5%
            max_avg_transaction_time_ms: 10_000, // 10 seconds
            max_rpc_failure_rate: 0.1, // 10%
            min_transactions_per_minute: 1,
        }
    }
}

/// Main performance monitor
pub struct PerformanceMonitor {
    config: MonitoringConfig,
    client: Arc<PodAIClient>,
    metrics: Arc<RwLock<MetricsStore>>,
    dashboard: Option<Dashboard>,
    alert_manager: Option<AlertManager>,
}

impl PerformanceMonitor {
    /// Create a new performance monitor
    pub fn new(client: Arc<PodAIClient>, config: Option<MonitoringConfig>) -> Self {
        let config = config.unwrap_or_default();
        
        let dashboard = if config.enable_dashboard {
            Some(Dashboard::new(config.dashboard_update_interval_secs))
        } else {
            None
        };

        let alert_manager = if config.enable_alerts {
            Some(AlertManager::new(config.alert_thresholds.clone()))
        } else {
            None
        };

        Self {
            metrics: Arc::new(RwLock::new(MetricsStore::new(config.retention_hours))),
            client,
            config,
            dashboard,
            alert_manager,
        }
    }

    /// Start the monitoring system
    pub async fn start(&mut self) -> PodAIResult<()> {
        info!("Starting performance monitor");

        // Start dashboard if enabled
        if let Some(ref mut dashboard) = self.dashboard {
            dashboard.start(self.metrics.clone()).await?;
        }

        // Start alert manager if enabled
        if let Some(ref mut alert_manager) = self.alert_manager {
            alert_manager.start(self.metrics.clone()).await?;
        }

        info!("Performance monitor started successfully");
        Ok(())
    }

    /// Record a transaction metric
    pub async fn record_transaction(
        &self,
        operation_type: &str,
        duration: Duration,
        success: bool,
        compute_units: Option<u64>,
        fee_paid: Option<u64>,
    ) {
        if !self.config.enable_metrics {
            return;
        }

        // Apply sampling
        if fastrand::f64() > self.config.sampling_rate {
            return;
        }

        let metric = TransactionMetric {
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            operation_type: operation_type.to_string(),
            duration_ms: duration.as_millis() as u64,
            success,
            compute_units,
            fee_paid,
        };

        let mut metrics = self.metrics.write().await;
        metrics.add_transaction_metric(metric);
    }

    /// Record an RPC call metric
    pub async fn record_rpc_call(
        &self,
        method: &str,
        duration: Duration,
        success: bool,
        response_size: Option<usize>,
    ) {
        if !self.config.enable_metrics {
            return;
        }

        let metric = RpcMetric {
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            method: method.to_string(),
            duration_ms: duration.as_millis() as u64,
            success,
            response_size,
        };

        let mut metrics = self.metrics.write().await;
        metrics.add_rpc_metric(metric);
    }

    /// Get current performance summary
    pub async fn get_performance_summary(&self) -> PerformanceSummary {
        let metrics = self.metrics.read().await;
        metrics.generate_summary()
    }

    /// Get detailed metrics for a time range
    pub async fn get_metrics_for_range(
        &self,
        start_time: u64,
        end_time: u64,
    ) -> MetricsSnapshot {
        let metrics = self.metrics.read().await;
        metrics.get_snapshot_for_range(start_time, end_time)
    }

    /// Check if system is healthy based on current metrics
    pub async fn health_check(&self) -> HealthStatus {
        let summary = self.get_performance_summary().await;
        
        let mut issues = Vec::new();
        let thresholds = &self.config.alert_thresholds;

        // Check error rate
        if summary.error_rate > thresholds.max_error_rate {
            issues.push(format!(
                "High error rate: {:.2}% (threshold: {:.2}%)",
                summary.error_rate * 100.0,
                thresholds.max_error_rate * 100.0
            ));
        }

        // Check average transaction time
        if summary.avg_transaction_time_ms > thresholds.max_avg_transaction_time_ms {
            issues.push(format!(
                "High average transaction time: {}ms (threshold: {}ms)",
                summary.avg_transaction_time_ms,
                thresholds.max_avg_transaction_time_ms
            ));
        }

        // Check RPC failure rate
        if summary.rpc_failure_rate > thresholds.max_rpc_failure_rate {
            issues.push(format!(
                "High RPC failure rate: {:.2}% (threshold: {:.2}%)",
                summary.rpc_failure_rate * 100.0,
                thresholds.max_rpc_failure_rate * 100.0
            ));
        }

        let status = if issues.is_empty() {
            HealthStatusLevel::Healthy
        } else if issues.len() <= 2 {
            HealthStatusLevel::Warning
        } else {
            HealthStatusLevel::Critical
        };

        HealthStatus {
            status,
            issues,
            summary,
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        }
    }
}

/// Transaction performance metric
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionMetric {
    pub timestamp: u64,
    pub operation_type: String,
    pub duration_ms: u64,
    pub success: bool,
    pub compute_units: Option<u64>,
    pub fee_paid: Option<u64>,
}

/// RPC call metric
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RpcMetric {
    pub timestamp: u64,
    pub method: String,
    pub duration_ms: u64,
    pub success: bool,
    pub response_size: Option<usize>,
}

/// Performance summary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSummary {
    pub total_transactions: u64,
    pub successful_transactions: u64,
    pub error_rate: f64,
    pub avg_transaction_time_ms: u64,
    pub min_transaction_time_ms: u64,
    pub max_transaction_time_ms: u64,
    pub total_rpc_calls: u64,
    pub successful_rpc_calls: u64,
    pub rpc_failure_rate: f64,
    pub avg_rpc_time_ms: u64,
    pub transactions_per_minute: f64,
    pub total_compute_units: u64,
    pub total_fees_paid: u64,
    pub most_common_operations: Vec<(String, u64)>,
}

/// Metrics snapshot for a time range
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetricsSnapshot {
    pub start_time: u64,
    pub end_time: u64,
    pub transaction_metrics: Vec<TransactionMetric>,
    pub rpc_metrics: Vec<RpcMetric>,
    pub summary: PerformanceSummary,
}

/// Health status of the system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthStatus {
    pub status: HealthStatusLevel,
    pub issues: Vec<String>,
    pub summary: PerformanceSummary,
    pub timestamp: u64,
}

/// Health status levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum HealthStatusLevel {
    Healthy,
    Warning,
    Critical,
}

/// Metrics storage
struct MetricsStore {
    transaction_metrics: Vec<TransactionMetric>,
    rpc_metrics: Vec<RpcMetric>,
    retention_hours: u32,
}

impl MetricsStore {
    fn new(retention_hours: u32) -> Self {
        Self {
            transaction_metrics: Vec::new(),
            rpc_metrics: Vec::new(),
            retention_hours,
        }
    }

    fn add_transaction_metric(&mut self, metric: TransactionMetric) {
        self.transaction_metrics.push(metric);
        self.cleanup_old_metrics();
    }

    fn add_rpc_metric(&mut self, metric: RpcMetric) {
        self.rpc_metrics.push(metric);
        self.cleanup_old_metrics();
    }

    fn cleanup_old_metrics(&mut self) {
        let cutoff_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64
            - (self.retention_hours as u64 * 3600 * 1000);

        self.transaction_metrics.retain(|m| m.timestamp > cutoff_time);
        self.rpc_metrics.retain(|m| m.timestamp > cutoff_time);
    }

    fn generate_summary(&self) -> PerformanceSummary {
        let total_transactions = self.transaction_metrics.len() as u64;
        let successful_transactions = self.transaction_metrics.iter()
            .filter(|m| m.success)
            .count() as u64;

        let error_rate = if total_transactions > 0 {
            1.0 - (successful_transactions as f64 / total_transactions as f64)
        } else {
            0.0
        };

        let avg_transaction_time_ms = if total_transactions > 0 {
            self.transaction_metrics.iter()
                .map(|m| m.duration_ms)
                .sum::<u64>() / total_transactions
        } else {
            0
        };

        let min_transaction_time_ms = self.transaction_metrics.iter()
            .map(|m| m.duration_ms)
            .min()
            .unwrap_or(0);

        let max_transaction_time_ms = self.transaction_metrics.iter()
            .map(|m| m.duration_ms)
            .max()
            .unwrap_or(0);

        let total_rpc_calls = self.rpc_metrics.len() as u64;
        let successful_rpc_calls = self.rpc_metrics.iter()
            .filter(|m| m.success)
            .count() as u64;

        let rpc_failure_rate = if total_rpc_calls > 0 {
            1.0 - (successful_rpc_calls as f64 / total_rpc_calls as f64)
        } else {
            0.0
        };

        let avg_rpc_time_ms = if total_rpc_calls > 0 {
            self.rpc_metrics.iter()
                .map(|m| m.duration_ms)
                .sum::<u64>() / total_rpc_calls
        } else {
            0
        };

        // Calculate transactions per minute
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let one_minute_ago = now - 60_000;
        let recent_transactions = self.transaction_metrics.iter()
            .filter(|m| m.timestamp > one_minute_ago)
            .count() as f64;

        let total_compute_units = self.transaction_metrics.iter()
            .filter_map(|m| m.compute_units)
            .sum();

        let total_fees_paid = self.transaction_metrics.iter()
            .filter_map(|m| m.fee_paid)
            .sum();

        // Most common operations
        let mut operation_counts: HashMap<String, u64> = HashMap::new();
        for metric in &self.transaction_metrics {
            *operation_counts.entry(metric.operation_type.clone()).or_insert(0) += 1;
        }
        let mut most_common_operations: Vec<(String, u64)> = operation_counts.into_iter().collect();
        most_common_operations.sort_by(|a, b| b.1.cmp(&a.1));
        most_common_operations.truncate(5);

        PerformanceSummary {
            total_transactions,
            successful_transactions,
            error_rate,
            avg_transaction_time_ms,
            min_transaction_time_ms,
            max_transaction_time_ms,
            total_rpc_calls,
            successful_rpc_calls,
            rpc_failure_rate,
            avg_rpc_time_ms,
            transactions_per_minute: recent_transactions,
            total_compute_units,
            total_fees_paid,
            most_common_operations,
        }
    }

    fn get_snapshot_for_range(&self, start_time: u64, end_time: u64) -> MetricsSnapshot {
        let transaction_metrics: Vec<TransactionMetric> = self.transaction_metrics.iter()
            .filter(|m| m.timestamp >= start_time && m.timestamp <= end_time)
            .cloned()
            .collect();

        let rpc_metrics: Vec<RpcMetric> = self.rpc_metrics.iter()
            .filter(|m| m.timestamp >= start_time && m.timestamp <= end_time)
            .cloned()
            .collect();

        // Generate summary for this time range
        let summary = self.generate_summary(); // For simplicity, using overall summary

        MetricsSnapshot {
            start_time,
            end_time,
            transaction_metrics,
            rpc_metrics,
            summary,
        }
    }
}

/// Real-time dashboard
pub struct Dashboard {
    update_interval: Duration,
}

impl Dashboard {
    fn new(update_interval_secs: u64) -> Self {
        Self {
            update_interval: Duration::from_secs(update_interval_secs),
        }
    }

    async fn start(&mut self, metrics: Arc<RwLock<MetricsStore>>) -> PodAIResult<()> {
        info!("Starting performance dashboard");

        let metrics_clone = metrics.clone();
        let update_interval = self.update_interval;

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(update_interval);
            
            loop {
                interval.tick().await;
                
                let metrics_guard = metrics_clone.read().await;
                let summary = metrics_guard.generate_summary();
                drop(metrics_guard);

                // Log performance summary
                info!(
                    "Performance Dashboard - TPS: {:.1}, Error Rate: {:.2}%, Avg Time: {}ms, RPC Failures: {:.2}%",
                    summary.transactions_per_minute,
                    summary.error_rate * 100.0,
                    summary.avg_transaction_time_ms,
                    summary.rpc_failure_rate * 100.0
                );

                // In a real implementation, this would update a web dashboard
                // or send metrics to a monitoring service like Prometheus/Grafana
            }
        });

        Ok(())
    }
}

/// Alert manager
pub struct AlertManager {
    thresholds: AlertThresholds,
}

impl AlertManager {
    fn new(thresholds: AlertThresholds) -> Self {
        Self { thresholds }
    }

    async fn start(&mut self, metrics: Arc<RwLock<MetricsStore>>) -> PodAIResult<()> {
        info!("Starting alert manager");

        let metrics_clone = metrics.clone();
        let thresholds = self.thresholds.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(Duration::from_secs(30));
            
            loop {
                interval.tick().await;
                
                let metrics_guard = metrics_clone.read().await;
                let summary = metrics_guard.generate_summary();
                drop(metrics_guard);

                // Check thresholds and generate alerts
                if summary.error_rate > thresholds.max_error_rate {
                    warn!(
                        "ALERT: High error rate detected: {:.2}% (threshold: {:.2}%)",
                        summary.error_rate * 100.0,
                        thresholds.max_error_rate * 100.0
                    );
                }

                if summary.avg_transaction_time_ms > thresholds.max_avg_transaction_time_ms {
                    warn!(
                        "ALERT: High transaction latency: {}ms (threshold: {}ms)",
                        summary.avg_transaction_time_ms,
                        thresholds.max_avg_transaction_time_ms
                    );
                }

                if summary.rpc_failure_rate > thresholds.max_rpc_failure_rate {
                    warn!(
                        "ALERT: High RPC failure rate: {:.2}% (threshold: {:.2}%)",
                        summary.rpc_failure_rate * 100.0,
                        thresholds.max_rpc_failure_rate * 100.0
                    );
                }

                if summary.transactions_per_minute < thresholds.min_transactions_per_minute as f64 {
                    warn!(
                        "ALERT: Low transaction volume: {:.1} TPS (threshold: {} TPS)",
                        summary.transactions_per_minute,
                        thresholds.min_transactions_per_minute
                    );
                }
            }
        });

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    #[test]
    fn test_metrics_store_creation() {
        let store = MetricsStore::new(24);
        assert_eq!(store.retention_hours, 24);
        assert_eq!(store.transaction_metrics.len(), 0);
        assert_eq!(store.rpc_metrics.len(), 0);
    }

    #[test]
    fn test_performance_summary_generation() {
        let mut store = MetricsStore::new(24);
        
        // Add some test metrics
        store.add_transaction_metric(TransactionMetric {
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis() as u64,
            operation_type: "register_agent".to_string(),
            duration_ms: 1000,
            success: true,
            compute_units: Some(50000),
            fee_paid: Some(5000),
        });

        let summary = store.generate_summary();
        assert_eq!(summary.total_transactions, 1);
        assert_eq!(summary.successful_transactions, 1);
        assert_eq!(summary.error_rate, 0.0);
        assert_eq!(summary.avg_transaction_time_ms, 1000);
    }

    #[tokio::test]
    async fn test_performance_monitor_creation() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let monitor = PerformanceMonitor::new(client, None);
        
        assert!(monitor.config.enable_metrics);
        assert!(monitor.config.enable_dashboard);
        assert!(monitor.config.enable_alerts);
    }

    #[tokio::test]
    async fn test_health_check() {
        let client = Arc::new(PodAIClient::devnet().await.unwrap());
        let monitor = PerformanceMonitor::new(client, None);
        
        let health = monitor.health_check().await;
        assert_eq!(health.status, HealthStatusLevel::Healthy);
        assert!(health.issues.is_empty());
    }
} 