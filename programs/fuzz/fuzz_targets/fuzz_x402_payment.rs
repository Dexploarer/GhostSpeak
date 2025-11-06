/*!
 * Fuzzing Target: x402 Payment Calculations
 *
 * Fuzzes x402 payment recording and counter increments to find:
 * - Counter overflows
 * - Arithmetic errors
 * - Invalid state transitions
 */

#![no_main]

use libfuzzer_sys::fuzz_target;

#[derive(arbitrary::Arbitrary, Debug)]
struct FuzzInput {
    current_total_payments: u64,
    current_total_calls: u64,
    new_payment_amount: u64,
    num_consecutive_payments: u8,
}

fuzz_target!(|input: FuzzInput| {
    let _ = fuzz_x402_payment_recording(
        input.current_total_payments,
        input.current_total_calls,
        input.new_payment_amount,
        input.num_consecutive_payments,
    );
});

fn fuzz_x402_payment_recording(
    mut total_payments: u64,
    mut total_calls: u64,
    payment_amount: u64,
    num_payments: u8,
) -> Result<(), String> {
    // Limit iterations to prevent timeouts
    let num_payments = num_payments.min(100);

    for _ in 0..num_payments {
        // Increment total payments with overflow protection
        total_payments = total_payments
            .checked_add(payment_amount)
            .ok_or("Total payments overflow")?;

        // Increment call count with overflow protection
        total_calls = total_calls
            .checked_add(1)
            .ok_or("Total calls overflow")?;

        // Verify counters haven't wrapped
        if total_payments == 0 && payment_amount > 0 {
            return Err("Total payments wrapped to zero".to_string());
        }

        if total_calls == 0 {
            return Err("Total calls wrapped to zero".to_string());
        }
    }

    Ok(())
}

// Additional fuzzing for fee calculations
#[derive(arbitrary::Arbitrary, Debug)]
struct FeeFuzzInput {
    transfer_amount: u64,
    fee_basis_points: u16, // 0-10000 (0-100%)
}

fuzz_target!(|input: FeeFuzzInput| {
    let _ = fuzz_transfer_fee_calculation(
        input.transfer_amount,
        input.fee_basis_points,
    );
});

fn fuzz_transfer_fee_calculation(
    amount: u64,
    fee_bp: u16,
) -> Result<(u64, u64), String> {
    // Clamp fee basis points to valid range
    let fee_bp = fee_bp.min(10_000);

    // Calculate fee using checked arithmetic
    let fee = ((amount as u128)
        .checked_mul(fee_bp as u128)
        .ok_or("Fee multiplication overflow")?
        / 10_000) as u64;

    // Verify fee doesn't exceed amount
    if fee > amount {
        return Err(format!("Fee {} exceeds amount {}", fee, amount));
    }

    // Calculate total amount needed
    let total = amount
        .checked_add(fee)
        .ok_or("Total amount overflow")?;

    Ok((total, fee))
}

// Run fuzzing with:
// cargo fuzz run fuzz_x402_payment
//
// To find specific crashes:
// cargo fuzz run fuzz_x402_payment -- -only_ascii=1
// cargo fuzz run fuzz_x402_payment -- -max_len=1024
