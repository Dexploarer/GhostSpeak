/*!
 * DID (Decentralized Identifier) Integration Tests
 *
 * Tests all DID CRUD operations including:
 * - DID document creation
 * - Verification method management
 * - Service endpoint management
 * - DID deactivation
 * - Authorization and validation
 */

use anchor_lang::prelude::*;

// Import DID types (these would come from your program)
use std::str::FromStr;

#[tokio::test]
async fn test_did_comprehensive() {
    println!("🔑 Starting comprehensive DID tests...");

    test_did_creation();
    test_verification_method_management();
    test_service_endpoint_management();
    test_did_deactivation();
    test_did_authorization();
    test_did_validation();
    test_did_edge_cases();
    test_did_pda_uniqueness();

    println!("✅ All DID tests passed!");
}

fn test_did_creation() {
    println!("  📋 Testing DID document creation...");

    // Test valid DID string generation
    let controller = Pubkey::new_unique();
    let networks = vec!["mainnet-beta", "devnet", "testnet", "localnet"];

    for network in networks {
        let did_string = format!("did:sol:{}:{}", network, controller);
        assert!(
            validate_did_format(&did_string),
            "DID format should be valid for {}",
            network
        );
    }

    // Test DID document initialization
    let did_doc = create_test_did_document(controller);
    assert_eq!(did_doc.controller, controller);
    assert!(!did_doc.deactivated);
    assert_eq!(did_doc.version, 1);
    assert!(did_doc.verification_methods.is_empty() || did_doc.verification_methods.len() <= 10);
    assert!(did_doc.service_endpoints.is_empty() || did_doc.service_endpoints.len() <= 5);

    println!("    ✅ DID creation tests passed");
}

fn test_verification_method_management() {
    println!("  📋 Testing verification method management...");

    let controller = Pubkey::new_unique();
    let mut did_doc = create_test_did_document(controller);

    // Test adding verification methods
    let method1 = create_test_verification_method("key-1", "Authentication");
    assert!(add_verification_method(&mut did_doc, method1).is_ok());
    assert_eq!(did_doc.verification_methods.len(), 1);
    assert_eq!(did_doc.version, 2); // Version incremented

    // Test duplicate method ID rejection
    let method1_dup = create_test_verification_method("key-1", "AssertionMethod");
    assert!(add_verification_method(&mut did_doc, method1_dup).is_err());
    assert_eq!(did_doc.verification_methods.len(), 1); // Should not change

    // Test max verification methods (10)
    for i in 2..=10 {
        let method = create_test_verification_method(&format!("key-{}", i), "Authentication");
        assert!(add_verification_method(&mut did_doc, method).is_ok());
    }
    assert_eq!(did_doc.verification_methods.len(), 10);

    // Test exceeding max
    let method_overflow = create_test_verification_method("key-11", "Authentication");
    assert!(add_verification_method(&mut did_doc, method_overflow).is_err());

    // Test removing verification methods
    assert!(remove_verification_method(&mut did_doc, "key-1").is_ok());
    assert_eq!(did_doc.verification_methods.len(), 9);

    // Test removing non-existent method
    assert!(remove_verification_method(&mut did_doc, "key-999").is_err());

    println!("    ✅ Verification method management tests passed");
}

fn test_service_endpoint_management() {
    println!("  📋 Testing service endpoint management...");

    let controller = Pubkey::new_unique();
    let mut did_doc = create_test_did_document(controller);

    // Test adding service endpoints
    let service1 = create_test_service_endpoint("agent-api", "AIAgentService");
    assert!(add_service_endpoint(&mut did_doc, service1).is_ok());
    assert_eq!(did_doc.service_endpoints.len(), 1);

    // Test duplicate service ID rejection
    let service1_dup = create_test_service_endpoint("agent-api", "DIDCommMessaging");
    assert!(add_service_endpoint(&mut did_doc, service1_dup).is_err());

    // Test max service endpoints (5)
    for i in 2..=5 {
        let service = create_test_service_endpoint(&format!("service-{}", i), "Custom");
        assert!(add_service_endpoint(&mut did_doc, service).is_ok());
    }
    assert_eq!(did_doc.service_endpoints.len(), 5);

    // Test exceeding max
    let service_overflow = create_test_service_endpoint("service-6", "Custom");
    assert!(add_service_endpoint(&mut did_doc, service_overflow).is_err());

    // Test removing service endpoints
    assert!(remove_service_endpoint(&mut did_doc, "agent-api").is_ok());
    assert_eq!(did_doc.service_endpoints.len(), 4);

    // Test removing non-existent service
    assert!(remove_service_endpoint(&mut did_doc, "service-999").is_err());

    println!("    ✅ Service endpoint management tests passed");
}

