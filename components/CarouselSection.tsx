'use client';
import React, { useRef, useState } from 'react'; // Add useState
import { useTranslations } from 'next-intl';
import styles from './CarouselSection.module.css';

interface Product {
  id: number;
  title: string;
  originalPrice?: number;
  currentLocatin?: string;
  placeOfBusiness: string;
  description: string;
  reviewCount: number;
  phoneNumber: string;
  rating: number;
  image: string;
  active: boolean;
}

const CarouselSection: React.FC = () => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('carousel');
  const [copiedPhoneId, setCopiedPhoneId] = useState<number | null>(null); // Track which phone was copied

   const products: Product[] = [
    {
      id: 1,
      title: "الناقل الموثوق",
      currentLocatin: "طرابلس",
      originalPrice: 179.99,
      reviewCount: 2,
      phoneNumber: "0926263250",
      placeOfBusiness: "طرابلس",
      rating: 5,
      description: "متشي كنتر للايجار داخل مدينة طرابلس",
      image: "/images/truck1.png",
      active: true
    },
    {
      id: 2,
      title: "محمد",
      currentLocatin: "طرابلس",
      originalPrice: 179.99,
      reviewCount: 2,
      phoneNumber: "0926263250",
      placeOfBusiness: "كامل ليبيا",
      rating: 5,
      description: "ريكاردو ثلاجة للايجار",
      image: "/images/truck2.png",
      active: false
    },
    {
      id: 3,
      title: "حسام فوزي",
      currentLocatin: "طرابلس",
      reviewCount: 83,
      phoneNumber: "0914080444",
      placeOfBusiness: " ليبيا و تونس",
      rating: 5,
      description:"ستارة للإيجار",
      image: "/images/truck3.png",
      active: true
    },
    {
      id: 4,
      title: "خليل المغربي",
      currentLocatin: "جذابيا",
      originalPrice: 129.99,
      reviewCount: 45,
      phoneNumber: "0917666165",
      placeOfBusiness: "جذابيا",
      rating: 4,
      description:"متوفر كنتر توصيل داخلي+ وخارجي",
      image: "/images/truck4.png",
      active: true
    },
    {
      id: 5,
      title: "حاتم الفغ",
      currentLocatin: "طرابلس",
      reviewCount: 31,
      phoneNumber: "0930873412",
      placeOfBusiness: "داخل وخارج طرابلس",
      rating: 5,
      description:"برتر كيا للايجار ",
      image: "/images/truck5.png",
      active: true
    },
    {
      id: 6,
      title: "محمد الزوام",
      currentLocatin: "الخمس",
      reviewCount: 31,
      phoneNumber: "0934779451",
      placeOfBusiness: "كامل ليبيا",
      rating: 5,
      description:"ستاره 13.5 متر للإيجار ",
      image: "/images/truck6.png",
      active: false
    },
    {
      id: 7,
      title: "عبد اللطيف التونسي",
      currentLocatin: "-",
      reviewCount: 31,
      rating: 5,
      description:"بنتينه للإيجار ",
      placeOfBusiness: "كامل ليبيا", 
      phoneNumber: "0912749907",
      image: "/images/truck7.png",
      active: true
    },
    {
      id: 8,
      title: "حمزة سويب",
      currentLocatin: " مصراته",
      reviewCount: 31,
      phoneNumber: "0912278295",
      placeOfBusiness: " كامل ليبيا",
      rating: 5,
      description:"ريكاردو ستارة 8 متر للإيجار ",
      image: "/images/truck8.png",
      active: false
    },
    {
      id: 9,
      title: "ابا أحمد الجالي",
      currentLocatin: " تاجوراء",
      reviewCount: 31,
      phoneNumber: "0913594435",
      placeOfBusiness: "تاجوراء",
      rating: 5,
      description:"حافظة للايجار",
      image: "/images/truck9.png",
      active: true
    },
    {
      id: 10,
      title: "ابراهيم الشيخي",
      currentLocatin: "بنغازي",
      reviewCount: 31,
      phoneNumber: "0913594435",
      placeOfBusiness: "المنطقه الشرقيه",
      rating: 5,
      description:"كنتر للايجار",
      image: "/images/truck10.png",
      active: true
    },

  ];

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  // Function to copy phone number to clipboard
  const copyToClipboard = (phoneNumber: string, productId: number) => {
    navigator.clipboard.writeText(phoneNumber)
      .then(() => {
        setCopiedPhoneId(productId);
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopiedPhoneId(null);
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = phoneNumber;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setCopiedPhoneId(productId);
          setTimeout(() => {
            setCopiedPhoneId(null);
          }, 2000);
        } catch (err) {
          console.error('Fallback copy failed: ', err);
        }
        document.body.removeChild(textArea);
      });
  };

  return (
    <section className={styles.carouselContainer}>
      <div className={styles.carousel} ref={carouselRef}>
        {products.map((product) => (
          <div 
            key={product.id} 
            className={styles.carouselItem}
          >
            <div 
              className={styles.imageContainer}
              style={{
                backgroundImage: `url(${product.image})`,
              }}
            >
              <img 
                src={product.image} 
                alt={product.title}
                className={styles.productImage}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://via.placeholder.com/330x380/F3F3F3/666666?text=Truck";
                }}
              />
            </div>

            <div className={styles.contentWrapper}>
              <h3 className={styles.productTitle}>{product.title}</h3>
              
              <div className={styles.placeOfBusinessContainer}>
                <p className={styles.placeOfBusiness}>
                  {product.placeOfBusiness}
                </p>
              </div>

              <div className={styles.descriptionContainer}>
                <p className={styles.description}>
                  {product.description.split('\n').map((line, index) => (
                    <span key={index} className={styles.descriptionLine}>{line}</span>
                  ))}
                </p>
              </div>

              <div className={styles.currentLocationContainer}>
                <span 
                  className={styles.currentLocationIcon}
                  style={{ color: product.active ? 'green' : 'red' }}
                >
                  ●
                </span>
                <p className={styles.currentLocation}>
                  {product.currentLocatin || '-'}
                </p>
              </div>
              
              {/* Updated phone number section */}
              <div className={styles.phoneContainer}>
                <button 
                  className={`${styles.phoneButton} ${copiedPhoneId === product.id ? styles.copied : ''}`}
                  onClick={() => copyToClipboard(product.phoneNumber, product.id)}
                  aria-label={`Copy phone number: ${product.phoneNumber}`}
                  title="Click to copy phone number"
                >
                  <span className={styles.phoneNumberIcon}>📞</span>
                  <span className={styles.phoneNumberText}>
                    {copiedPhoneId === product.id ? t('copyied') : product.phoneNumber}
                  </span>
                  {copiedPhoneId === product.id && (
                    <span className={styles.checkmark}>✓</span>
                  )}
                </button>
                {/* <p className={styles.phoneHint}>
                  {copiedPhoneId === product.id ? t('copyied') : t('clickToCopy')}
                </p> */}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className={styles.carouselControls}>
        <button 
          className={styles.controlButton}
          onClick={scrollLeft}
          aria-label={t('scrollLeft')}
        >
          ‹
        </button>
        <button 
          className={styles.controlButton}
          onClick={scrollRight}
          aria-label={t('scrollRight')}
        >
          ›
        </button>
      </div>
    </section>
  );
};

export default CarouselSection;