export async function withApiAuth(
  req: Request,
  cost: number = 1
): Promise<{ success: boolean; error?: string; userId?: string; tier?: string }> {
  // TODO: Implement API key validation and credit deduction
  // 1. Extract API key from header
  // 2. Validate key against `apiKeys` table
  // 3. Check rate limits
  // 4. Call `deductCredits` mutation
  return { success: true, tier: 'free' }
}