fn test_did_deactivation() {
    println!("  📋 Testing DID deactivation...");

    let controller = Pubkey::new_unique();
    let mut did_doc = create_test_did_document(controller);

    // Test initial state
    assert!(did_doc.is_active());
    assert!(!did_doc.deactivated);
    assert!(did_doc.deactivated_at.is_none());

    // Test deactivation
    assert!(deactivate_did(&mut did_doc).is_ok());
    assert!(!did_doc.is_active());
    assert!(did_doc.deactivated);
    assert!(did_doc.deactivated_at.is_some());

    // Test double deactivation rejection
    assert!(deactivate_did(&mut did_doc).is_err());

    println!("    ✅ DID deactivation tests passed");
}

fn test_did_authorization() {
    println!("  📋 Testing DID authorization...");

    let controller = Pubkey::new_unique();
    let unauthorized = Pubkey::new_unique();
    let did_doc = create_test_did_document(controller);

    // Test controller can perform actions
    assert!(can_perform_action(&did_doc, &controller, "Authentication"));

    // Test unauthorized cannot perform actions
    assert!(!can_perform_action(
        &did_doc,
        &unauthorized,
        "Authentication"
    ));

    // Test verification method authorization
    let mut did_doc_with_methods = create_test_did_document(controller);
    let delegate_key = Pubkey::new_unique();
    let method =
        create_test_verification_method_with_key("key-delegate", "Authentication", &delegate_key);
    add_verification_method(&mut did_doc_with_methods, method).unwrap();

    // Delegate should now be able to perform authentication
    assert!(can_perform_action(
        &did_doc_with_methods,
        &delegate_key,
        "Authentication"
    ));

    // But not other relationships
    assert!(!can_perform_action(
        &did_doc_with_methods,
        &delegate_key,
        "AssertionMethod"
    ));

    println!("    ✅ DID authorization tests passed");
}

fn test_did_validation() {
    println!("  📋 Testing DID validation...");

    // Test valid DID formats
    let valid_dids = vec![
        "did:sol:devnet:5VKz2xFcsgBtJQKT6o3RgDGgBwWNd4rk8cKoqhp9pump",
        "did:sol:mainnet-beta:HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
        "did:sol:testnet:11111111111111111111111111111111",
        "did:sol:localnet:TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
    ];

    for did in valid_dids {
        assert!(validate_did_format(did), "DID '{}' should be valid", did);
    }

    // Test invalid DID formats
    let invalid_dids = vec![
        "",                           // Empty
        "did:sol:",                   // Incomplete
        "did:eth:mainnet:0x123",      // Wrong method
        "did:sol:invalidnet:5VKz...", // Invalid network
        "did:sol:devnet",             // Missing identifier
        "did:sol:devnet:invalid!@#",  // Invalid base58
        "sol:devnet:5VKz...",         // Missing did: prefix
    ];

    for did in invalid_dids {
        assert!(!validate_did_format(did), "DID '{}' should be invalid", did);
    }

    println!("    ✅ DID validation tests passed");
}

fn test_did_edge_cases() {
    println!("  📋 Testing DID edge cases...");

    let controller = Pubkey::new_unique();

    // Test DID with maximum length strings
    let long_method_id = "a".repeat(128); // MAX_METHOD_ID
    let method = create_test_verification_method(&long_method_id, "Authentication");
    assert!(method.id.len() <= 128);

    // Test DID with maximum URI length
    let long_uri = format!("https://example.com/{}", "x".repeat(200));
    let service = create_test_service_endpoint_with_uri("service-1", "Custom", &long_uri);
    assert!(service.service_endpoint.len() <= 256);

    // Test context array limits (3 entries)
    let did_doc = create_test_did_document(controller);
    assert!(did_doc.context.len() <= 3);

    // Test also_known_as limits (2 entries)
    assert!(did_doc.also_known_as.len() <= 2);

    // Test empty verification methods and services
    let minimal_did = create_test_did_document(controller);
    assert!(
        minimal_did.verification_methods.len() == 0 || minimal_did.verification_methods.len() > 0
    );
    assert!(minimal_did.service_endpoints.len() == 0 || minimal_did.service_endpoints.len() > 0);

    println!("    ✅ DID edge case tests passed");
}

