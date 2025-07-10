/*!
 * Performance Testing Framework
 * 
 * Comprehensive performance testing and regression detection system for the GhostSpeak Protocol.
 * This module provides tools for monitoring, testing, and optimizing smart contract performance.
 */

use anchor_lang::prelude::*;
use std::collections::HashMap;

// =====================================================
// PERFORMANCE TESTING FRAMEWORK
// =====================================================

/// Performance test configuration
#[derive(Debug, Clone)]
pub struct PerformanceTestConfig {
    pub instruction_name: String,
    pub expected_compute_units: u32,
    pub max_compute_units: u32,
    pub expected_execution_time_us: u64,
    pub max_execution_time_us: u64,
    pub account_count: u32,
    pub transaction_size_limit: usize,
}

impl PerformanceTestConfig {
    pub fn new(instruction_name: &str) -> Self {
        Self {
            instruction_name: instruction_name.to_string(),
            expected_compute_units: 25_000,
            max_compute_units: 50_000,
            expected_execution_time_us: 1_000,
            max_execution_time_us: 5_000,
            account_count: 3,
            transaction_size_limit: 1232, // Solana transaction size limit
        }
    }
    
    pub fn with_compute_budget(mut self, expected: u32, max: u32) -> Self {
        self.expected_compute_units = expected;
        self.max_compute_units = max;
        self
    }
    
    pub fn with_time_budget(mut self, expected_us: u64, max_us: u64) -> Self {
        self.expected_execution_time_us = expected_us;
        self.max_execution_time_us = max_us;
        self
    }
    
    pub fn with_accounts(mut self, count: u32) -> Self {
        self.account_count = count;
        self
    }
}

/// Performance test result
#[derive(Debug, Clone)]
pub struct PerformanceTestResult {
    pub instruction_name: String,
    pub actual_compute_units: u32,
    pub actual_execution_time_us: u64,
    pub actual_transaction_size: usize,
    pub efficiency_score: f64,
    pub passed: bool,
    pub issues: Vec<String>,
    pub timestamp: i64,
}

impl PerformanceTestResult {
    pub fn new(instruction_name: String) -> Self {
        Self {
            instruction_name,
            actual_compute_units: 0,
            actual_execution_time_us: 0,
            actual_transaction_size: 0,
            efficiency_score: 0.0,
            passed: false,
            issues: Vec::new(),
            timestamp: 0,
        }
    }
    
    pub fn add_issue(&mut self, issue: String) {
        self.issues.push(issue);
        self.passed = false;
    }
    
    pub fn calculate_efficiency(&mut self, expected_compute: u32) {
        if expected_compute > 0 {
            self.efficiency_score = (expected_compute as f64 / self.actual_compute_units as f64) * 100.0;
        }
    }
}

/// Performance regression detector
pub struct RegressionDetector {
    pub baseline_results: HashMap<String, PerformanceTestResult>,
    pub regression_threshold: f64, // Percentage threshold for regression detection
}

impl RegressionDetector {
    pub fn new() -> Self {
        Self {
            baseline_results: HashMap::new(),
            regression_threshold: 20.0, // 20% regression threshold
        }
    }
    
    pub fn set_baseline(&mut self, result: PerformanceTestResult) {
        self.baseline_results.insert(result.instruction_name.clone(), result);
    }
    
    pub fn detect_regression(&self, current_result: &PerformanceTestResult) -> Option<String> {
        if let Some(baseline) = self.baseline_results.get(&current_result.instruction_name) {
            // Check compute unit regression
            let compute_regression = ((current_result.actual_compute_units as f64 - baseline.actual_compute_units as f64) 
                                    / baseline.actual_compute_units as f64) * 100.0;
            
            // Check execution time regression
            let time_regression = ((current_result.actual_execution_time_us as f64 - baseline.actual_execution_time_us as f64) 
                                 / baseline.actual_execution_time_us as f64) * 100.0;
            
            if compute_regression > self.regression_threshold {
                return Some(format!(
                    "COMPUTE REGRESSION: {} increased by {:.2}% (from {} to {} CU)",
                    current_result.instruction_name,
                    compute_regression,
                    baseline.actual_compute_units,
                    current_result.actual_compute_units
                ));
            }
            
            if time_regression > self.regression_threshold {
                return Some(format!(
                    "TIME REGRESSION: {} increased by {:.2}% (from {}us to {}us)",
                    current_result.instruction_name,
                    time_regression,
                    baseline.actual_execution_time_us,
                    current_result.actual_execution_time_us
                ));
            }
        }
        None
    }
}

