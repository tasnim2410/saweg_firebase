'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const t = useTranslations('register');
  const locale = useLocale();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    userType: 'customer',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        console.error('Registration request failed');
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-[#FFF3CC] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-[#E0A800]" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('success')}
          </h2>
          <Link
            href={`/${locale}`}
            className="inline-block mt-6 px-8 py-3 bg-[#FFB81C] hover:bg-[#ffa000] text-black font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            {locale === 'ar' ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Back Button */}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{locale === 'ar' ? 'العودة' : 'Back'}</span>
        </Link>

        {/* Registration Form */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#674E13] p-8 text-white text-center">
            <div className="mb-4 flex justify-center">
              <Image
                src="/images/logo.png"
                alt="Saweg logo"
                width={200}
                height={80}
                className="h-18 md:h-25 w-auto"
                priority
              />
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-3">
              {t('title')}
            </h1>
            <p className="text-lg opacity-90">
              {t('description')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t('fullName')}
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB81C] focus:border-transparent outline-none transition"
                placeholder={locale === 'ar' ? 'أدخل اسمك الكامل' : 'Enter your full name'}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t('email')}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB81C] focus:border-transparent outline-none transition"
                placeholder={locale === 'ar' ? 'example@email.com' : 'example@email.com'}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t('phone')}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB81C] focus:border-transparent outline-none transition"
                placeholder={locale === 'ar' ? '+218 XX XXX XXX' : '+218 XXX XXX XXX'}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t('city')}
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB81C] focus:border-transparent outline-none transition"
                placeholder={locale === 'ar' ? 'أدخل مدينتك' : 'Enter your city'}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">
                {t('userType')}
              </label>
              <select
                name="userType"
                value={formData.userType}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB81C] focus:border-transparent outline-none transition"
              >
                <option value="customer">{t('customer')}</option>
                <option value="partner">{t('partner')}</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full px-8 py-4 bg-[#FFB81C] hover:bg-[#ffa000] text-black text-lg font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all"
            >
              {t('submit')}
            </button>
          </form>
        </div>

        {/* Download Buttons */}
        {/* <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            {locale === 'ar' ? 'أو حمل التطبيق الآن' : 'Or download the app now'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <div className="text-start">
                <div className="text-xs">{locale === 'ar' ? 'حمل من' : 'Download on'}</div>
                <div className="text-lg font-semibold">App Store</div>
              </div>
            </button>

            <button className="flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
              </svg>
              <div className="text-start">
                <div className="text-xs">{locale === 'ar' ? 'حمل من' : 'Get it on'}</div>
                <div className="text-lg font-semibold">Google Play</div>
              </div>
            </button>
          </div>
        </div> */}
      </div>
    </div>
  );
}
