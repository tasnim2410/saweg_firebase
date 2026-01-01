'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignupPage() {
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${locale}/register`);
  }, [locale, router]);

  return null;
}
