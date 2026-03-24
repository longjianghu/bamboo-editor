export type ValidationErrorType =
  | 'forbidden_tag'
  | 'forbidden_attribute'
  | 'forbidden_url'

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
