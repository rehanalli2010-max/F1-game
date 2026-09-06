/**
 * 2026 Formula 1 Teams & Constructors Database
 * Complete specs, liveries, color codes, driver numbers, and power units
 */

export const F1_TEAMS = [
  {
    id: 'ferrari',
    name: 'Ferrari',
    fullName: 'Scuderia Ferrari HP',
    driverNumber: '55',
    driverName: 'C. Sainz',
    primaryColor: 0xe10600,
    primaryHex: '#e10600',
    secondaryHex: '#0d0d0d',
    accentHex: '#efc107',
    accentColor: 0xefc107,
    haloColor: 0xe10600,
    powerUnit: 'Ferrari 066/12 1.6L V6 Turbo Hybrid',
    tagline: 'Maranello Passion & Pure Power',
    stats: { topSpeed: '344 km/h', aero: 'High', acceleration: '9.8/10' }
  },
  {
    id: 'redbull',
    name: 'Orion Racing',
    fullName: 'Orion Racing F1 Team',
    driverNumber: '07',
    driverName: 'Orion Pilot',
    primaryColor: 0x0a1d3b,
    primaryHex: '#0a1d3b',
    secondaryHex: '#0e1117',
    accentHex: '#e30613',
    accentColor: 0xffcc00,
    haloColor: 0x0a1d3b,
    powerUnit: 'Orion Kinetic V6 Turbo Hybrid',
    tagline: 'Aggressive Energy & Futuristic Aerodynamics',
    stats: { topSpeed: '348 km/h', aero: 'Extreme', acceleration: '9.9/10' }
  },
  {
    id: 'mercedes',
    name: 'Mercedes-AMG',
    fullName: 'Mercedes-AMG PETRONAS F1 Team',
    driverNumber: '44',
    driverName: 'L. Hamilton',
    primaryColor: 0xb8bcc0,
    primaryHex: '#b8bcc0',
    secondaryHex: '#0d1117',
    accentHex: '#00f0ff',
    accentColor: 0x00f0ff,
    haloColor: 0x0d1117,
    powerUnit: 'Mercedes-AMG M15 E Performance',
    tagline: 'Silver Arrows Aerodynamic Balance',
    stats: { topSpeed: '344 km/h', aero: 'High', acceleration: '9.7/10' }
  },
  {
    id: 'mclaren',
    name: 'McLaren',
    fullName: 'McLaren Formula 1 Team',
    driverNumber: '4',
    driverName: 'L. Norris',
    primaryColor: 0xff8000,
    primaryHex: '#ff8000',
    secondaryHex: '#00d2be',
    accentHex: '#141416',
    accentColor: 0x00d2be,
    haloColor: 0x141416,
    powerUnit: 'Mercedes-AMG M15 E Performance',
    tagline: 'Papaya Speed & High-G Agility',
    stats: { topSpeed: '346 km/h', aero: 'Extreme', acceleration: '9.8/10' }
  },
  {
    id: 'astonmartin',
    name: 'Aston Martin',
    fullName: 'Aston Martin Aramco F1 Team',
    driverNumber: '14',
    driverName: 'F. Alonso',
    primaryColor: 0x00594f,
    primaryHex: '#00594f',
    secondaryHex: '#cedc00',
    accentHex: '#0c221f',
    accentColor: 0xcedc00,
    haloColor: 0x00594f,
    powerUnit: 'Mercedes-AMG M15 E Performance',
    tagline: 'High-Downforce Cornering Precision',
    stats: { topSpeed: '341 km/h', aero: 'High', acceleration: '9.5/10' }
  },
  {
    id: 'alpine',
    name: 'Alpine',
    fullName: 'BWT Alpine F1 Team',
    driverNumber: '10',
    driverName: 'P. Gasly',
    primaryColor: 0x0090ff,
    primaryHex: '#0090ff',
    secondaryHex: '#fd4bc7',
    accentHex: '#111111',
    accentColor: 0xfd4bc7,
    haloColor: 0x0090ff,
    powerUnit: 'Renault E-Tech RE24',
    tagline: 'French Craftsmanship & Low Drag',
    stats: { topSpeed: '340 km/h', aero: 'Medium', acceleration: '9.4/10' }
  },
  {
    id: 'williams',
    name: 'Williams',
    fullName: 'Williams Racing',
    driverNumber: '23',
    driverName: 'A. Albon',
    primaryColor: 0x0040c0,
    primaryHex: '#0040c0',
    secondaryHex: '#00d2be',
    accentHex: '#ffffff',
    accentColor: 0x00d2be,
    haloColor: 0x0040c0,
    powerUnit: 'Mercedes-AMG M15 E Performance',
    tagline: 'Grove Straightline Trap Speed',
    stats: { topSpeed: '347 km/h', aero: 'Medium', acceleration: '9.5/10' }
  },
  {
    id: 'sauber',
    name: 'Kick Sauber',
    fullName: 'Stake F1 Team Kick Sauber',
    driverNumber: '77',
    driverName: 'V. Bottas',
    primaryColor: 0x00e700,
    primaryHex: '#00e700',
    secondaryHex: '#111111',
    accentHex: '#000000',
    accentColor: 0x00e700,
    haloColor: 0x000000,
    powerUnit: 'Ferrari 066/12 V6 Turbo Hybrid',
    tagline: 'High-Contrast Street Fighter',
    stats: { topSpeed: '339 km/h', aero: 'Medium', acceleration: '9.3/10' }
  },
  {
    id: 'haas',
    name: 'Haas',
    fullName: 'MoneyGram Haas F1 Team',
    driverNumber: '27',
    driverName: 'N. Hülkenberg',
    primaryColor: 0xe6002b,
    primaryHex: '#e6002b',
    secondaryHex: '#ffffff',
    accentHex: '#1a1a1a',
    accentColor: 0xffffff,
    haloColor: 0x1a1a1a,
    powerUnit: 'Ferrari 066/12 V6 Turbo Hybrid',
    tagline: 'American Mechanical Grip & Toughness',
    stats: { topSpeed: '342 km/h', aero: 'Medium', acceleration: '9.4/10' }
  },
  {
    id: 'rb',
    name: 'Racing Bulls',
    fullName: 'Visa Cash App RB F1 Team',
    driverNumber: '30',
    driverName: 'L. Lawson',
    primaryColor: 0x1634ca,
    primaryHex: '#1634ca',
    secondaryHex: '#ffffff',
    accentHex: '#d81e05',
    accentColor: 0xffffff,
    haloColor: 0x1634ca,
    powerUnit: 'Honda RBPT 1.6L V6 Turbo Hybrid',
    tagline: 'Faenza Rocket Sharp Handling',
    stats: { topSpeed: '344 km/h', aero: 'High', acceleration: '9.6/10' }
  }
];

export function getTeamById(id) {
  if (!id) return F1_TEAMS[0];
  const cleanId = String(id).toLowerCase().trim();
  if (cleanId === 'racingbulls' || cleanId === 'racing_bulls' || cleanId === 'vcarb') {
    return F1_TEAMS.find(t => t.id === 'rb') || F1_TEAMS[0];
  }
  return F1_TEAMS.find(t => t.id === cleanId) || F1_TEAMS[0];
}
