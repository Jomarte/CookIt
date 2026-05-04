export interface Country {
  code: string;
  pt: string;
  en: string;
}

export const COUNTRIES: Country[] = [
  { code: 'za', pt: 'África do Sul',    en: 'South Africa' },
  { code: 'de', pt: 'Alemanha',         en: 'Germany' },
  { code: 'ao', pt: 'Angola',           en: 'Angola' },
  { code: 'sa', pt: 'Arábia Saudita',  en: 'Saudi Arabia' },
  { code: 'dz', pt: 'Argélia',         en: 'Algeria' },
  { code: 'ar', pt: 'Argentina',        en: 'Argentina' },
  { code: 'au', pt: 'Austrália',        en: 'Australia' },
  { code: 'at', pt: 'Áustria',          en: 'Austria' },
  { code: 'bd', pt: 'Bangladesh',       en: 'Bangladesh' },
  { code: 'be', pt: 'Bélgica',          en: 'Belgium' },
  { code: 'br', pt: 'Brasil',           en: 'Brazil' },
  { code: 'bg', pt: 'Bulgária',         en: 'Bulgaria' },
  { code: 'cv', pt: 'Cabo Verde',       en: 'Cape Verde' },
  { code: 'ca', pt: 'Canadá',           en: 'Canada' },
  { code: 'cl', pt: 'Chile',            en: 'Chile' },
  { code: 'cn', pt: 'China',            en: 'China' },
  { code: 'co', pt: 'Colômbia',         en: 'Colombia' },
  { code: 'kr', pt: 'Coreia do Sul',    en: 'South Korea' },
  { code: 'hr', pt: 'Croácia',          en: 'Croatia' },
  { code: 'dk', pt: 'Dinamarca',        en: 'Denmark' },
  { code: 'eg', pt: 'Egito',            en: 'Egypt' },
  { code: 'ae', pt: 'Emirados Árabes',  en: 'UAE' },
  { code: 'sk', pt: 'Eslováquia',       en: 'Slovakia' },
  { code: 'es', pt: 'Espanha',          en: 'Spain' },
  { code: 'us', pt: 'Estados Unidos',   en: 'United States' },
  { code: 'et', pt: 'Etiópia',          en: 'Ethiopia' },
  { code: 'ph', pt: 'Filipinas',        en: 'Philippines' },
  { code: 'fi', pt: 'Finlândia',        en: 'Finland' },
  { code: 'fr', pt: 'França',           en: 'France' },
  { code: 'gh', pt: 'Gana',             en: 'Ghana' },
  { code: 'gr', pt: 'Grécia',           en: 'Greece' },
  { code: 'hu', pt: 'Hungria',          en: 'Hungary' },
  { code: 'in', pt: 'Índia',            en: 'India' },
  { code: 'id', pt: 'Indonésia',        en: 'Indonesia' },
  { code: 'ir', pt: 'Irão',             en: 'Iran' },
  { code: 'iq', pt: 'Iraque',           en: 'Iraq' },
  { code: 'il', pt: 'Israel',           en: 'Israel' },
  { code: 'it', pt: 'Itália',           en: 'Italy' },
  { code: 'jp', pt: 'Japão',            en: 'Japan' },
  { code: 'my', pt: 'Malásia',          en: 'Malaysia' },
  { code: 'ma', pt: 'Marrocos',         en: 'Morocco' },
  { code: 'mx', pt: 'México',           en: 'Mexico' },
  { code: 'mz', pt: 'Moçambique',       en: 'Mozambique' },
  { code: 'ng', pt: 'Nigéria',          en: 'Nigeria' },
  { code: 'no', pt: 'Noruega',          en: 'Norway' },
  { code: 'nz', pt: 'Nova Zelândia',    en: 'New Zealand' },
  { code: 'nl', pt: 'Países Baixos',    en: 'Netherlands' },
  { code: 'pk', pt: 'Paquistão',        en: 'Pakistan' },
  { code: 'pe', pt: 'Peru',             en: 'Peru' },
  { code: 'pl', pt: 'Polónia',          en: 'Poland' },
  { code: 'pt', pt: 'Portugal',         en: 'Portugal' },
  { code: 'ke', pt: 'Quénia',           en: 'Kenya' },
  { code: 'gb', pt: 'Reino Unido',      en: 'United Kingdom' },
  { code: 'cz', pt: 'República Checa',  en: 'Czech Republic' },
  { code: 'ro', pt: 'Roménia',          en: 'Romania' },
  { code: 'ru', pt: 'Rússia',           en: 'Russia' },
  { code: 'rs', pt: 'Sérvia',           en: 'Serbia' },
  { code: 'sg', pt: 'Singapura',        en: 'Singapore' },
  { code: 'se', pt: 'Suécia',           en: 'Sweden' },
  { code: 'ch', pt: 'Suíça',            en: 'Switzerland' },
  { code: 'th', pt: 'Tailândia',        en: 'Thailand' },
  { code: 'tn', pt: 'Tunísia',          en: 'Tunisia' },
  { code: 'tr', pt: 'Turquia',          en: 'Turkey' },
  { code: 'ua', pt: 'Ucrânia',          en: 'Ukraine' },
  { code: 've', pt: 'Venezuela',        en: 'Venezuela' },
  { code: 'vn', pt: 'Vietname',         en: 'Vietnam' },
];

export function getCountryCode(ptName: string): string {
  return COUNTRIES.find((c) => c.pt === ptName)?.code ?? '';
}

export function translateNationality(ptName: string, lang: 'pt' | 'en'): string {
  if (lang === 'pt') return ptName;
  return COUNTRIES.find((c) => c.pt === ptName)?.en ?? ptName;
}
