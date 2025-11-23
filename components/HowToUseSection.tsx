'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';

export default function HowToUseSection() {
  const t = useTranslations('howToUse');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const steps = [
    { number: 1, text: t('step1') },
    { number: 2, text: t('step2') },
    { number: 3, text: t('step3') },
    { number: 4, text: t('step4') },
    { number: 5, text: t('step5') },
  ];

  return (
    <section id="how-to-use" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            {t('title')}
          </h2>
          <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto">
            {t('description')}
          </p>
        </div>

        {/* Top store buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href={`/${locale}/register`}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            <div className="text-start">
              <div className="text-xs">{locale === 'ar' ? 'حمل من' : 'Download on'}</div>
              <div className="text-lg font-semibold">App Store</div>
            </div>
          </Link>

          <Link
            href={`/${locale}/register`}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
            </svg>
            <div className="text-start">
              <div className="text-xs">{locale === 'ar' ? 'حمل من' : 'Get it on'}</div>
              <div className="text-lg font-semibold">Google Play</div>
            </div>
          </Link>
        </div>

        <div
          className={`flex flex-col lg:flex-row gap-10 items-center ${
            isRTL ? 'lg:flex-row' : 'lg:flex-row'
          }`}
        >
          {/* Steps - Text content - Now comes FIRST in DOM for Arabic, SECOND for English */}
          <div className={`flex-1 space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex items-start gap-4 bg-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 ${
                  isRTL ? 'flex-row' : 'flex-row'
                }`}
              >
                {/* Number circle - will automatically be on right in Arabic due to flex-row-reverse */}
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-[#FFB81C] to-[#FFA000] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {step.number}
                </div>
                <p className="text-gray-800 text-base leading-relaxed flex-1 pt-1">
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          {/* Phone Mockup with app preview - Now comes SECOND in DOM for Arabic, FIRST for English */}
          <div className="flex-1 flex justify-center">
            <div className="relative w-[280px] h-[560px]">
              {/* Phone Frame */}
              <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-b from-gray-800 to-black shadow-2xl border-[8px] border-gray-900 z-10"></div>
              
              {/* Screen */}
              <div className="absolute inset-[12px] rounded-[2.2rem] bg-white overflow-hidden z-20">
                <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                  <Image
                    src="/images/app-preview.png"
                    alt={locale === 'ar' ? 'معاينة تطبيق سواق' : 'Saweg app preview'}
                    width={240}
                    height={480}
                    className="object-contain rounded-xl"
                    priority
                  />
                </div>
              </div>
              
              {/* Notch */}
              <div className="absolute top-[12px] left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-xl z-30"></div>
              
              {/* Home Indicator */}
              <div className="absolute bottom-[20px] left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gray-300 rounded-full z-30"></div>
              
              {/* Volume Buttons */}
              <div className="absolute left-[-8px] top-24 w-1 h-16 bg-gray-800 rounded-l-lg z-0"></div>
              <div className="absolute left-[-8px] top-40 w-1 h-8 bg-gray-800 rounded-l-lg z-0"></div>
              
              {/* Power Button */}
              <div className="absolute right-[-8px] top-28 w-1 h-12 bg-gray-800 rounded-r-lg z-0"></div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}