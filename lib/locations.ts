export type LocaleKey = 'en' | 'ar';

export type LocationOption = {
  value: string;
  en: string;
  ar: string;
};

export type LocationOptionGroup = {
  label: string;
  options: Array<{ value: string; label: string }>;
};

export const LOCATION_OPTIONS: LocationOption[] = [
  { value: 'ALL_LIBYA', en: 'All of Libya', ar: 'كل ليبيا' },
  { value: 'ALL_TUNISIA', en: 'All of Tunisia', ar: 'كل تونس' },
  { value: 'ALL_EGYPT', en: 'All of Egypt', ar: 'كل مصر' },
  { value: 'Tobruk', en: 'Tobruk', ar: 'طبرق' },
  { value: 'Musaid', en: 'Musaid', ar: 'مساعد' },
  { value: 'Jaghbub', en: 'Jaghbub', ar: 'الجغبوب' },
  { value: 'Derna', en: 'Derna', ar: 'درنة' },
  { value: 'Al Qubah', en: 'Al Qubah', ar: 'القبة' },
  { value: 'Abraq', en: 'Abraq', ar: 'الأبرق' },
  { value: 'Bayda', en: 'Bayda', ar: 'البيضاء' },
  { value: 'Cyrene', en: 'Cyrene', ar: 'شحات' },
  { value: 'Sahel El-Jebel', en: 'Sahel El-Jebel', ar: 'ساحل الجبل' },
  { value: 'Umm al Rizam', en: 'Umm al Rizam', ar: 'أم الرزم' },
  { value: 'Marj', en: 'Marj', ar: 'المرج' },
  { value: "Jardas al ‘Abid", en: "Jardas al ‘Abid", ar: 'جردس العبيد' },
  { value: 'Tocra', en: 'Tocra', ar: 'توكرة' },
  { value: 'Abyar', en: 'Abyar', ar: 'الأبيار' },
  { value: 'Qaminis', en: 'Qaminis', ar: 'قمينس' },
  { value: 'Suluq', en: 'Suluq', ar: 'سلوق' },
  { value: 'Benghazi', en: 'Benghazi', ar: 'بنغازي' },
  { value: 'Ajdabiya', en: 'Ajdabiya', ar: 'أجدابيا' },
  { value: 'Brega', en: 'Brega', ar: 'البريقة' },
  { value: 'Kufra', en: 'Kufra', ar: 'الكفرة' },
  { value: 'Tazirbu', en: 'Tazirbu', ar: 'تازربو' },
  { value: 'Awjila', en: 'Awjila', ar: 'أوجلة' },
  { value: 'Jikharra', en: 'Jikharra', ar: 'جخارة' },
  { value: 'Jalu', en: 'Jalu', ar: 'جالو' },
  { value: 'Marada', en: 'Marada', ar: 'مرادة' },
  { value: 'Gulf of Sidra', en: 'Gulf of Sidra', ar: 'خليج سرت' },
  { value: 'Sirte', en: 'Sirte', ar: 'سرت' },
  { value: 'Zamzam', en: 'Zamzam', ar: 'زمزم' },
  { value: 'Hun', en: 'Hun', ar: 'هون' },
  { value: 'Shatii Shargi', en: 'Shatii Shargi', ar: 'الشاطئ الشرقي' },
  { value: 'Shatii Garbi', en: 'Shatii Garbi', ar: 'الشاطئ الغربي' },
  { value: 'Sebha', en: 'Sebha', ar: 'سبها' },
  { value: 'Murzuk', en: 'Murzuk', ar: 'مرزق' },
  { value: 'Eshargia', en: 'Eshargia', ar: 'الشرقية' },
  { value: 'Wadi Utba', en: 'Wadi Utba', ar: 'وادي عتبة' },
  { value: 'Traghan', en: 'Traghan', ar: 'تراغن' },
  { value: 'Ubari', en: 'Ubari', ar: 'أوباري' },
  { value: 'Ghat', en: 'Ghat', ar: 'غات' },
  { value: 'Bent Bayeh', en: 'Bent Bayeh', ar: 'بنت بيه' },
  { value: 'Misurata', en: 'Misurata', ar: 'مصراتة' },
  { value: 'Zliten', en: 'Zliten', ar: 'زليتن' },
  { value: 'Al Khums', en: 'Al Khums', ar: 'الخمس' },
  { value: 'Essahl', en: 'Essahl', ar: 'الساحل' },
  { value: 'Qasr Khiar', en: 'Qasr Khiar', ar: 'قصر خيار' },
  { value: 'Msallata', en: 'Msallata', ar: 'مسلاتة' },
  { value: 'Tarhuna', en: 'Tarhuna', ar: 'ترهونة' },
  { value: 'Bani Walid', en: 'Bani Walid', ar: 'بني وليد' },
  { value: 'Castelverde', en: 'Castelverde', ar: 'كاستلفيردي' },
  { value: 'Tajura', en: 'Tajura', ar: 'تاجوراء' },
  { value: 'Tripoli (Capital of Libya)', en: 'Tripoli (Capital of Libya)', ar: 'طرابلس' },
  { value: 'Suani', en: 'Suani', ar: 'السواني' },
  { value: 'Qasr bin Ghashir', en: 'Qasr bin Ghashir', ar: 'قصر بن غشير' },
  { value: 'Janzur', en: 'Janzur', ar: 'جنزور' },
  { value: 'Andalus', en: 'Andalus', ar: 'الأندلس' },
  { value: 'Wadi Rabie', en: 'Wadi Rabie', ar: 'وادي الربيع' },
  { value: 'Abu Saleem', en: 'Abu Saleem', ar: 'أبو سليم' },
  { value: 'Sbaiea', en: 'Sbaiea', ar: 'السبيعة' },
  { value: 'Sidi Saeh', en: 'Sidi Saeh', ar: 'سيدي السائح' },
  { value: 'Souq Elkhamis', en: 'Souq Elkhamis', ar: 'سوق الخميس' },
  { value: "Souq al Jum'aa", en: "Souq al Jum'aa", ar: 'سوق الجمعة' },
  { value: '‘Aziziya', en: '‘Aziziya', ar: 'العزيزية' },
  { value: 'Zahra', en: 'Zahra', ar: 'الزهراء' },
  { value: 'Zawiya', en: 'Zawiya', ar: 'الزاوية' },
  { value: 'Western Zawiya', en: 'Western Zawiya', ar: 'الزاوية الغربية' },
  { value: 'Al Maya', en: 'Al Maya', ar: 'الماية' },
  { value: 'Zuwarah', en: 'Zuwarah', ar: 'زوارة' },
  { value: 'Sabratha', en: 'Sabratha', ar: 'صبراتة' },
  { value: 'Sorman', en: 'Sorman', ar: 'صرمان' },
  { value: 'Jumayl', en: 'Jumayl', ar: 'الجميل' },
  { value: 'Zaltan', en: 'Zaltan', ar: 'زلطن' },
  { value: 'Ajaylat', en: 'Ajaylat', ar: 'العجيلات' },
  { value: 'Reqdalin', en: 'Reqdalin', ar: 'رقدالين' },
  { value: 'Baten Eljabel', en: 'Baten Eljabel', ar: 'بطن الجبل' },
  { value: 'Gharyan', en: 'Gharyan', ar: 'غريان' },
  { value: 'Yafran', en: 'Yafran', ar: 'يفرن' },
  { value: 'Kikla', en: 'Kikla', ar: 'ككلة' },
  { value: 'Jadu', en: 'Jadu', ar: 'جادو' },
  { value: 'Rhibat', en: 'Rhibat', ar: 'الرحيبات' },
  { value: 'Ryaina', en: 'Ryaina', ar: 'الرياينة' },
  { value: "Asbi'a", en: "Asbi'a", ar: 'الأصابعة' },
  { value: 'Rijban', en: 'Rijban', ar: 'الرجبان' },
  { value: 'Zintan', en: 'Zintan', ar: 'الزنتان' },
  { value: 'Dahr Eljabal', en: 'Dahr Eljabal', ar: 'ظهر الجبل' },
  { value: 'Haraba', en: 'Haraba', ar: 'حرابة' },
  { value: 'Nalut', en: 'Nalut', ar: 'نالوت' },
  { value: 'Wazzin', en: 'Wazzin', ar: 'وازن' },
  { value: 'Kabaw', en: 'Kabaw', ar: 'كاباو' },
  { value: 'Nesma', en: 'Nesma', ar: 'نسمة' },
  { value: 'Eshgiga', en: 'Eshgiga', ar: 'اشغيقة' },
  { value: 'Ghadames', en: 'Ghadames', ar: 'غدامس' },
  { value: 'Qatrun', en: 'Qatrun', ar: 'القطرون' },
  { value: 'Tawergha', en: 'Tawergha', ar: 'تاورغاء' },
  { value: 'Alghoraifa', en: 'Alghoraifa', ar: 'الغريفة' },
  { value: 'Dawon', en: 'Dawon', ar: 'داوون' },
  { value: 'Ariana', en: 'Ariana', ar: 'أريانة' },
  { value: 'Beja', en: 'Beja', ar: 'باجة' },
  { value: 'Ben Arous', en: 'Ben Arous', ar: 'بن عروس' },
  { value: 'Bizerte', en: 'Bizerte', ar: 'بنزرت' },
  { value: 'Gabes', en: 'Gabes', ar: 'قابس' },
  { value: 'Gafsa', en: 'Gafsa', ar: 'قفصة' },
  { value: 'Jendouba', en: 'Jendouba', ar: 'جندوبة' },
  { value: 'Kairouan', en: 'Kairouan', ar: 'القيروان' },
  { value: 'Kasserine', en: 'Kasserine', ar: 'القصرين' },
  { value: 'Kebili', en: 'Kebili', ar: 'قبلي' },
  { value: 'Kef', en: 'Kef', ar: 'الكاف' },
  { value: 'Mahdia', en: 'Mahdia', ar: 'المهدية' },
  { value: 'Manouba', en: 'Manouba', ar: 'منوبة' },
  { value: 'Medenine', en: 'Medenine', ar: 'مدنين' },
  { value: 'Monastir', en: 'Monastir', ar: 'المنستير' },
  { value: 'Nabeul', en: 'Nabeul', ar: 'نابل' },
  { value: 'Sfax', en: 'Sfax', ar: 'صفاقس' },
  { value: 'Sidi Bouzid', en: 'Sidi Bouzid', ar: 'سيدي بوزيد' },
  { value: 'Siliana', en: 'Siliana', ar: 'سليانة' },
  { value: 'Sousse', en: 'Sousse', ar: 'سوسة' },
  { value: 'Tataouine', en: 'Tataouine', ar: 'تطاوين' },
  { value: 'Tozeur', en: 'Tozeur', ar: 'توزر' },
  { value: 'Tunis', en: 'Tunis', ar: 'تونس' },
  { value: 'Zaghouan', en: 'Zaghouan', ar: 'زغوان' },

  { value: 'Cairo', en: 'Cairo', ar: 'القاهرة' },
  { value: 'Giza', en: 'Giza', ar: 'الجيزة' },
  { value: 'Alexandria', en: 'Alexandria', ar: 'الإسكندرية' },
  { value: 'Port Said', en: 'Port Said', ar: 'بورسعيد' },
  { value: 'Suez', en: 'Suez', ar: 'السويس' },
  { value: 'Ismailia', en: 'Ismailia', ar: 'الإسماعيلية' },
  { value: 'Damietta', en: 'Damietta', ar: 'دمياط' },
  { value: 'Mansoura', en: 'Mansoura', ar: 'المنصورة' },
  { value: 'Tanta', en: 'Tanta', ar: 'طنطا' },
  { value: 'Zagazig', en: 'Zagazig', ar: 'الزقازيق' },
  { value: 'Fayoum', en: 'Fayoum', ar: 'الفيوم' },
  { value: 'Beni Suef', en: 'Beni Suef', ar: 'بني سويف' },
  { value: 'Minya', en: 'Minya', ar: 'المنيا' },
  { value: 'Asyut', en: 'Asyut', ar: 'أسيوط' },
  { value: 'Sohag', en: 'Sohag', ar: 'سوهاج' },
  { value: 'Qena', en: 'Qena', ar: 'قنا' },
  { value: 'Luxor', en: 'Luxor', ar: 'الأقصر' },
  { value: 'Aswan', en: 'Aswan', ar: 'أسوان' },
  { value: 'Hurghada', en: 'Hurghada', ar: 'الغردقة' },
  { value: 'Sharm El Sheikh', en: 'Sharm El Sheikh', ar: 'شرم الشيخ' },
].reduce<LocationOption[]>((acc, opt) => {
  if (!acc.some((x) => x.value === opt.value)) acc.push(opt);
  return acc;
}, []).sort((a, b) => a.en.localeCompare(b.en));

