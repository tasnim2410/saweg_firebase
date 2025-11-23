'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useState } from 'react';
import Image from 'next/image';

export default function ContactSection() {
  const t = useTranslations('contact');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setToast(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        setToast({ type: 'error', message: t('errorToast') });
        setTimeout(() => setToast(null), 4000);
        return;
      }

      setToast({ type: 'success', message: t('successToast') });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setToast({ type: 'error', message: t('errorToast') });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <section id="contact" className="bg-[#e9fbff] py-0">
      {/* Top brown band with title/description */}
      <div className="bg-[#4b371d] text-white pt-12 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('title')}</h2>
          <p className="text-sm md:text-base leading-relaxed">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Overlapping white card with image + form */}
      <div className="max-w-6xl mx-auto px-4 -mt-16 pb-20">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div
            className={`flex flex-col lg:flex-row ${
              isRTL ? 'lg:flex-row-reverse' : 'lg:flex-row'
            }`}
          >
            {/* Image side */}
            <div className="w-full lg:w-1/2">
              <div className="relative h-[260px] sm:h-[320px] lg:h-full min-h-[320px]">
                <Image
                  src="/images/contact.jpg"
                  alt={locale === 'ar' ? 'صورة شاحنات سواق' : 'Saweg contact trucks'}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Form side */}
            <div className="w-full lg:w-1/2 p-6 md:p-8 lg:p-10">
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
                <div>
                  <input
                    type="text"
                    name="name"
                    placeholder={t('name')}
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB81C] focus:border-transparent outline-none transition text-sm md:text-base"
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    placeholder={t('email')}
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB81C] focus:border-transparent outline-none transition text-sm md:text-base"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    name="subject"
                    placeholder={t('subject')}
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB81C] focus:border-transparent outline-none transition text-sm md:text-base"
                  />
                </div>

                <div>
                  <textarea
                    name="message"
                    placeholder={t('message')}
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB81C] focus:border-transparent outline-none transition resize-none text-sm md:text-base"
                  ></textarea>
                </div>

                <div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder={t('phone')}
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-[#f9fafb] border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FFB81C] focus:border-transparent outline-none transition text-sm md:text-base"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-8 py-3 md:py-4 bg-[#FFB81C] hover:bg-[#ffa000] text-black text-sm md:text-lg font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                >
                  {t('send')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed bottom-6 right-6 z-50 max-w-sm px-6 py-4 rounded-xl shadow-xl text-base md:text-lg transition-all duration-300 transform ${
          toast
            ? 'translate-x-0 opacity-100'
            : 'translate-x-full opacity-0 pointer-events-none'
        } ${
          toast?.type === 'success'
            ? 'bg-green-600 text-white'
            : toast?.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-gray-800 text-white'
        }`}
      >
        {toast?.message}
      </div>
    </section>
  );
}
