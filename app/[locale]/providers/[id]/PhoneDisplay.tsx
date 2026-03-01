'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import styles from './providers.module.css';

type PhoneDisplayProps = {
  phone: string;
  locale: string;
  canCall?: boolean;
  providerId?: number;
  callButtonClass?: string;
  callButtonDisabledClass?: string;
  phoneNumberLtrClass?: string;
};

export default function PhoneDisplay({
  phone,
  locale,
  canCall = true,
  providerId,
  callButtonClass,
  callButtonDisabledClass,
  phoneNumberLtrClass,
}: PhoneDisplayProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const formatPhoneForDisplay = (phoneNumber: string) => {
    const trimmed = (phoneNumber || '').trim();
    if (trimmed.endsWith('+') && !trimmed.startsWith('+')) {
      return `+${trimmed.slice(0, -1)}`;
    }
    return trimmed;
  };

  const toTelHref = (phoneNumber: string) => {
    const normalized = phoneNumber.replace(/[^+\d]/g, '');
    return `tel:${normalized}`;
  };

  const toWhatsAppHref = (phoneNumber: string) => {
    const normalized = phoneNumber.replace(/[^\d]/g, '');
    return `https://wa.me/${normalized}`;
  };

  const trackCall = () => {
    if (providerId) {
      void fetch(`/api/providers/${providerId}/calls`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => null);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
      {canCall ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button
            className={callButtonClass}
            onClick={() => setMenuOpen(!menuOpen)}
            title="Call"
            style={{ cursor: 'pointer' }}
          >
            <span dir="ltr" className={phoneNumberLtrClass}>
              {formatPhoneForDisplay(phone)}
            </span>
          </button>
          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                minWidth: '150px',
                marginBottom: '8px',
              }}
            >
              <a
                href={toTelHref(phone)}
                onClick={trackCall}
                className={styles.callMenuItem}
                role="menuitem"
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#111827',
                  textDecoration: 'none',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: '14px',
                }}
              >
                <span>{locale === 'ar' ? 'اتصال' : 'Phone Call'}</span>
              </a>
              <a
                href={toWhatsAppHref(phone)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={trackCall}
                className={styles.callMenuItem}
                role="menuitem"
                style={{
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#111827',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                <MessageCircle size={14} />
                <span>WhatsApp</span>
              </a>
            </div>
          )}
        </div>
      ) : (
        <span className={`${callButtonClass} ${callButtonDisabledClass}`}>
          <span dir="ltr" className={phoneNumberLtrClass}>
            {formatPhoneForDisplay(phone)}
          </span>
        </span>
      )}
    </div>
  );
}