const TUNISIA_VALUES = new Set<string>([
  'Ariana',
  'Beja',
  'Ben Arous',
  'Bizerte',
  'Gabes',
  'Gafsa',
  'Jendouba',
  'Kairouan',
  'Kasserine',
  'Kebili',
  'Kef',
  'Mahdia',
  'Manouba',
  'Medenine',
  'Monastir',
  'Nabeul',
  'Sfax',
  'Sidi Bouzid',
  'Siliana',
  'Sousse',
  'Tataouine',
  'Tozeur',
  'Tunis',
  'Zaghouan',
]);

const EGYPT_VALUES = new Set<string>([
  'Cairo',
  'Giza',
  'Alexandria',
  'Port Said',
  'Suez',
  'Ismailia',
  'Damietta',
  'Mansoura',
  'Tanta',
  'Zagazig',
  'Fayoum',
  'Beni Suef',
  'Minya',
  'Asyut',
  'Sohag',
  'Qena',
  'Luxor',
  'Aswan',
  'Hurghada',
  'Sharm El Sheikh',
]);

export function getLocationOptions(locale: LocaleKey): Array<{ value: string; label: string }> {
  return LOCATION_OPTIONS.map((o) => ({
    value: o.value,
    label: locale === 'ar' ? o.ar : o.en,
  }));
}

