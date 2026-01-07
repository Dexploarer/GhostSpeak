import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useDebounce } from './useDebounce'
import { USERNAME_CONSTRAINTS } from '@/lib/constants/branding'

export type ValidationStatus = 'empty' | 'invalid' | 'checking' | 'taken' | 'available'

export interface ValidationResult {
    status: ValidationStatus
    message: string
    isValid: boolean
}

export function useUsernameValidation(username: string): ValidationResult {
    // Debounce username for availability check
    const debouncedUsername = useDebounce(username, 300)

    // Check username availability
    const usernameCheck = useQuery(
        api.onboarding.checkUsernameAvailable,
        debouncedUsername.length >= USERNAME_CONSTRAINTS.MIN_LENGTH
            ? { username: debouncedUsername }
            : 'skip'
    )

    // Calculate validation status
    return useMemo(() => {
        if (username.length === 0) {
            return { status: 'empty', message: '', isValid: false }
        }

        if (username.length < USERNAME_CONSTRAINTS.MIN_LENGTH) {
            return {
                status: 'invalid',
                message: `At least ${USERNAME_CONSTRAINTS.MIN_LENGTH} characters`,
                isValid: false
            }
        }

        if (username.length > USERNAME_CONSTRAINTS.MAX_LENGTH) {
            return {
                status: 'invalid',
                message: `Max ${USERNAME_CONSTRAINTS.MAX_LENGTH} characters`,
                isValid: false
            }
        }

        if (!USERNAME_CONSTRAINTS.REGEX.test(username)) {
            return {
                status: 'invalid',
                message: USERNAME_CONSTRAINTS.REGEX_MESSAGE,
                isValid: false
            }
        }

        if (usernameCheck === undefined) {
            return { status: 'checking', message: 'Checking...', isValid: false }
        }

        if (!usernameCheck.available) {
            return {
                status: 'taken',
                message: usernameCheck.reason || 'Not available',
                isValid: false
            }
        }

        return { status: 'available', message: 'Available!', isValid: true }
    }, [username, usernameCheck])
}