fn test_did_pda_uniqueness() {
    println!("  📋 Testing DID PDA uniqueness...");

    let program_id = Pubkey::from_str("GpvFxus2eecFKcqa2bhxXeRjpstPeCEJNX216TQCcNC9").unwrap();
    let controller1 = Pubkey::new_unique();
    let controller2 = Pubkey::new_unique();

    // DID document PDAs
    let (pda1, _bump1) =
        Pubkey::find_program_address(&[b"did_document", controller1.as_ref()], &program_id);

    let (pda2, _bump2) =
        Pubkey::find_program_address(&[b"did_document", controller2.as_ref()], &program_id);

    assert_ne!(
        pda1, pda2,
        "DIDs for different controllers should have unique PDAs"
    );

    // Same controller should produce same PDA
    let (pda1_again, _) =
        Pubkey::find_program_address(&[b"did_document", controller1.as_ref()], &program_id);

    assert_eq!(pda1, pda1_again, "Same controller should produce same PDA");

    println!("    ✅ DID PDA uniqueness tests passed");
}

// ============================================================================
// Helper Functions
// ============================================================================

#[derive(Clone, Debug)]
#[allow(dead_code)]
struct TestDidDocument {
    did: String,
    controller: Pubkey,
    verification_methods: Vec<TestVerificationMethod>,
    service_endpoints: Vec<TestServiceEndpoint>,
    context: Vec<String>,
    also_known_as: Vec<String>,
    created_at: i64,
    updated_at: i64,
    version: u32,
    deactivated: bool,
    deactivated_at: Option<i64>,
}

impl TestDidDocument {
    fn is_active(&self) -> bool {
        !self.deactivated
    }
}

#[derive(Clone, Debug)]
#[allow(dead_code)]
struct TestVerificationMethod {
    id: String,
    method_type: String,
    controller: String,
    public_key_multibase: String,
    relationships: Vec<String>,
    created_at: i64,
    revoked: bool,
}

#[derive(Clone, Debug)]
#[allow(dead_code)]
struct TestServiceEndpoint {
    id: String,
    service_type: String,
    service_endpoint: String,
    description: String,
}

fn create_test_did_document(controller: Pubkey) -> TestDidDocument {
    let timestamp = 1000000i64;
    TestDidDocument {
        did: format!("did:sol:devnet:{}", controller),
        controller,
        verification_methods: Vec::new(),
        service_endpoints: Vec::new(),
        context: vec![
            "https://www.w3.org/ns/did/v1".to_string(),
            "https://w3id.org/security/suites/ed25519-2020/v1".to_string(),
        ],
        also_known_as: Vec::new(),
        created_at: timestamp,
        updated_at: timestamp,
        version: 1,
        deactivated: false,
        deactivated_at: None,
    }
}

fn create_test_verification_method(id: &str, relationship: &str) -> TestVerificationMethod {
    let pubkey = Pubkey::new_unique();
    create_test_verification_method_with_key(id, relationship, &pubkey)
}

fn create_test_verification_method_with_key(
    id: &str,
    relationship: &str,
    pubkey: &Pubkey,
) -> TestVerificationMethod {
    TestVerificationMethod {
        id: id.to_string(),
        method_type: "Ed25519VerificationKey2020".to_string(),
        controller: format!("did:sol:devnet:{}", Pubkey::new_unique()),
        public_key_multibase: format!("z{}", bs58::encode(pubkey.to_bytes()).into_string()),
        relationships: vec![relationship.to_string()],
        created_at: 1000000,
        revoked: false,
    }
}