export function getLocationOptionGroups(locale: LocaleKey): LocationOptionGroup[] {
  const mapLabel = (o: LocationOption) => (locale === 'ar' ? o.ar : o.en);

  const allLibya = LOCATION_OPTIONS.find((o) => o.value === 'ALL_LIBYA');
  const allTunisia = LOCATION_OPTIONS.find((o) => o.value === 'ALL_TUNISIA');
  const allEgypt = LOCATION_OPTIONS.find((o) => o.value === 'ALL_EGYPT');

  const libya: LocationOption[] = [];
  const tunisia: LocationOption[] = [];
  const egypt: LocationOption[] = [];

  for (const o of LOCATION_OPTIONS) {
    if (o.value === 'ALL_LIBYA' || o.value === 'ALL_TUNISIA' || o.value === 'ALL_EGYPT') continue;
    if (TUNISIA_VALUES.has(o.value)) {
      tunisia.push(o);
      continue;
    }
    if (EGYPT_VALUES.has(o.value)) {
      egypt.push(o);
      continue;
    }
    libya.push(o);
  }

  const sortByLabel = (a: LocationOption, b: LocationOption) => mapLabel(a).localeCompare(mapLabel(b));
  libya.sort(sortByLabel);
  tunisia.sort(sortByLabel);
  egypt.sort(sortByLabel);

  const toOptions = (items: LocationOption[], all?: LocationOption | undefined) => {
    const out: Array<{ value: string; label: string }> = [];
    if (all) out.push({ value: all.value, label: mapLabel(all) });
    for (const o of items) out.push({ value: o.value, label: mapLabel(o) });
    return out;
  };

  return [
    {
      label: locale === 'ar' ? 'ليبيا' : 'Libya',
      options: toOptions(libya, allLibya),
    },
    {
      label: locale === 'ar' ? 'تونس' : 'Tunisia',
      options: toOptions(tunisia, allTunisia),
    },
    {
      label: locale === 'ar' ? 'مصر' : 'Egypt',
      options: toOptions(egypt, allEgypt),
    },
  ];
}

export function getLocationLabel(value: string | null | undefined, locale: LocaleKey): string {
  if (!value) return '';
  const found = LOCATION_OPTIONS.find((o) => o.value === value);
  if (!found) return value;
  return locale === 'ar' ? found.ar : found.en;
}
