export interface SanitizeOptions {
  colorTokens?: readonly string[]
}

export type ValidationErrorType =
  | 'forbidden_tag'
  | 'forbidden_attribute'
  | 'forbidden_url'
  | 'forbidden_color'

export interface ValidationError {
  type: ValidationErrorType
  tag: string
  attr?: string
  value?: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
