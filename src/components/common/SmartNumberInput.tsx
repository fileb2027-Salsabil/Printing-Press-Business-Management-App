import React, { useEffect, useRef, useState } from 'react';
import { toEnglishDigits } from '../../utils/calculations';

export interface SmartNumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | string | null | undefined;
  onValueChange?: (val: number) => void;
  onTextValueChange?: (val: string) => void;
  integer?: boolean;
  allowNegative?: boolean;
  fallbackOnBlur?: number;
  clearableToEmpty?: boolean;
}

/**
 * Mobile & Desktop friendly numeric input:
 * - Accepts both English (0-9) and Bengali (০-৯) keyboard digits seamlessly
 * - Uses inputMode="decimal" / "numeric" for proper mobile keypad
 * - Allows backspacing completely to empty while editing and allows saving 0 cleanly
 */
export const SmartNumberInput = React.forwardRef<HTMLInputElement, SmartNumberInputProps>(
  (
    {
      value,
      onValueChange,
      onTextValueChange,
      integer = false,
      allowNegative,
      fallbackOnBlur = 0,
      clearableToEmpty = false,
      className = '',
      min,
      max,
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) => {
    const canBeNegative =
      allowNegative !== undefined
        ? allowNegative
        : min !== undefined && min !== '' && Number(min) < 0;

    const formatPropVal = (v: number | string | null | undefined): string => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
      return String(v);
    };

    const [isFocused, setIsFocused] = useState(false);
    const [draftText, setDraftText] = useState<string>(() => formatPropVal(value));
    const lastEmittedNumRef = useRef<number | null>(
      typeof value === 'number' && Number.isFinite(value) ? value : null
    );
    const lastPropStringRef = useRef<string>(formatPropVal(value));

    useEffect(() => {
      const nextStr = formatPropVal(value);
      const nextNum = typeof value === 'number' && Number.isFinite(value) ? value : null;
      if (!isFocused) {
        setDraftText(nextStr);
        lastEmittedNumRef.current = nextNum;
        lastPropStringRef.current = nextStr;
      } else {
        // Sync if parent externally changed the value (e.g. clicking a quick preset chip)
        const numChangedExternally =
          nextNum !== null && lastEmittedNumRef.current !== null && nextNum !== lastEmittedNumRef.current;
        const textChangedExternally =
          onTextValueChange !== undefined && nextStr !== lastPropStringRef.current;
        if (numChangedExternally || textChangedExternally) {
          setDraftText(nextStr);
          lastEmittedNumRef.current = nextNum;
          lastPropStringRef.current = nextStr;
        }
      }
    }, [value, isFocused, onTextValueChange]);

    const sanitizeInput = (rawInput: string): string => {
      const converted = toEnglishDigits(rawInput).replace(/[, ]+/g, '');
      let out = '';
      let hasDot = false;
      for (let i = 0; i < converted.length; i++) {
        const ch = converted[i];
        if (ch >= '0' && ch <= '9') {
          out += ch;
        } else if (ch === '.' && !integer && !hasDot) {
          hasDot = true;
          out += '.';
        } else if (ch === '-' && canBeNegative && out.length === 0) {
          out += '-';
        }
      }
      return out;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeInput(e.target.value);
      setDraftText(sanitized);
      lastPropStringRef.current = sanitized;

      if (onTextValueChange) {
        onTextValueChange(sanitized);
      }

      if (!onValueChange) return;

      if (sanitized === '' || sanitized === '-' || sanitized === '.' || sanitized === '-.') {
        lastEmittedNumRef.current = 0;
        onValueChange(0);
        return;
      }

      const parsed = integer ? parseInt(sanitized, 10) : parseFloat(sanitized);
      if (Number.isFinite(parsed)) {
        lastEmittedNumRef.current = parsed;
        onValueChange(parsed);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      const currentStr = formatPropVal(value);
      setDraftText(currentStr);
      lastPropStringRef.current = currentStr;
      if (onFocus) onFocus(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);

      if (clearableToEmpty && draftText.trim() === '') {
        setDraftText('');
        lastPropStringRef.current = '';
        if (onTextValueChange) onTextValueChange('');
        if (onValueChange) {
          lastEmittedNumRef.current = 0;
          onValueChange(0);
        }
        if (onBlur) onBlur(e);
        return;
      }

      let finalNum: number;
      if (draftText === '' || draftText === '-' || draftText === '.' || draftText === '-.') {
        finalNum = fallbackOnBlur;
      } else {
        const parsed = integer ? parseInt(draftText, 10) : parseFloat(draftText);
        finalNum = Number.isFinite(parsed) ? parsed : fallbackOnBlur;
      }

      if (min !== undefined && min !== '') {
        const minNum = Number(min);
        if (Number.isFinite(minNum) && finalNum < minNum) {
          // Only enforce min > 0 if fallbackOnBlur >= minNum; otherwise allow intentional 0
          if (minNum <= 0 || fallbackOnBlur >= minNum) {
            finalNum = minNum;
          }
        }
      }
      if (max !== undefined && max !== '') {
        const maxNum = Number(max);
        if (Number.isFinite(maxNum) && finalNum > maxNum) {
          finalNum = maxNum;
        }
      }

      const finalStr = String(finalNum);
      setDraftText(finalStr);
      lastEmittedNumRef.current = finalNum;
      lastPropStringRef.current = finalStr;

      if (onTextValueChange) onTextValueChange(finalStr);
      if (onValueChange) onValueChange(finalNum);
      if (onBlur) onBlur(e);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        autoComplete="off"
        value={isFocused ? draftText : formatPropVal(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`tabular-nums numeral-clear ${className}`}
        {...rest}
      />
    );
  }
);

SmartNumberInput.displayName = 'SmartNumberInput';