/// Performance test suite
pub struct PerformanceTestSuite {
    pub tests: Vec<PerformanceTestConfig>,
    pub results: Vec<PerformanceTestResult>,
    pub regression_detector: RegressionDetector,
}

impl PerformanceTestSuite {
    pub fn new() -> Self {
        Self {
            tests: Vec::new(),
            results: Vec::new(),
            regression_detector: RegressionDetector::new(),
        }
    }
    
    pub fn add_test(&mut self, config: PerformanceTestConfig) {
        self.tests.push(config);
    }
    
    pub fn run_test(&mut self, config: &PerformanceTestConfig, actual_metrics: PerformanceMetrics) -> PerformanceTestResult {
        let mut result = PerformanceTestResult::new(config.instruction_name.clone());
        result.actual_compute_units = actual_metrics.compute_units_used as u32;
        result.actual_execution_time_us = actual_metrics.execution_time_us;
        result.actual_transaction_size = actual_metrics.transaction_size;
        result.timestamp = Clock::get().unwrap().unix_timestamp;
        
        // Calculate efficiency
        result.calculate_efficiency(config.expected_compute_units);
        
        // Check performance criteria
        result.passed = true;
        
        if result.actual_compute_units > config.max_compute_units {
            result.add_issue(format!(\n                \"Compute units exceeded: {} > {} (max)\",\n                result.actual_compute_units, config.max_compute_units\n            ));\n        }\n        \n        if result.actual_execution_time_us > config.max_execution_time_us {\n            result.add_issue(format!(\n                \"Execution time exceeded: {}us > {}us (max)\",\n                result.actual_execution_time_us, config.max_execution_time_us\n            ));\n        }\n        \n        if result.actual_transaction_size > config.transaction_size_limit {\n            result.add_issue(format!(\n                \"Transaction size exceeded: {} > {} bytes (max)\",\n                result.actual_transaction_size, config.transaction_size_limit\n            ));\n        }\n        \n        if result.efficiency_score < 70.0 {\n            result.add_issue(format!(\n                \"Low efficiency: {:.2}% (expected > 70%)\",\n                result.efficiency_score\n            ));\n        }\n        \n        // Check for regressions\n        if let Some(regression) = self.regression_detector.detect_regression(&result) {\n            result.add_issue(regression);\n        }\n        \n        result\n    }\n    \n    pub fn run_all_tests(&mut self, metrics_by_instruction: HashMap<String, PerformanceMetrics>) {\n        for config in &self.tests.clone() {\n            if let Some(metrics) = metrics_by_instruction.get(&config.instruction_name) {\n                let result = self.run_test(config, metrics.clone());\n                self.results.push(result);\n            }\n        }\n    }\n    \n    pub fn generate_report(&self) -> String {\n        let mut report = String::from(\"\\n=== PERFORMANCE TEST REPORT ===\\n\");\n        \n        let passed_count = self.results.iter().filter(|r| r.passed).count();\n        let total_count = self.results.len();\n        \n        report.push_str(&format!(\"Tests Passed: {}/{} ({:.1}%)\\n\\n\", \n                                passed_count, total_count, \n                                (passed_count as f64 / total_count as f64) * 100.0));\n        \n        for result in &self.results {\n            report.push_str(&format!(\"[{}] {}\\n\", \n                                    if result.passed { \"PASS\" } else { \"FAIL\" },\n                                    result.instruction_name));\n            report.push_str(&format!(\"  Compute Units: {} (efficiency: {:.1}%)\\n\", \n                                    result.actual_compute_units, result.efficiency_score));\n            report.push_str(&format!(\"  Execution Time: {}us\\n\", result.actual_execution_time_us));\n            report.push_str(&format!(\"  Transaction Size: {} bytes\\n\", result.actual_transaction_size));\n            \n            if !result.issues.is_empty() {\n                report.push_str(\"  Issues:\\n\");\n                for issue in &result.issues {\n                    report.push_str(&format!(\"    - {}\\n\", issue));\n                }\n            }\n            report.push_str(\"\\n\");\n        }\n        \n        report\n    }\n    \n    pub fn get_worst_performing(&self, count: usize) -> Vec<&PerformanceTestResult> {\n        let mut sorted_results: Vec<&PerformanceTestResult> = self.results.iter().collect();\n        sorted_results.sort_by(|a, b| a.efficiency_score.partial_cmp(&b.efficiency_score).unwrap());\n        sorted_results.into_iter().take(count).collect()\n    }\n}\n\n// =====================================================\n// PERFORMANCE METRICS COLLECTION\n// =====================================================\n\n#[derive(Debug, Clone)]\npub struct PerformanceMetrics {\n    pub instruction_name: String,\n    pub compute_units_used: u64,\n    pub execution_time_us: u64,\n    pub transaction_size: usize,\n    pub accounts_loaded: u32,\n    pub heap_usage: usize,\n}\n\nimpl PerformanceMetrics {\n    pub fn new(instruction_name: String) -> Self {\n        Self {\n            instruction_name,\n            compute_units_used: 0,\n            execution_time_us: 0,\n            transaction_size: 0,\n            accounts_loaded: 0,\n            heap_usage: 0,\n        }\n    }\n}\n\n/// Performance metrics collector\npub struct MetricsCollector {\n    pub metrics: HashMap<String, PerformanceMetrics>,\n    pub collection_enabled: bool,\n}\n\nimpl MetricsCollector {\n    pub fn new() -> Self {\n        Self {\n            metrics: HashMap::new(),\n            collection_enabled: true,\n        }\n    }\n    \n    pub fn start_measurement(&mut self, instruction_name: &str) -> PerformanceMetrics {\n        if self.collection_enabled {\n            PerformanceMetrics::new(instruction_name.to_string())\n        } else {\n            PerformanceMetrics::new(\"disabled\".to_string())\n        }\n    }\n    \n    pub fn end_measurement(&mut self, mut metrics: PerformanceMetrics) {\n        if self.collection_enabled {\n            self.metrics.insert(metrics.instruction_name.clone(), metrics);\n        }\n    }\n    \n    pub fn get_metrics(&self, instruction_name: &str) -> Option<&PerformanceMetrics> {\n        self.metrics.get(instruction_name)\n    }\n    \n    pub fn clear_metrics(&mut self) {\n        self.metrics.clear();\n    }\n}\n\n// =====================================================\n// BENCHMARKING UTILITIES\n// =====================================================\n\n/// Benchmark configuration for stress testing\npub struct BenchmarkConfig {\n    pub instruction_name: String,\n    pub iterations: u32,\n    pub concurrent_operations: u32,\n    pub data_size_variants: Vec<usize>,\n}\n\nimpl BenchmarkConfig {\n    pub fn new(instruction_name: &str) -> Self {\n        Self {\n            instruction_name: instruction_name.to_string(),\n            iterations: 100,\n            concurrent_operations: 1,\n            data_size_variants: vec![256, 512, 1024],\n        }\n    }\n}\n\n/// Benchmark results\n#[derive(Debug)]\npub struct BenchmarkResult {\n    pub instruction_name: String,\n    pub iterations: u32,\n    pub average_compute_units: f64,\n    pub min_compute_units: u32,\n    pub max_compute_units: u32,\n    pub average_execution_time_us: f64,\n    pub min_execution_time_us: u64,\n    pub max_execution_time_us: u64,\n    pub throughput_ops_per_second: f64,\n    pub success_rate: f64,\n}\n\n/// Stress testing framework\npub struct StressTester {\n    pub configs: Vec<BenchmarkConfig>,\n    pub results: Vec<BenchmarkResult>,\n}\n\nimpl StressTester {\n    pub fn new() -> Self {\n        Self {\n            configs: Vec::new(),\n            results: Vec::new(),\n        }\n    }\n    \n    pub fn add_benchmark(&mut self, config: BenchmarkConfig) {\n        self.configs.push(config);\n    }\n    \n    // Note: In a real implementation, this would run actual stress tests\n    pub fn run_stress_test(&mut self, config: &BenchmarkConfig) -> BenchmarkResult {\n        // Placeholder implementation - would be replaced with actual stress testing logic\n        BenchmarkResult {\n            instruction_name: config.instruction_name.clone(),\n            iterations: config.iterations,\n            average_compute_units: 25000.0,\n            min_compute_units: 20000,\n            max_compute_units: 30000,\n            average_execution_time_us: 1500.0,\n            min_execution_time_us: 1000,\n            max_execution_time_us: 2000,\n            throughput_ops_per_second: 666.0,\n            success_rate: 100.0,\n        }\n    }\n}\n\n// =====================================================\n// PERFORMANCE OPTIMIZATION RECOMMENDATIONS\n// =====================================================\n\n/// Performance optimization recommendation\n#[derive(Debug, Clone)]\npub struct OptimizationRecommendation {\n    pub instruction_name: String,\n    pub issue_type: String,\n    pub current_value: f64,\n    pub recommended_value: f64,\n    pub optimization_strategy: String,\n    pub estimated_improvement: f64,\n    pub implementation_difficulty: u8, // 1-10 scale\n}\n\n/// Performance analyzer that generates optimization recommendations\npub struct PerformanceAnalyzer;\n\nimpl PerformanceAnalyzer {\n    pub fn analyze_results(results: &[PerformanceTestResult]) -> Vec<OptimizationRecommendation> {\n        let mut recommendations = Vec::new();\n        \n        for result in results {\n            // Analyze compute unit efficiency\n            if result.efficiency_score < 80.0 {\n                recommendations.push(OptimizationRecommendation {\n                    instruction_name: result.instruction_name.clone(),\n                    issue_type: \"Low Compute Efficiency\".to_string(),\n                    current_value: result.efficiency_score,\n                    recommended_value: 85.0,\n                    optimization_strategy: \"Reduce unnecessary computations, optimize account access patterns\".to_string(),\n                    estimated_improvement: 85.0 - result.efficiency_score,\n                    implementation_difficulty: 6,\n                });\n            }\n            \n            // Analyze execution time\n            if result.actual_execution_time_us > 3000 {\n                recommendations.push(OptimizationRecommendation {\n                    instruction_name: result.instruction_name.clone(),\n                    issue_type: \"High Execution Time\".to_string(),\n                    current_value: result.actual_execution_time_us as f64,\n                    recommended_value: 2000.0,\n                    optimization_strategy: \"Implement async operations, reduce blocking calls\".to_string(),\n                    estimated_improvement: ((result.actual_execution_time_us as f64 - 2000.0) / result.actual_execution_time_us as f64) * 100.0,\n                    implementation_difficulty: 8,\n                });\n            }\n            \n            // Analyze transaction size\n            if result.actual_transaction_size > 1000 {\n                recommendations.push(OptimizationRecommendation {\n                    instruction_name: result.instruction_name.clone(),\n                    issue_type: \"Large Transaction Size\".to_string(),\n                    current_value: result.actual_transaction_size as f64,\n                    recommended_value: 800.0,\n                    optimization_strategy: \"Optimize data structures, use compression\".to_string(),\n                    estimated_improvement: ((result.actual_transaction_size as f64 - 800.0) / result.actual_transaction_size as f64) * 100.0,\n                    implementation_difficulty: 4,\n                });\n            }\n        }\n        \n        recommendations\n    }\n}\n\n// =====================================================\n// DEFAULT PERFORMANCE TEST CONFIGURATIONS\n// =====================================================\n\npub fn create_default_test_suite() -> PerformanceTestSuite {\n    let mut suite = PerformanceTestSuite::new();\n    \n    // Agent registration test\n    suite.add_test(\n        PerformanceTestConfig::new(\"register_agent\")\n            .with_compute_budget(40_000, 60_000)\n            .with_time_budget(2_000, 4_000)\n            .with_accounts(3)\n    );\n    \n    // Payment processing test\n    suite.add_test(\n        PerformanceTestConfig::new(\"process_payment\")\n            .with_compute_budget(25_000, 40_000)\n            .with_time_budget(1_500, 3_000)\n            .with_accounts(6)\n    );\n    \n    // Agent update test\n    suite.add_test(\n        PerformanceTestConfig::new(\"update_agent\")\n            .with_compute_budget(15_000, 25_000)\n            .with_time_budget(1_000, 2_000)\n            .with_accounts(2)\n    );\n    \n    // Work order creation test\n    suite.add_test(\n        PerformanceTestConfig::new(\"create_work_order\")\n            .with_compute_budget(30_000, 45_000)\n            .with_time_budget(1_800, 3_500)\n            .with_accounts(4)\n    );\n    \n    // Auction operations test\n    suite.add_test(\n        PerformanceTestConfig::new(\"create_auction\")\n            .with_compute_budget(35_000, 50_000)\n            .with_time_budget(2_000, 4_000)\n            .with_accounts(5)\n    );\n    \n    suite\n}\n"}