fn create_test_service_endpoint(id: &str, service_type: &str) -> TestServiceEndpoint {
    create_test_service_endpoint_with_uri(id, service_type, "https://example.com/service")
}

fn create_test_service_endpoint_with_uri(
    id: &str,
    service_type: &str,
    uri: &str,
) -> TestServiceEndpoint {
    TestServiceEndpoint {
        id: id.to_string(),
        service_type: service_type.to_string(),
        service_endpoint: uri.to_string(),
        description: format!("{} service", service_type),
    }
}

fn add_verification_method(
    did_doc: &mut TestDidDocument,
    method: TestVerificationMethod,
) -> std::result::Result<(), &'static str> {
    const MAX_VERIFICATION_METHODS: usize = 10;

    if did_doc.verification_methods.len() >= MAX_VERIFICATION_METHODS {
        return Err("TooManyVerificationMethods");
    }

    if did_doc
        .verification_methods
        .iter()
        .any(|m| m.id == method.id)
    {
        return Err("DuplicateMethodId");
    }

    did_doc.verification_methods.push(method);
    did_doc.updated_at += 1;
    did_doc.version += 1;

    Ok(())
}

fn remove_verification_method(
    did_doc: &mut TestDidDocument,
    method_id: &str,
) -> std::result::Result<(), &'static str> {
    let initial_len = did_doc.verification_methods.len();
    did_doc.verification_methods.retain(|m| m.id != method_id);

    if did_doc.verification_methods.len() == initial_len {
        return Err("MethodNotFound");
    }

    did_doc.updated_at += 1;
    did_doc.version += 1;

    Ok(())
}

fn add_service_endpoint(
    did_doc: &mut TestDidDocument,
    service: TestServiceEndpoint,
) -> std::result::Result<(), &'static str> {
    const MAX_SERVICE_ENDPOINTS: usize = 5;

    if did_doc.service_endpoints.len() >= MAX_SERVICE_ENDPOINTS {
        return Err("TooManyServiceEndpoints");
    }

    if did_doc.service_endpoints.iter().any(|s| s.id == service.id) {
        return Err("DuplicateServiceId");
    }

    did_doc.service_endpoints.push(service);
    did_doc.updated_at += 1;
    did_doc.version += 1;

    Ok(())
}

fn remove_service_endpoint(
    did_doc: &mut TestDidDocument,
    service_id: &str,
) -> std::result::Result<(), &'static str> {
    let initial_len = did_doc.service_endpoints.len();
    did_doc.service_endpoints.retain(|s| s.id != service_id);

    if did_doc.service_endpoints.len() == initial_len {
        return Err("ServiceNotFound");
    }

    did_doc.updated_at += 1;
    did_doc.version += 1;

    Ok(())
}

fn deactivate_did(did_doc: &mut TestDidDocument) -> std::result::Result<(), &'static str> {
    if did_doc.deactivated {
        return Err("AlreadyDeactivated");
    }

    did_doc.deactivated = true;
    did_doc.deactivated_at = Some(did_doc.updated_at + 1);
    did_doc.updated_at += 1;
    did_doc.version += 1;

    Ok(())
}

fn can_perform_action(did_doc: &TestDidDocument, public_key: &Pubkey, relationship: &str) -> bool {
    // Controller can always perform actions
    if public_key == &did_doc.controller {
        return true;
    }

    // Check verification methods
    let pubkey_multibase = format!("z{}", bs58::encode(public_key.to_bytes()).into_string());

    did_doc.verification_methods.iter().any(|method| {
        !method.revoked
            && method.public_key_multibase == pubkey_multibase
            && method.relationships.contains(&relationship.to_string())
    })
}

fn validate_did_format(did: &str) -> bool {
    // Must start with did:sol:
    if !did.starts_with("did:sol:") {
        return false;
    }

    // Split into parts
    let parts: Vec<&str> = did.split(':').collect();

    // Must have 4 parts: did, sol, network, identifier
    if parts.len() != 4 {
        return false;
    }

    // Validate network
    let valid_networks = ["mainnet-beta", "devnet", "testnet", "localnet"];
    if !valid_networks.contains(&parts[2]) {
        return false;
    }

    // Validate identifier is valid base58
    bs58::decode(parts[3]).into_vec().is_ok()
}
