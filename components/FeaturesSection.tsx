'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function FeaturesSection() {
  const t = useTranslations('features');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-6 md:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900">
          {t('title')}
        </h2>
        <p className="mt-2 text-sm md:text-base text-center text-gray-500">
          {t('subtitle')}
        </p>
        <div className="mt-4 mb-10 h-1 w-24 bg-[#FFB81C] mx-auto rounded-full" />

        <div className="relative max-w-6xl mx-auto">
          {/* Map background */}
          <div className="relative w-full h-[360px] md:h-[500px] overflow-hidden">
            <Image
              src="/images/map.png"
              alt={isRTL ? 'خريطة العالم' : 'World map'}
              fill
              className="object-cover"
            />

            {/* Text card overlay */}
            <div className="absolute inset-x-4 md:inset-x-24 top-8 md:top-10">
              <div
                className={`bg-[#fdf7e9]/95 rounded-2xl shadow-lg border border-black/5 px-5 py-4 md:px-8 md:py-6 text-sm md:text-base leading-relaxed text-gray-800 ${
                  isRTL ? 'text-right' : 'text-left'
                }`}
              >
                <p>{t('description')}</p>
              </div>
            </div>

            {/* Truck image with scroll animation */}
            <motion.div
              initial={{ x: '30%', opacity: 1 }}
              whileInView={{ x: '-95%', opacity: 1 }}
              transition={{ 
                duration: 1.2, 
                ease: 'easeInOut',
                repeat: 1,
                repeatType: 'reverse'
              }}
              viewport={{ once: false, amount: 0.1 }}
              className="pointer-events-none absolute bottom-0 md:bottom-4 right-0"
            >
              <Image
                src="/images/truck.png"
                alt={isRTL ? 'شاحنة سواق' : 'Saweg truck'}
                width={600}
                height={300}
                className="w-[300px] md:w-[600px] h-auto drop-shadow-2xl"
                priority
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
