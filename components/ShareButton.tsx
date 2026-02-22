'use client';

import { useState, useEffect, useCallback } from 'react';
import { Share2 } from 'lucide-react';
import styles from './ShareButton.module.css';

interface ShareButtonProps {
  url: string;
  title?: string;
  description?: string | null;
  locale: string;
}

export default function ShareButton({ url, title, description, locale }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareLabel = locale === 'ar' ? 'مشاركة' : 'Share';
  const copyLabel = locale === 'ar' ? 'نسخ الرابط' : 'Copy link';
  const copiedLabel = locale === 'ar' ? 'تم النسخ!' : 'Copied!';

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // ignore
    }

    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }, []);

  const handleShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: title || 'Saweg',
          text: description || undefined,
          url: url,
        });
        return;
      } catch {
        // fall back to popover
      }
    }
    setIsOpen((prev) => !prev);
  }, [url, title, description]);

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [url, copyToClipboard]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-share-container]')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isOpen]);

  return (
    <div className={styles.shareContainer} data-share-container>
      <button
        type="button"
        className={styles.shareButton}
        onClick={() => void handleShare()}
        aria-label={shareLabel}
        title={shareLabel}
      >
        <Share2 size={18} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={styles.shareMenu} role="menu">
          <button
            type="button"
            className={styles.shareMenuItem}
            onClick={handleCopy}
            role="menuitem"
          >
            {copied ? copiedLabel : copyLabel}
          </button>
        </div>
      )}
    </div>
  );
}
