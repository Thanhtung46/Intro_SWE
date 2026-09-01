import { useRef } from 'react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
}

export function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  function setDigit(index: number, digit: string) {
    const clean = digit.replace(/\D/g, '').slice(-1)
    const next = digits.slice()
    next[index] = clean
    onChange(next.join(''))
    if (clean && index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      e.preventDefault()
      onChange(pasted)
      refs.current[Math.min(pasted.length, length - 1)]?.focus()
    }
  }

  return (
    <div className="auth-otp-row" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className="auth-otp-box"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  )
}
