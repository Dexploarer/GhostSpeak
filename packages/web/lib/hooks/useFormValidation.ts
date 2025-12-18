'use client'

import { useState, useCallback } from 'react'
import type { z, ZodError } from 'zod'

/**
 * Format Zod errors into a flat object of field -> error message
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {}
  
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if (!errors[path]) {
      errors[path] = issue.message
    }
  }
  
  return errors
}

/**
 * Hook for form validation with Zod schemas
 * 
 * @example
 * ```tsx
 * const { errors, validate, clearErrors, getFieldError } = useFormValidation(mySchema)
 * 
 * const handleSubmit = () => {
 *   if (validate(formData)) {
 *     // formData is valid and typed
 *   }
 * }
 * ```
 */
export function useFormValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback(
    (data: unknown): data is T => {
      const result = schema.safeParse(data)
      if (!result.success) {
        setErrors(formatZodErrors(result.error))
        return false
      }
      setErrors({})
      return true
    },
    [schema]
  )

  const validateField = useCallback(
    (fieldName: string, value: unknown): string | null => {
      // Create a partial schema for just this field
      try {
        const partialData = { [fieldName]: value }
        schema.parse(partialData)
        return null
      } catch (error) {
        if (error instanceof Error && 'issues' in error) {
          const zodError = error as ZodError
          const fieldIssue = zodError.issues.find(
            (issue) => issue.path[0] === fieldName
          )
          return fieldIssue?.message ?? null
        }
        return null
      }
    },
    [schema]
  )

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }, [])

  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      return errors[fieldName]
    },
    [errors]
  )

  const hasErrors = Object.keys(errors).length > 0

  return {
    errors,
    hasErrors,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    getFieldError,
    setErrors
  }
}

/**
 * Type helper for extracting the validated type from a schema
 */
export type ValidatedType<T extends z.ZodSchema> = z.infer<T>
