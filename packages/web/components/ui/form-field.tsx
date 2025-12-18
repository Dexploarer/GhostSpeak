'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface FormFieldProps {
  label: string
  name: string
  error?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  name,
  error,
  required,
  hint,
  children,
  className
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={name}
        className="text-sm font-medium text-foreground flex items-center gap-1"
      >
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      
      {children}
      
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Input component with consistent styling
 */
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export function FormInput({ error, className, ...props }: FormInputProps) {
  return (
    <input
      {...props}
      className={cn(
        'w-full h-10 px-3 rounded-xl bg-muted/50 border border-border',
        'text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
        'transition-all',
        error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
        className
      )}
    />
  )
}

/**
 * Textarea component with consistent styling
 */
interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export function FormTextarea({ error, className, ...props }: FormTextareaProps) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full px-3 py-2 rounded-xl bg-muted/50 border border-border',
        'text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
        'transition-all resize-none',
        error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
        className
      )}
    />
  )
}

/**
 * Select component with consistent styling
 */
interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  options: { value: string; label: string }[]
  placeholder?: string
}

export function FormSelect({ 
  error, 
  options, 
  placeholder, 
  className, 
  ...props 
}: FormSelectProps) {
  return (
    <select
      {...props}
      className={cn(
        'w-full h-10 px-3 rounded-xl bg-muted/50 border border-border',
        'text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
        'transition-all appearance-none cursor-pointer',
        error && 'border-red-500 focus:ring-red-500/20 focus:border-red-500',
        className
      )}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

/**
 * Checkbox component with consistent styling
 */
interface FormCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
}

export function FormCheckbox({ label, className, ...props }: FormCheckboxProps) {
  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', className)}>
      <input
        type="checkbox"
        {...props}
        className="w-4 h-4 rounded border-border bg-muted/50 text-primary focus:ring-primary/20 focus:ring-offset-0"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}
