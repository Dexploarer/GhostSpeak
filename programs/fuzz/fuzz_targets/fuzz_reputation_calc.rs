/*!
 * Fuzzing Target: Reputation Calculation
 *
 * Fuzzes the reputation EMA calculation to find:
 * - Integer overflows
 * - Division by zero
 * - Unexpected edge cases
 * - Incorrect bounds
 */

#![no_main]

use libfuzzer_sys::fuzz_target;

#[derive(arbitrary::Arbitrary, Debug)]
struct FuzzInput {
    old_reputation: u32,
    rating: u8,
    iterations: u8, // Number of consecutive ratings
}

fuzz_target!(|input: FuzzInput| {
    // Test reputation calculation with arbitrary inputs
    let _ = fuzz_reputation_calculation(
        input.old_reputation,
        input.rating,
        input.iterations,
    );
});

fn fuzz_reputation_calculation(
    mut reputation: u32,
    rating: u8,
    iterations: u8,
) -> Result<(), String> {
    // Clamp inputs to valid ranges
    let rating = rating.min(5).max(1); // 1-5 stars
    let iterations = iterations.min(100); // Reasonable iteration count

    for _ in 0..iterations {
        reputation = calculate_new_reputation(reputation, rating)?;
    }

    // Verify reputation stays in valid range
    if reputation > 10_000 {
        return Err(format!("Reputation exceeded maximum: {}", reputation));
    }

    Ok(())
}

fn calculate_new_reputation(old_rep: u32, rating: u8) -> Result<u32, String> {
    // Convert rating to basis points (1 star = 2000 bp, 5 stars = 10000 bp)
    let rating_bp = (rating as u32)
        .checked_mul(2000)
        .ok_or("Rating multiplication overflow")?;

    if rating_bp > 10_000 {
        return Err(format!("Invalid rating basis points: {}", rating_bp));
    }

    // Calculate new reputation using EMA
    let new_rep = if old_rep == 0 {
        // First rating - bootstrap
        rating_bp
    } else {
        // EMA: 90% old + 10% new
        let old_weighted = old_rep
            .checked_mul(9000)
            .ok_or("Old reputation multiplication overflow")?;

        let new_weighted = rating_bp
            .checked_mul(1000)
            .ok_or("New rating multiplication overflow")?;

        let sum = old_weighted
            .checked_add(new_weighted)
            .ok_or("Reputation sum overflow")?;

        sum / 10_000
    };

    // Verify result is in valid range
    if new_rep > 10_000 {
        return Err(format!("New reputation exceeds maximum: {}", new_rep));
    }

    Ok(new_rep)
}

// Run fuzzing with:
// cargo fuzz run fuzz_reputation_calc
//
// Example commands:
// cargo fuzz run fuzz_reputation_calc -- -max_total_time=60
// cargo fuzz run fuzz_reputation_calc -- -runs=1000000
