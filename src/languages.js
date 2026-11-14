// Languages for audio, subtitles and original language.
// POPULAR shows first in pickers and in the public language filter.
export const POPULAR_LANGUAGES = [
  'Hindi', 'English', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi', 'Punjabi',
  'Gujarati', 'Urdu', 'Bhojpuri', 'Odia', 'Korean', 'Japanese', 'Chinese (Mandarin)', 'Spanish',
  'French', 'Arabic', 'Turkish',
];

const INDIAN = [
  'Assamese', 'Awadhi', 'Bodo', 'Chhattisgarhi', 'Dogri', 'Garhwali', 'Haryanvi', 'Kashmiri', 'Khasi',
  'Kokborok', 'Konkani', 'Kumaoni', 'Magahi', 'Maithili', 'Manipuri (Meitei)', 'Mizo', 'Nagamese',
  'Nepali', 'Rajasthani', 'Sanskrit', 'Santali', 'Sindhi', 'Sinhala', 'Tulu', 'Indian Sign Language',
];

const WORLD = [
  'Afrikaans', 'Albanian', 'American Sign Language', 'Amharic', 'Armenian', 'Azerbaijani', 'Basque',
  'Belarusian', 'Bosnian', 'Bulgarian', 'Burmese', 'Cantonese', 'Catalan', 'Cebuano', 'Chinese (Taiwanese Hokkien)',
  'Croatian', 'Czech', 'Danish', 'Dari', 'Dutch', 'Dzongkha', 'Esperanto', 'Estonian', 'Faroese', 'Fijian',
  'Filipino (Tagalog)', 'Finnish', 'Flemish', 'French (Canada)', 'Galician', 'Georgian', 'German', 'Greek',
  'Greenlandic', 'Guarani', 'Haitian Creole', 'Hausa', 'Hawaiian', 'Hebrew', 'Hmong', 'Hungarian', 'Icelandic',
  'Igbo', 'Ilocano', 'Indonesian', 'Inuktitut', 'Irish', 'Italian', 'Javanese', 'Kazakh', 'Khmer',
  'Kinyarwanda', 'Kurdish', 'Kyrgyz', 'Lao', 'Latin', 'Latvian', 'Lingala', 'Lithuanian', 'Luxembourgish',
  'Macedonian', 'Malagasy', 'Malay', 'Maltese', 'Maori', 'Mongolian', 'Navajo', 'Norwegian', 'Oromo',
  'Pashto', 'Persian (Farsi)', 'Polish', 'Portuguese', 'Portuguese (Brazil)', 'Quechua', 'Romanian',
  'Russian', 'Samoan', 'Scottish Gaelic', 'Serbian', 'Shona', 'Slovak', 'Slovenian', 'Somali',
  'Spanish (Latin America)', 'Sundanese', 'Swahili', 'Swedish', 'Tajik', 'Tatar', 'Thai', 'Tibetan',
  'Tigrinya', 'Tongan', 'Turkmen', 'Ukrainian', 'Uyghur', 'Uzbek', 'Vietnamese', 'Welsh', 'Wolof',
  'Xhosa', 'Yiddish', 'Yoruba', 'Zulu',
];

export const ALL_LANGUAGES = [
  ...POPULAR_LANGUAGES,
  ...[...INDIAN, ...WORLD].filter((l) => !POPULAR_LANGUAGES.includes(l)).sort((a, b) => a.localeCompare(b)),
  'No dialogue (silent)',
];

export const INDIAN_LANGUAGES = new Set([
  'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi', 'Punjabi', 'Gujarati', 'Urdu',
  'Bhojpuri', 'Odia', ...INDIAN,
]);
