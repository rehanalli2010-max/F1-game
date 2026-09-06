import { i18n, SUPPORTED_LANGUAGES } from '../js/i18n.js';

console.log('Auditing i18n dictionary across all supported languages...');

const langs = Object.keys(SUPPORTED_LANGUAGES);
console.log('Supported languages:', langs);

// Get all keys defined in English (en)
const enDict = i18n.translations['en'] || {};
const allKeys = Object.keys(enDict);
console.log(`Total keys defined in English: ${allKeys.length}`);

const missingKeys = {};

for (const lang of langs) {
  const dict = i18n.translations[lang] || {};
  const missing = allKeys.filter(k => dict[k] === undefined);
  if (missing.length > 0) {
    missingKeys[lang] = missing;
  }
}

if (Object.keys(missingKeys).length === 0) {
  console.log('ALL LANGUAGES HAVE 100% COMPLETE TRANSLATION COVERAGE! NO MISSING KEYS!');
} else {
  console.log('Missing keys per language:', missingKeys);
}
