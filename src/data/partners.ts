import type { Partner } from '@/types/partner'

export const partnersMock: Partner[] = [
  {
    id: 'roslynka',
    slug: 'roslynka',
    name: 'Roslynka',
    category: 'Воркшоп',
    location: 'UA/Київ',
    discount: {
      label: '10% знижки',
      promoCode: 'UPSTARS.ROSLYNKA',
      description: 'Діє на всі флораріуми та майстер-класи студії',
    },
    images: {
      thumbnail:
        'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=600&q=80',
      hero: 'https://images.unsplash.com/photo-1523419409543-0c1df022bdd1?auto=format&fit=crop&w=1200&q=80',
    },
    summary: 'Флораріум-студія та рослинні воркшопи для команд.',
    description:
      'Roslynka проводить творчі воркшопи з флораріумів та живих композицій. Для тіммейтів доступні індивідуальні комплекти з рослинами та матеріалами для домашньої збірки.',
    contact: {
      address: 'Київ, вул. Шулявська, 10',
      website: 'https://roslynka.com',
      email: 'hello@roslynka.com',
      phone: '+380 67 123 45 67',
    },
    socials: [
      {
        type: 'instagram',
        url: 'https://www.instagram.com/roslynka_studio/',
      },
      {
        type: 'facebook',
        url: 'https://www.facebook.com/roslynka',
      },
    ],
    terms: [
      'Знижка діє на майстер-класи та флораріуми власного виробництва.',
      'Не сумується з іншими акціями студії.',
      'Промокод потрібно назвати перед оплатою.',
    ],
    tags: ['тімбілдинг', 'рослини', 'творчість'],
  },
  {
    id: 'otoy',
    slug: 'otoy',
    name: 'Otoy.event',
    category: 'Воркшоп',
    location: 'UA/Київ',
    discount: {
      label: '-100 грн знижки',
      promoCode: 'UPSTARS100',
      description: 'На участь у командних арт-вечірках',
    },
    images: {
      thumbnail:
        'https://images.unsplash.com/photo-1511988617509-a57c8a288659?auto=format&fit=crop&w=600&q=80',
      hero: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80',
    },
    summary: 'Креативні арт-вечірки та воркшопи по створенню картин.',
    description:
      'Otoy.event організовує вечірки для команд, де кожен учасник створює власну картину під супровід професійного художника. Матеріали та напої включені.',
    contact: {
      address: 'Київ, вул. Сагайдачного, 25',
      website: 'https://otoy.event',
      phone: '+380 44 456 78 90',
    },
    socials: [
      { type: 'instagram', url: 'https://www.instagram.com/otoy.event/' },
      { type: 'facebook', url: 'https://www.facebook.com/otoyevent' },
    ],
    terms: [
      'Знижка діє для груп від 10 осіб.',
      'Попередня оплата 50% — обовʼязкова.',
      'Промокод активується під час бронювання дати.',
    ],
    tags: ['тімбілдинг', 'мистецтво'],
  },
  {
    id: 'reikartz',
    slug: 'reikartz',
    name: 'Reikartz',
    category: 'Подорожі',
    location: 'UA',
    discount: {
      label: '10% знижки',
      description: 'На бронювання номерів мережі',
      promoCode: 'UPSTARS10',
    },
    images: {
      thumbnail:
        'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=600&q=80',
      hero: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80',
    },
    summary: 'Мережа готелів по всій Україні з комфортними умовами.',
    description:
      'Reikartz Hospitality Group надає номерний фонд у різних містах України. Знижка поширюється на бронювання для особистих подорожей та відряджень.',
    contact: {
      website: 'https://reikartz.com',
      email: 'corporate@reikartz.com',
      phone: '+380 800 308 888',
    },
    socials: [{ type: 'facebook', url: 'https://www.facebook.com/reikartz' }],
    terms: [
      'Знижка застосовується на стандартні тарифи.',
      'Не діє на групові заїзди понад 20 осіб.',
      'Бронювання потрібно здійснювати через корпоративний відділ або офіційний сайт.',
    ],
    tags: ['готелі', 'подорожі', 'комфорт'],
  },
  {
    id: 'your-dream-trips',
    slug: 'your-dream-trips',
    name: 'Your Dream Trips',
    category: 'Подорожі',
    location: 'UA',
    discount: {
      label: '5% знижки',
      promoCode: 'UPSTARS5',
    },
    images: {
      thumbnail:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
      hero: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    },
    summary: 'Агентство індивідуальних турів та корпоративних подорожей.',
    description:
      'Команда Your Dream Trips підбирає маршрути та організовує індивідуальні тури по всьому світу. Працюють з корпоративними групами, відпустками та тревел-консьєрж сервісом.',
    contact: {
      website: 'https://yourdreamtrips.com',
      email: 'travel@ydt.com',
    },
    socials: [{ type: 'instagram', url: 'https://www.instagram.com/yourdreamtrips/' }],
    terms: [
      'Знижка застосовується до вартості наземного обслуговування.',
      'Авіаквитки та додаткові послуги не входять у промо.',
    ],
  },
  {
    id: 'ribas',
    slug: 'ribas-hotels',
    name: 'Ribas Hotels',
    category: 'Подорожі',
    location: 'UA',
    discount: {
      label: '10% знижки',
      promoCode: 'UPSTARS10',
    },
    images: {
      thumbnail:
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80',
      hero: 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80',
    },
    summary: 'Розгалужена мережа дизайн-готелів з сервісом на рівні.',
    description:
      'Ribas Hotels керує понад 30 готелями та апартаментами в Україні. Для тіммейтів UPSTARS діє фіксована знижка на проживання.',
    contact: {
      website: 'https://ribashotels.com',
      phone: '+380 93 123 45 67',
    },
    socials: [{ type: 'facebook', url: 'https://www.facebook.com/ribashotels/' }],
    terms: [
      'Пропозиція діє на прямі бронювання через сайт.',
      'Промокод потрібно ввести під час оформлення.',
    ],
  },
  {
    id: 'captain-kyiv',
    slug: 'captain-kyiv',
    name: 'Captain Kyiv',
    category: 'Подорожі',
    location: 'UA/Київ',
    discount: {
      label: '-30 грн знижки',
      description: 'На тематичні екскурсії містом',
      promoCode: 'UPSTARS30',
    },
    images: {
      thumbnail:
        'https://images.unsplash.com/photo-1548588684-1011785ee0f4?auto=format&fit=crop&w=600&q=80',
      hero: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80',
    },
    summary: 'Авторські екскурсії Києвом з елементами сторітелінгу та квесту.',
    description:
      'Команда Captain Kyiv проводить екскурсії по нестандартних маршрутах столиці. Вибирайте прогулянки вихідного дня або вечірні тури з дегустаціями.',
    contact: {
      website: 'https://captain.kyiv',
      phone: '+380 67 987 65 43',
    },
    socials: [{ type: 'instagram', url: 'https://www.instagram.com/captain.kyiv/' }],
    terms: [
      'Знижка діє на групові екскурсії до 15 осіб.',
      'Промокод необхідно вказати при бронюванні на сайті.',
    ],
  },
  {
    id: 'eurotrips',
    slug: 'eurotrips',
    name: 'Eurotrips',
    category: 'Подорожі',
    location: 'UA',
    discount: {
      label: '-20 EURO знижки',
      promoCode: 'UPSTARS20',
    },
    images: {
      thumbnail:
        'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=600&q=80',
      hero: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80',
    },
    summary: 'Міжнародні тури з молодіжною атмосферою.',
    description:
      'Eurotrips організовує подорожі Європою та світом з гідом, активностями та новими знайомствами. Для тіммейтів доступна знижка на будь-який тур.',
    contact: {
      website: 'https://eurotrips.com.ua',
      email: 'hello@eurotrips.com',
    },
    socials: [{ type: 'instagram', url: 'https://www.instagram.com/eurotripsua/' }],
    terms: [
      'Промокод діє на базову вартість туру.',
      'Не поширюється на додаткові опції та страховку.',
    ],
  },
  {
    id: 'travel-one',
    slug: 'travel-one',
    name: '1Travel',
    category: 'Подорожі',
    location: 'LT/Рига',
    discount: {
      label: '5% знижки',
      promoCode: 'UPSTARS5',
    },
    images: {
      thumbnail:
        'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=600&q=80',
      hero: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
    },
    summary: 'Латвійський тревел-оператор з турами по Скандинавії.',
    description:
      '1Travel спеціалізується на автобусних турах Балтією та Скандинавськими країнами. Знижка доступна для тіммейтів та їх друзів.',
    contact: {
      website: 'https://1travel.lv',
      phone: '+371 678 45 321',
      address: 'Латвія, Рига',
    },
    socials: [{ type: 'facebook', url: 'https://www.facebook.com/1travel.lv/' }],
    terms: [
      '5% на тури, екскурсії і чартерні авіабілети.',
      'Наш менеджер Olga Altuhova +371 67283006.',
      'Знижка поширюється на всі тури сезону 2025 року.',
    ],
  },
  {
    id: 'mandra',
    slug: 'mandra',
    name: 'Mandra',
    category: 'Подорожі',
    location: 'UA',
    discount: {
      label: '10% знижки',
      promoCode: 'UPSTARS10',
    },
    images: {
      thumbnail:
        'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80',
      hero: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80',
    },
    summary: 'Кемпінгові подорожі та відпочинок на природі.',
    description:
      'Mandra організовує кемпінги, глемпінг та активні тури територією України. Знижка діє на бронювання наметів та пакети відпочинку.',
    contact: {
      website: 'https://mandra.ua',
      email: 'relax@mandra.ua',
    },
    socials: [{ type: 'instagram', url: 'https://www.instagram.com/mandra.ua/' }],
    terms: [
      'Знижка діє на базові пакети та не сумується з іншими акціями.',
      'Промокод потрібно ввести під час бронювання на сайті.',
    ],
  },
  {
    id: 'integral',
    slug: 'integral',
    name: 'Integral',
    category: 'Здоровʼя',
    location: 'UA/Київ',
    discount: {
      label: '10% знижки',
      promoCode: 'UPSTARS',
      description: 'Діє на всі види тренувань та абонементи Integral.',
    },
    images: {
      thumbnail:
        'https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=600&q=80',
      hero: 'https://images.unsplash.com/photo-1483721310020-03333e577078?auto=format&fit=crop&w=1200&q=80',
    },
    summary: 'Фітнес-клуб з хот пілатесом, баре, йогою та функціональними тренуваннями.',
    description:
      'Integral пропонує студійні тренування у Києві та Варшаві: хот пілатес, баре, йога, функціональні та силові заняття. Команда UPSTARS отримує знижку на всі види тренувань, а промокод можна використовувати як офлайн, так і онлайн.',
    contact: {
      address: 'Київ, Іоанна Павла II, 21 / Казимира Малевича, 86П',
      website: 'https://app.fitssey.com/Integral/frontoffice',
    },
    socials: [{ type: 'instagram', url: 'https://www.instagram.com/integral.kyiv/' }],
    terms: [
      'Промокод UPSTARS діє як офлайн, так і онлайн.',
      'Цей код багаторазового використання — кожен тіммейт може використовувати його безлімітно протягом періоду дії.',
      'Код не діє на абонементи Welcome Pack, Morning Unlimited, Special Self-Care та подарункові сертифікати.',
      'Всі види тренувань та абонементів доступні із знижкою 10%.',
      '15% на всі класичні абонементи.',
      'Термін дії до 31.12.2025 року.',
    ],
    tags: ['фітнес', 'пілатес', 'йога'],
  },
]
