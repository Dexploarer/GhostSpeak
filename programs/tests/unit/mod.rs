/*!
 * Mollusk Unit Tests for GhostSpeak Program
 *
 * Fast, lightweight testing using Mollusk SVM without a full validator.
 * Tests individual instructions in isolation with explicit account setup.
 */

mod test_harness;

#[cfg(test)]
mod agent_tests;

#[cfg(test)]
mod staking_tests;

#[cfg(test)]
mod reputation_tests;

#[cfg(test)]
mod ghost_tests;

#[cfg(test)]
mod escrow_tests;

#[cfg(test)]
mod integration_tests;
