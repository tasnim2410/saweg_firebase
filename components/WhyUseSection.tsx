'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';

export default function WhyUseSection() {
  const t = useTranslations('whyUse');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const features = [
    { title: t('feature1Title'), desc: t('feature1Desc') },
    { title: t('feature2Title'), desc: t('feature2Desc') },
    { title: t('feature3Title'), desc: t('feature3Desc') },
    { title: t('feature4Title'), desc: t('feature4Desc') },
    { title: t('feature5Title'), desc: t('feature5Desc') },
  ];

  return (
    <section id="partners" className="py-16 md:py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Top heading and description */}
        <div className={`text-center mb-12 ${isRTL ? 'text-right' : 'text-left'} md:text-center`}>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('merchantTitle')}
          </h2>
          <p className="text-sm md:text-base text-gray-600 max-w-4xl mx-auto leading-relaxed">
            {t('merchantDesc')}
          </p>
        </div>

        <div
          className={`flex flex-col lg:flex-row gap-10 items-center mb-12 ${
            isRTL ? 'lg:flex-row-reverse' : 'lg:flex-row'
          }`}
        >
          {/* Truck Image */}
          <div className="flex-[1.25] flex justify-center w-full">
            <div className="relative w-full max-w-[620px] aspect-[16/9] min-h-[220px] md:min-h-[360px] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/images/why-this-app.png"
                alt={isRTL ? 'شاحنة سواق' : 'Saweg truck'}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* Features List + Register Button */}
          <div className={`flex-[0.9] space-y-8 ${isRTL ? 'text-right' : 'text-left'}`}>
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                {t('title')}
              </h3>
              <div className="space-y-5">
                {features.map((feature, index) => (
                  <div key={index} className="space-y-1">
                    <h4 className="text-base md:text-lg font-semibold text-gray-900">
                      {feature.title}
                    </h4>
                    <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Register Button */}
            <div>
              <Link
                href={`/${locale}/register`}
                className="inline-block px-8 py-3 bg-[#FFB81C] hover:bg-[#FFA000] text-black text-base md:text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                {t('registerNow')}
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 text-center shadow-md border border-gray-200">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="text-sm text-gray-600">{t('stats.users')}</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 text-center shadow-md border border-gray-200">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
            <div className="text-sm text-gray-600">{t('stats.deliveries')}</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 text-center shadow-md border border-gray-200">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div className="text-sm text-gray-600">{t('stats.packages')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
