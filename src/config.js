// Watchora categories. Add new subcategories here.
export const CATEGORIES = [
  {
    slug: 'movies',
    name: 'Movies',
    blurb: 'Bollywood, Hollywood, South Indian and regional cinema.',
    subs: ['Bollywood', 'Hollywood', 'South Indian', 'Regional', 'Hindi Dubbed', 'Classics'],
  },
  {
    slug: 'web-series',
    name: 'Web Series',
    blurb: 'Bingeable shows from India and around the world.',
    subs: ['Indian', 'International', 'Korean', 'Hindi Dubbed'],
  },
  {
    slug: 'anime',
    name: 'Anime',
    blurb: 'Shonen, slice of life, fantasy and more.',
    subs: ['Series', 'Movies', 'Hindi Dubbed'],
  },
  {
    slug: 'drama',
    name: 'Drama',
    blurb: 'K-drama, C-drama, Turkish and Pakistani drama.',
    subs: ['Korean', 'Chinese', 'Turkish', 'Pakistani', 'Japanese'],
  },
  {
    slug: 'serials',
    name: 'TV Serials',
    blurb: 'Daily episodes for the whole family.',
    subs: ['Hindi', 'Bengali', 'Tamil', 'Telugu', 'Other'],
  },
];

// 18+ section: a separate page (/18plus). The main site only links to it.
export const ADULT = {
  slug: 'adult',
  name: '18+',
  blurb: 'Mature content for viewers aged 18 and over.',
  subs: ['Movies', 'Web Series'],
};

export const ALL_CATEGORIES = [...CATEGORIES, ADULT];


export const CERTIFICATES = ['U', 'UA 7+', 'UA 13+', 'UA 16+', 'A'];
export const STATUSES = ['Released', 'Ongoing', 'Completed', 'Upcoming'];
export const QUALITIES = ['480p', '720p', '1080p', '4K'];
export const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'South Korea', 'Japan', 'China', 'Turkey', 'Pakistan',
  'Spain', 'France', 'Germany', 'Canada', 'Australia', 'Thailand', 'Other',
];

export const GENRES = [
  'Action', 'Comedy', 'Drama', 'Romance', 'Thriller', 'Horror', 'Crime',
  'Mystery', 'Sci-Fi', 'Fantasy', 'Family', 'Adventure', 'Animation', 'Documentary',
  'Biography', 'History', 'Musical', 'Sports', 'War', 'Supernatural', 'Slice of Life', 'Mecha', 'Isekai',
];

export const catBySlug = (slug) => ALL_CATEGORIES.find((c) => c.slug === slug);

// Public link for a title: 18+ titles open inside /18plus
export const titlePath = (t) => (t.is_adult ? `/18plus/title/${t.slug}` : `/title/${t.slug}`);

// Movies have no episodes
export const isEpisodic = (title) =>
  title && !(title.category === 'movies' || title.subcategory === 'Movies');
