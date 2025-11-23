'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Facebook, Twitter, Instagram, Linkedin, Youtube } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const t = useTranslations('footer');
  const locale = useLocale();

  return (
    <footer className="bg-[#4b371d] text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          {/* Logo and Social Media */}
          <div>
            <div className="mb-6">
              <Image
                src="/images/logo.png"
                alt="Saweg logo"
                width={240}
                height={140}
                className="h-18 md:h-20 w-auto"
                priority
              />
            </div>
            <h3 className="text-xl font-semibold mb-4">{t('followUs')}</h3>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com/profile.php?id=100089299780324"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Useful Links */}
          <div>
            <h3 className="text-xl font-semibold mb-4">{t('usefulLinks')}</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('privacy')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('terms')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/support`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('support')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/faq`}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  {t('faq')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-gray-400">
              <li>Email: saweg.dev@gmail.com</li>
              <li>Phone: +1 234 567 890</li>
              <li>Address: 123 Street, City, Country</li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-[#3a2a14] pt-8 text-center text-gray-200">
          <p>&copy; 2025 Saweg. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
