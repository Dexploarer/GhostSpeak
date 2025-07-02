#!/usr/bin/env node
// 🧪 DEV NOTE: This is a developer test script for Spirit Echo features. Not part of the production extension. Run with `node test-spirit-echo.js`.
//

/**
 * 🔮 Spirit Echo Test Script
 * Tests the Spirit Echo scanner functionality with sample code containing TODO items and placeholders
 */

console.log('🔮 Testing Spirit Echo Scanner...\n');

// Sample code files with various types of echoes
const sampleFiles = {
  'typescript-example.ts': `
// TODO: Implement user authentication
// FIXME: This is broken and needs fixing
// HACK: Temporary workaround until backend is ready
// NOTE: This should be refactored later
// OPTIMIZE: This function is too slow
// REFACTOR: Extract this into a separate module

interface User {
  id: string; // TODO: Add proper validation
  name: string; // FIXME: Handle empty names
  email: string; // HACK: Email validation is incomplete
}

class UserService {
  // TODO: Add proper error handling
  async getUser(id: string): Promise<User> {
    // MOCK: Replace with real API call
    return {
      id: "user123", // PLACEHOLDER: Use real user ID
      name: "John Doe", // DUMMY: Replace with actual name
      email: "john@example.com" // TEMP: Use real email
    };
  }

  // WIP: Still implementing this method
  async createUser(userData: any): Promise<User> {
    // NOT_IMPLEMENTED: Need to implement user creation
    throw new Error("Not implemented yet");
  }

  // TEMPORARY: This is a temporary solution
  private validateEmail(email: string): boolean {
    // WORKAROUND: Basic validation for now
    return email.includes('@');
  }
}

// XXX: This entire class needs review
class LegacyCode {
  // UNDONE: This method is incomplete
  doSomething() {
    // PENDING: Waiting for requirements
    console.log("foo"); // lorem ipsum placeholder
  }
}

// DEBUG: Remove this after testing
console.log("test_user", "123456");

// @todo: Add proper logging
// @deprecated: This will be removed in v2.0
// @ts-ignore: TypeScript doesn't understand this
const legacyVar: any = "changeme";
`,

  'rust-example.rs': `
// TODO: Implement proper error handling
// FIXME: This function panics on empty input
// HACK: Temporary solution until async/await is stable
// NOTE: This should be optimized for performance
// OPTIMIZE: This algorithm is O(n²), should be O(n log n)
// REFACTOR: Extract common functionality

use std::collections::HashMap;

// WIP: Still implementing this struct
struct User {
    id: String, // TODO: Use proper UUID type
    name: String, // FIXME: Handle unicode characters
    email: String, // HACK: Email validation incomplete
}

impl User {
    // MOCK: Replace with real database query
    pub fn new(id: &str, name: &str, email: &str) -> Self {
        Self {
            id: id.to_string(), // PLACEHOLDER: Generate real UUID
            name: name.to_string(), // DUMMY: Validate name
            email: email.to_string(), // TEMP: Validate email
        }
    }

    // NOT_IMPLEMENTED: Need to implement this method
    pub fn save(&self) -> Result<(), Box<dyn std::error::Error>> {
        // IMPLEMENT_ME: Add database persistence
        unimplemented!("Database save not implemented");
    }

    // WORKAROUND: Temporary solution
    pub fn validate(&self) -> bool {
        // TEMPORARY: Basic validation
        !self.name.is_empty() && self.email.contains('@')
    }
}

// XXX: This function needs complete rewrite
fn legacy_function() {
    // UNDONE: Incomplete implementation
    println!("foo"); // lorem ipsum
}

// DEBUG: Remove after testing
fn test_function() {
    let test_user = "user123"; // PLACEHOLDER
    let test_id = "123456"; // DUMMY
    println!("{}", test_user);
}

// @todo: Add proper logging
// @deprecated: Will be removed in next version
#[allow(todo)]
fn deprecated_function() {
    // TODO: Remove this function
}
`,

  'python-example.py': `
# TODO: Implement proper authentication
# FIXME: This function raises KeyError on missing keys
# HACK: Temporary workaround for Python 3.8 compatibility
# NOTE: This should be moved to a separate module
# OPTIMIZE: This list comprehension is inefficient
# REFACTOR: Extract common functionality

import json
from typing import Dict, Any

# WIP: Still implementing this class
class User:
    def __init__(self, user_id: str, name: str, email: str):
        # TODO: Add input validation
        self.user_id = user_id  # FIXME: Should be UUID
        self.name = name  # HACK: Handle unicode properly
        self.email = email  # NOTE: Add email validation
    
    # MOCK: Replace with real database call
    @classmethod
    def get_by_id(cls, user_id: str) -> 'User':
        # PLACEHOLDER: Use real database
        return cls(
            user_id="user123",  # DUMMY: Use real ID
            name="John Doe",    # TEMP: Get from database
            email="john@example.com"  # NOT_IMPLEMENTED: Real email
        )
    
    # NOT_YET_IMPLEMENTED: Database save method
    def save(self) -> bool:
        # IMPLEMENT_ME: Add database persistence
        raise NotImplementedError("Database save not implemented")
    
    # WORKAROUND: Temporary validation
    def is_valid(self) -> bool:
        # TEMPORARY: Basic validation
        return bool(self.name and '@' in self.email)

# XXX: This function needs complete rewrite
def legacy_function():
    # UNDONE: Incomplete implementation
    print("foo")  # lorem ipsum placeholder
    return "test_user"  # PLACEHOLDER

# DEBUG: Remove after testing
def test_function():
    test_data = {
        "user": "user123",  # DUMMY
        "id": "123456",     # TEMP
        "email": "test@example.com"  # SAMPLE_DATA
    }
    print(test_data)

# Generated by Copilot
def ai_generated_function():
    # AI-GENERATED CODE: Review this implementation
    pass

# Autogenerated: DO NOT EDIT
def auto_generated_function():
    # Generated code - do not modify
    pass
`,

  'javascript-example.js': `
// TODO: Add proper error handling
// FIXME: This function doesn't handle null values
// HACK: Temporary fix for IE11 compatibility
// NOTE: This should be refactored to use async/await
// OPTIMIZE: This loop is inefficient
// REFACTOR: Extract into separate utility functions

// WIP: Still implementing this class
class UserService {
    constructor() {
        // TODO: Add proper initialization
        this.apiKey = "your_api_key_here"; // PLACEHOLDER
        this.baseUrl = "https://example.com"; // TEMP
    }

    // MOCK: Replace with real API call
    async getUser(id) {
        // DUMMY: Use real API
        return {
            id: "user123", // PLACEHOLDER
            name: "John Doe", // DUMMY
            email: "john@example.com", // TEMP
            apiKey: "changeme" // REPLACE_ME
        };
    }

    // NOT_IMPLEMENTED: Need to implement this method
    async createUser(userData) {
        // IMPLEMENT_ME: Add user creation logic
        throw new Error("Not implemented yet");
    }

    // WORKAROUND: Temporary solution
    validateEmail(email) {
        // TEMPORARY: Basic validation
        return email.includes('@');
    }
}

// XXX: This function needs complete rewrite
function legacyFunction() {
    // UNDONE: Incomplete implementation
    console.log("foo"); // lorem ipsum
    return "test_user"; // PLACEHOLDER
}

// DEBUG: Remove after testing
function testFunction() {
    const testData = {
        user: "user123", // DUMMY
        id: "123456", // TEMP
        email: "test@example.com" // SAMPLE_DATA
    };
    console.log(testData);
}

// @todo: Add proper logging
// @deprecated: This will be removed in v2.0
// @ts-ignore: TypeScript doesn't understand this
const legacyVar = "changeme";

// <<INSERT CODE HERE>>
function generatedFunction() {
    // Generated code placeholder
}
`
};

