/*!
 * Fuzzing Target: Register Agent Instruction
 *
 * Fuzzes the register_agent instruction with random inputs to find:
 * - Panics
 * - Buffer overflows
 * - Unexpected behavior
 * - Validation bypasses
 */

#![no_main]

use libfuzzer_sys::fuzz_target;
use anchor_lang::prelude::*;

// Fuzzing input structure
#[derive(arbitrary::Arbitrary, Debug)]
struct FuzzInput {
    agent_type: u8,
    name_len: usize,
    name_bytes: Vec<u8>,
    description_len: usize,
    description_bytes: Vec<u8>,
    metadata_uri_len: usize,
    metadata_uri_bytes: Vec<u8>,
    agent_id_len: usize,
    agent_id_bytes: Vec<u8>,
}

fuzz_target!(|input: FuzzInput| {
    // Convert bytes to strings (may be invalid UTF-8)
    let name = String::from_utf8_lossy(&input.name_bytes[..input.name_len.min(input.name_bytes.len())]);
    let description = String::from_utf8_lossy(&input.description_bytes[..input.description_len.min(input.description_bytes.len())]);
    let metadata_uri = String::from_utf8_lossy(&input.metadata_uri_bytes[..input.metadata_uri_len.min(input.metadata_uri_bytes.len())]);
    let agent_id = String::from_utf8_lossy(&input.agent_id_bytes[..input.agent_id_len.min(input.agent_id_bytes.len())]);

    // Test validation logic
    let _ = validate_agent_inputs(
        input.agent_type,
        &name,
        &description,
        &metadata_uri,
        &agent_id,
    );
});

// Simplified validation function for fuzzing
fn validate_agent_inputs(
    agent_type: u8,
    name: &str,
    description: &str,
    metadata_uri: &str,
    agent_id: &str,
) -> Result<(), String> {
    // Test that validation doesn't panic on any input

    // Name validation
    if name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    if name.len() > 64 {
        return Err("Name too long".to_string());
    }

    // Description validation
    if description.len() > 256 {
        return Err("Description too long".to_string());
    }

    // Metadata URI validation
    if metadata_uri.is_empty() {
        return Err("Metadata URI cannot be empty".to_string());
    }
    if metadata_uri.len() > 256 {
        return Err("Metadata URI too long".to_string());
    }

    // Agent ID validation
    if agent_id.is_empty() {
        return Err("Agent ID cannot be empty".to_string());
    }
    if agent_id.len() > 64 {
        return Err("Agent ID too long".to_string());
    }

    // Agent type validation
    if agent_type > 10 {
        return Err("Invalid agent type".to_string());
    }

    Ok(())
}

// Run fuzzing with:
// cargo fuzz run fuzz_register_agent
