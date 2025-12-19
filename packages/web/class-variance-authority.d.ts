/**
 * Type declarations for class-variance-authority
 * 
 * This file helps TypeScript resolve CVA types when bun's
 * symlink-based node_modules causes resolution issues.
 */

declare module 'class-variance-authority' {
  export type ClassValue = 
    | ClassArray
    | ClassDictionary
    | string
    | number
    | null
    | boolean
    | undefined

  export type ClassDictionary = Record<string, unknown>
  export type ClassArray = ClassValue[]

  export type StringToBoolean<T> = T extends 'true' | 'false' ? boolean : T

  // Make this compatible with VariantProps usage
  export type VariantProps<Component extends (...args: never[]) => unknown> = 
    Omit<OmitUndefined<Parameters<Component>[0]>, 'class' | 'className'>

  type OmitUndefined<T> = T extends undefined ? never : T

  export type CxOptions = ClassValue[]
  export type CxReturn = string

  export function cx(...inputs: CxOptions): CxReturn

  export interface CVAVariantShape {
    [variant: string]: {
      [key: string]: ClassValue
    }
  }

  export interface CVAConfig<V extends CVAVariantShape = CVAVariantShape> {
    variants?: V
    compoundVariants?: Array<{
      [K in keyof V]?: StringToBoolean<keyof V[K]> | StringToBoolean<keyof V[K]>[]
    } & { class?: ClassValue; className?: ClassValue }>
    defaultVariants?: {
      [K in keyof V]?: StringToBoolean<keyof V[K]>
    }
  }

  export type CVAReturn<V extends CVAVariantShape = CVAVariantShape> = ((
    props?: {
      [K in keyof V]?: StringToBoolean<keyof V[K]> | null
    } & { class?: ClassValue; className?: ClassValue }
  ) => string)

  export function cva<V extends CVAVariantShape>(
    base?: ClassValue,
    config?: CVAConfig<V>
  ): CVAReturn<V>
}

declare module 'class-variance-authority/types' {
  export type VariantProps<T> = T extends (props: infer P) => string
    ? Omit<P, 'class' | 'className'>
    : never
}
