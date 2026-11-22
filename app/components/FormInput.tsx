import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: boolean
  successMessage?: string
  helperText?: string
  icon?: ReactNode
  required?: boolean
}

export default function FormInput({
  label,
  error,
  success,
  successMessage,
  helperText,
  icon,
  required,
  id,
  className,
  type = "text",
  ...props
}: FormInputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">{icon}</div>}

        <input
          id={inputId}
          type={type}
          className={cn(
            "form-input",
            icon ? "pl-10" : "",
            error ? "form-input.error" : "",
            success ? "form-input.success" : "",
            className
          )}
          {...props}
        />

        {/* Success icon */}
        {success && !error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        {/* Error icon */}
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Helper text */}
      {helperText && !error && <p className="form-helper-text">{helperText}</p>}

      {/* Error message */}
      {error && <p className="form-error-text">{error}</p>}

      {/* Success message */}
      {success && successMessage && <p className="form-success-text">{successMessage}</p>}
    </div>
  )
}