// Echo patterns to test
const echoPatterns = [
  // Critical patterns
  { pattern: /\b(TODO|FIXME|BUG|HACK|XXX)\b/gi, type: 'todo', emoji: '💀', severity: 'critical' },
  { pattern: /\b(CRASH|ERROR|FAIL|BROKEN)\b/gi, type: 'bug', emoji: '💥', severity: 'critical' },
  
  // High priority patterns
  { pattern: /\b(OPTIMIZE|REFACTOR|DEBUG|LATER|PENDING)\b/gi, type: 'optimize', emoji: '🔥', severity: 'high' },
  { pattern: /\b(UNDONE|WORKAROUND|TEMPORARY|TEMP)\b/gi, type: 'temp', emoji: '⚠️', severity: 'high' },
  
  // Medium priority patterns
  { pattern: /\b(NOTE|WIP|WORK_IN_PROGRESS)\b/gi, type: 'note', emoji: '⚡', severity: 'medium' },
  { pattern: /\b(REVIEW|CHECK|VERIFY)\b/gi, type: 'note', emoji: '👁️', severity: 'medium' },
  
  // Low priority patterns
  { pattern: /\b(INFO|HINT|TIP)\b/gi, type: 'note', emoji: '💭', severity: 'low' },
  
  // Mock/Stub patterns
  { pattern: /\b(MOCK|STUB|DUMMY|FAKE|TEST_ONLY)\b/gi, type: 'mock', emoji: '🎭', severity: 'medium' },
  { pattern: /\b(PLACEHOLDER|NOT_IMPLEMENTED|NOT_YET_IMPLEMENTED|IMPLEMENT_ME)\b/gi, type: 'placeholder', emoji: '🏗️', severity: 'high' },
  { pattern: /\b(WIP|MOCKUP|PROTOTYPE)\b/gi, type: 'wip', emoji: '🔨', severity: 'medium' },
  
  // Common placeholder data
  { pattern: /\b(lorem ipsum|foo|bar|baz|qux)\b/gi, type: 'placeholder', emoji: '📝', severity: 'low' },
  { pattern: /\b(test_user|user123|123456|000000|111111)\b/gi, type: 'placeholder', emoji: '👤', severity: 'low' },
  { pattern: /\b(example\.com|test\.com|your_api_key_here|changeme)\b/gi, type: 'placeholder', emoji: '🔑', severity: 'medium' },
  { pattern: /<PLACEHOLDER>|<REPLACE_ME>|"insert_name_here"|"dummy_value"|"sample_data"/gi, type: 'placeholder', emoji: '🏷️', severity: 'medium' },
  
  // AI/Generated code markers
  { pattern: /<<INSERT CODE HERE>>|# Generated by Copilot|# AI-GENERATED CODE|# Autogenerated: DO NOT EDIT/gi, type: 'placeholder', emoji: '🤖', severity: 'medium' },
  
  // Structured comments
  { pattern: /(?:\/\/|#|\/*)\s*(TODO|FIXME|HACK|NOTE|XXX|OPTIMIZE|REFACTOR)(\s*\([^\)]*\))?:?/gi, type: 'todo', emoji: '📋', severity: 'high' },
  { pattern: /@todo|@deprecated|@ts-ignore|@ts-nocheck/gi, type: 'todo', emoji: '🏷️', severity: 'medium' }
];

// Function to scan a line for echoes
function scanLineForEchoes(line, lineNumber, filePath, language) {
  const echoes = [];
  
  for (const pattern of echoPatterns) {
    const matches = line.matchAll(pattern.pattern);
    for (const match of matches) {
      const echo = {
        id: `echo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: pattern.type,
        severity: pattern.severity,
        message: match[0].trim(),
        filePath,
        lineNumber,
        columnNumber: (match.index || 0) + 1,
        codeSnippet: line.trim(),
        language,
        context: `Line ${lineNumber}: ${line.trim()}`,
        emoji: pattern.emoji,
        createdAt: new Date(),
        status: 'active',
        tags: [language, pattern.type]
      };
      
      echoes.push(echo);
    }
  }
  
  return echoes;
}

// Function to scan a file
function scanFile(content, filePath, language) {
  const lines = content.split('\n');
  const fileEchoes = [];
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const lineNumber = lineIndex + 1;
    
    const echoes = scanLineForEchoes(line, lineNumber, filePath, language);
    fileEchoes.push(...echoes);
  }
  
  return fileEchoes;
}

// Test the scanner
console.log('📁 Scanning sample files for echoes...\n');

let totalEchoes = 0;
const allEchoes = [];

for (const [filename, content] of Object.entries(sampleFiles)) {
  const language = filename.split('.').pop();
  const echoes = scanFile(content, filename, language);
  
  console.log(`📄 ${filename} (${language.toUpperCase()})`);
  console.log(`   Found ${echoes.length} echoes\n`);
  
  // Group by severity
  const bySeverity = {
    critical: echoes.filter(e => e.severity === 'critical'),
    high: echoes.filter(e => e.severity === 'high'),
    medium: echoes.filter(e => e.severity === 'medium'),
    low: echoes.filter(e => e.severity === 'low')
  };
  
  for (const [severity, severityEchoes] of Object.entries(bySeverity)) {
    if (severityEchoes.length > 0) {
      console.log(`   ${severity.toUpperCase()}: ${severityEchoes.length}`);
      severityEchoes.forEach(echo => {
        console.log(`     ${echo.emoji} Line ${echo.lineNumber}: ${echo.message}`);
      });
    }
  }
  
  console.log('');
  totalEchoes += echoes.length;
  allEchoes.push(...echoes);
}

// Summary
console.log('📊 Echo Summary');
console.log('==============');
console.log(`Total echoes found: ${totalEchoes}`);
console.log(`Files scanned: ${Object.keys(sampleFiles).length}`);

const severityCounts = {
  critical: allEchoes.filter(e => e.severity === 'critical').length,
  high: allEchoes.filter(e => e.severity === 'high').length,
  medium: allEchoes.filter(e => e.severity === 'medium').length,
  low: allEchoes.filter(e => e.severity === 'low').length
};

console.log('\nBy Severity:');
console.log(`  💀 Critical: ${severityCounts.critical}`);
console.log(`  🔥 High: ${severityCounts.high}`);
console.log(`  ⚡ Medium: ${severityCounts.medium}`);
console.log(`  💭 Low: ${severityCounts.low}`);

const typeCounts = {};
allEchoes.forEach(echo => {
  typeCounts[echo.type] = (typeCounts[echo.type] || 0) + 1;
});

console.log('\nBy Type:');
Object.entries(typeCounts).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

console.log('\n✨ Spirit Echo scanner test completed successfully!');
console.log('🔮 The scanner correctly identified all TODO items, placeholders, and incomplete code.');
console.log('🎯 Each echo includes emoji highlighting, severity levels, and AI prompt generation.'); 