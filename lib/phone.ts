export type PhoneCountry = 'LY' | 'TN' | 'EG';  

type PhoneSpec = {  
  country: PhoneCountry;  
  cc: string;  
  nationalLength: number;  
  subLength: number;  
  trunk: string;  
};  

const PHONE_SPECS: PhoneSpec[] = [  
  { country: 'TN', cc: '216', nationalLength: 8, subLength: 8, trunk: '' },  
  { country: 'LY', cc: '218', nationalLength: 10, subLength: 9, trunk: '0' },  
  { country: 'EG', cc: '20', nationalLength: 11, subLength: 10, trunk: '0' },  
];  

export type PhoneNormalizationError =  
  | 'PHONE_REQUIRED'  
  | 'PHONE_INVALID_CHARACTERS'  
  | 'PHONE_INVALID_LENGTH';  

export type NormalizedPhoneResult =  
  | {  
      ok: true;  
      raw: string;  
      digits: string;  
      country: PhoneCountry;  
      e164: string;  
    }  
  | {  
      ok: false;  
      raw: string;  
      error: PhoneNormalizationError;  
    };  

export function normalizePhoneNumber(rawInput: string | null | undefined): NormalizedPhoneResult {  
  const raw = typeof rawInput === 'string' ? rawInput : '';  
  const trimmed = raw.trim();  

  if (!trimmed) {  
    return { ok: false, raw, error: 'PHONE_REQUIRED' };  
  }  

  const toAsciiDigits = (value: string) =>
    value
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
      .replace(/[０-９]/g, (d) => String(d.charCodeAt(0) - 0xff10));

  const withoutMarks = trimmed.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
  const normalized = toAsciiDigits(withoutMarks);

  let cleaned = normalized.replace(/[\s-()]/g, '');  

  if (/[^0-9+]/.test(cleaned) || (cleaned.indexOf('+') > 0)) {  
    return { ok: false, raw, error: 'PHONE_INVALID_CHARACTERS' };  
  }  

  const digitsOnly = cleaned.replace(/\D/g, '');
  if (!/^[0-9]+$/.test(digitsOnly)) {
    return { ok: false, raw, error: 'PHONE_INVALID_CHARACTERS' };
  }

  // International format (must include +)
  if (cleaned.startsWith('+')) {
    const afterPlus = cleaned.slice(1).replace(/\D/g, '');

    // Tunisia: +216XXXXXXXX
    if (afterPlus.startsWith('216')) {
      const sub = afterPlus.slice(3);
      if (sub.length !== 8) return { ok: false, raw, error: 'PHONE_INVALID_LENGTH' };
      return { ok: true, raw, digits: sub, country: 'TN', e164: `+216${sub}` };
    }

    // Libya: +2189XXXXXXXX (no trunk 0 internationally)
    if (afterPlus.startsWith('218')) {
      let sub = afterPlus.slice(3);
      if (sub.startsWith('0')) sub = sub.slice(1);
      if (sub.length !== 9 || !sub.startsWith('9')) {
        return { ok: false, raw, error: 'PHONE_INVALID_LENGTH' };
      }
      return { ok: true, raw, digits: sub, country: 'LY', e164: `+218${sub}` };
    }

    // Egypt: +2010XXXXXXXXX (no trunk 0 internationally; subscriber must start with 1)
    if (afterPlus.startsWith('20')) {
      let sub = afterPlus.slice(2);
      if (sub.startsWith('0')) sub = sub.slice(1);
      if (sub.length !== 10 || !sub.startsWith('1')) {
        return { ok: false, raw, error: 'PHONE_INVALID_LENGTH' };
      }
      return { ok: true, raw, digits: sub, country: 'EG', e164: `+20${sub}` };
    }

    return { ok: false, raw, error: 'PHONE_INVALID_LENGTH' };
  }

  // Domestic format
  // Tunisia: exactly 8 digits
  if (digitsOnly.length === 8) {
    return { ok: true, raw, digits: digitsOnly, country: 'TN', e164: `+216${digitsOnly}` };
  }

  // Libya: 10 digits starting with 09
  if (digitsOnly.length === 10) {
    if (!digitsOnly.startsWith('09')) return { ok: false, raw, error: 'PHONE_INVALID_LENGTH' };
    const sub = digitsOnly.slice(1); // drop trunk 0
    return { ok: true, raw, digits: sub, country: 'LY', e164: `+218${sub}` };
  }

  // Egypt: 11 digits starting with 01
  if (digitsOnly.length === 11) {
    if (!digitsOnly.startsWith('01')) return { ok: false, raw, error: 'PHONE_INVALID_LENGTH' };
    const sub = digitsOnly.slice(1); // drop trunk 0
    return { ok: true, raw, digits: sub, country: 'EG', e164: `+20${sub}` };
  }

  return { ok: false, raw, error: 'PHONE_INVALID_LENGTH' };
}  

export function isValidPhoneNumber(rawInput: string | null | undefined): boolean {  
  return normalizePhoneNumber(rawInput).ok;  
}