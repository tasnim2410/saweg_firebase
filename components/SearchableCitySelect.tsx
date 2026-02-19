'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import styles from './SearchableCitySelect.module.css';
import { getLocationOptionGroups, getLocationLabel } from '@/lib/locations';

interface Props {
  value: string | null;
  onChange: (value: string | null) => void;
  locale: 'ar' | 'en';
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableCitySelect({
  value,
  onChange,
  locale,
  placeholder,
  disabled = false,
}: Props) {
  const isRTL = locale === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Array<{ value: string; label: string }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const locationOptionGroups = getLocationOptionGroups(locale);

  // Flatten all options for searching
  const allOptions = locationOptionGroups.flatMap((group) => group.options);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOptions(allOptions);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = allOptions.filter((opt) =>
      opt.label.toLowerCase().includes(term)
    );
    setFilteredOptions(filtered);
  }, [searchTerm, locale]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedLabel = value ? getLocationLabel(value, locale) : '';

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearchTerm('');
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''} ${disabled ? styles.triggerDisabled : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder={placeholder || (isRTL ? 'ابحث عن مدينة...' : 'Search for a city...')}
          value={isOpen ? searchTerm : selectedLabel}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
          autoComplete="off"
        />
        {selectedLabel && !isOpen && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={handleClear}
            aria-label={isRTL ? 'مسح' : 'Clear'}
          >
            <X size={16} />
          </button>
        )}
        <ChevronDown
          size={18}
          className={`${styles.caret} ${isOpen ? styles.caretOpen : ''}`}
        />
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          {filteredOptions.length > 0 ? (
            <div className={styles.optionsList}>
              {filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`${styles.option} ${value === opt.value ? styles.optionSelected : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>
              {isRTL ? 'لا توجد نتائج' : 'No results'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
