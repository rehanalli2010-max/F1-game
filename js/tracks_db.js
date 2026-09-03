import * as THREE from 'three';

/**
 * Formula 1 Official 10-Track Circuit Database
 * Data-driven definitions for 10 distinct Grand Prix circuits.
 * Each circuit specifies 3D Catmull-Rom spline control points, road dimensions,
 * environmental themes (sky, ground, curbs, barriers, lighting), and race metadata.
 */
export const TRACK_DATABASE = [
  // 1. MONZA GP - Autodromo Nazionale Monza (Italy)
  {
    id: 'monza',
    name: 'Monza GP',
    fullName: 'Autodromo Nazionale Monza',
    country: 'Italy',
    countryCode: 'ITA',
    flag: '🇮🇹',
    laps: 20,
    difficultyRating: 'Medium',
    difficultyScore: 3,
    lengthMeters: 1880,
    characteristics: 'Temple of Speed • Long Flat-Out Straights • Fast Chicanes',
    trackWidth: 16.0,
    barrierDistance: 11.5,
    theme: {
      skyType: 'DAY',
      skyColor: 0x6ca6cd,
      horizonColor: 0xcae1ff,
      groundType: 'PARK_GRASS',
      groundColor: 0x2e6b35,
      groundDetailColor: 0x24542a,
      curbColors: ['#009246', '#ffffff', '#ce2b37'], // Italian Tricolore
      barrierType: 'ARMCO',
      barrierColor: 0x94a3b8,
      barrierPostColor: 0x334155,
      props: 'PARK_TREES',
      lighting: {
        ambientColor: 0xffffff,
        ambientIntensity: 0.75,
        sunColor: 0xfffaed,
        sunIntensity: 1.45,
        sunPos: [150, 220, 180],
        fogColor: 0xb8d4e8,
        fogDensity: 0.0008
      }
    },
    // Long main straight on Z axis, Rettifilo chicane, Curva Grande, Roggia chicane, Lesmos, Ascari, Parabolica
    controlPoints: [
      new THREE.Vector3(120, 0, -160),  // 0. Start / Finish Line
      new THREE.Vector3(120, 0, 0),     // 1. Main Straight DRS Zone
      new THREE.Vector3(120, 0, 140),   // 2. Rettifilo Braking Point
      new THREE.Vector3(112, 0, 190),   // 3. Rettifilo Chicane Right
      new THREE.Vector3(98, 0, 220),    // 4. Rettifilo Chicane Left Exit
      new THREE.Vector3(50, 0, 245),    // 5. Curva Grande Sweeper Entry
      new THREE.Vector3(-20, 0, 225),   // 6. Curva Grande Midpoint
      new THREE.Vector3(-70, 0, 175),   // 7. Curva di Lesmo 1 Entry
      new THREE.Vector3(-110, 0, 110),  // 8. Curva di Lesmo 2
      new THREE.Vector3(-125, 0, 20),   // 9. Serraglio Straight
      new THREE.Vector3(-130, 0, -60),  // 10. Variante Ascari Entry
      new THREE.Vector3(-105, 0, -120), // 11. Variante Ascari Apex
      new THREE.Vector3(-70, 0, -160),  // 12. Ascari Exit Straight
      new THREE.Vector3(-20, 0, -210),  // 13. Curva Parabolica Entry
      new THREE.Vector3(45, 0, -225),   // 14. Curva Parabolica Apex
      new THREE.Vector3(95, 0, -205)    // 15. Parabolica Exit onto Main Straight
    ]
  },

  // 2. MONACO GP - Circuit de Monaco (Monte Carlo)
  {
    id: 'monaco',
    name: 'Monaco GP',
    fullName: 'Circuit de Monaco, Monte Carlo',
    country: 'Monaco',
    countryCode: 'MON',
    flag: '🇲🇨',
    laps: 20,
    difficultyRating: 'Extreme',
    difficultyScore: 5,
    lengthMeters: 1560,
    characteristics: 'Tight Harbor Streets • Razor-Sharp Hairpin • Zero Runoff Margins',
    trackWidth: 13.5,
    barrierDistance: 9.5,
    theme: {
      skyType: 'DAY',
      skyColor: 0x4a90e2,
      horizonColor: 0x87ceeb,
      groundType: 'MARINA_HARBOR',
      groundColor: 0x1a365d, // Harbor water & asphalt promenades
      groundDetailColor: 0x0f2942,
      curbColors: ['#e10600', '#ffffff'],
      barrierType: 'CONCRETE_WALL',
      barrierColor: 0xd1d5db,
      barrierPostColor: 0x1f2937,
      props: 'CITY_BUILDINGS',
      lighting: {
        ambientColor: 0xffffff,
        ambientIntensity: 0.85,
        sunColor: 0xfff4e0,
        sunIntensity: 1.55,
        sunPos: [80, 240, 120],
        fogColor: 0x93c5fd,
        fogDensity: 0.0006
      }
    },
    // Sainte-Dévote, Beau Rivage climb, Massenet, Casino, Mirabeau, Fairmont Hairpin, Portier, Tunnel, Chicane, Tabac, Rascasse
    controlPoints: [
      new THREE.Vector3(90, 0, -130),   // 0. Start / Finish Boulevard
      new THREE.Vector3(90, 0, -20),    // 1. Pit Straight
      new THREE.Vector3(85, 0, 70),     // 2. Sainte-Dévote Braking Zone
      new THREE.Vector3(65, 4, 120),    // 3. Sainte-Dévote 90° Right
      new THREE.Vector3(30, 8, 160),    // 4. Beau Rivage Climb
      new THREE.Vector3(-15, 10, 175),  // 5. Massenet Sweeper Left
      new THREE.Vector3(-60, 9, 155),   // 6. Casino Square
      new THREE.Vector3(-90, 5, 110),   // 7. Mirabeau Haute Downhill
      new THREE.Vector3(-115, 2, 70),   // 8. Fairmont Grand Hotel Hairpin (Tight)
      new THREE.Vector3(-95, 0, 40),    // 9. Mirabeau Bas
      new THREE.Vector3(-65, 0, 10),    // 10. Portier Right Turn
      new THREE.Vector3(-30, 0, -30),   // 11. Tunnel Sweeper
      new THREE.Vector3(0, 0, -80),     // 12. Nouvelle Chicane
      new THREE.Vector3(15, 0, -120),   // 13. Tabac Left Turn
      new THREE.Vector3(45, 0, -155),   // 14. Louis Chiron & Swimming Pool
      new THREE.Vector3(75, 0, -150)    // 15. La Rascasse & Anthony Noghès
    ]
  },

  // 3. SILVERSTONE GP - Silverstone Circuit (Great Britain)
  {
    id: 'silverstone',
    name: 'Silverstone GP',
    fullName: 'Silverstone Circuit, Northamptonshire',
    country: 'Great Britain',
    countryCode: 'GBR',
    flag: '🇬🇧',
    laps: 20,
    difficultyRating: 'High',
    difficultyScore: 4,
    lengthMeters: 1980,
    characteristics: 'High-Speed Sweepers • Maggotts & Becketts Complex • Airfield Flow',
    trackWidth: 16.5,
    barrierDistance: 12.0,
    theme: {
      skyType: 'DAY',
      skyColor: 0x5b92e5,
      horizonColor: 0xbfdbfe,
      groundType: 'COUNTRY_GRASS',
      groundColor: 0x3d7a42,
      groundDetailColor: 0x2f6034,
      curbColors: ['#e10600', '#ffffff'],
      barrierType: 'ARMCO',
      barrierColor: 0x94a3b8,
      barrierPostColor: 0x1e293b,
      props: 'AIRFIELD_RUNOFF',
      lighting: {
        ambientColor: 0xffffff,
        ambientIntensity: 0.8,
        sunColor: 0xffffff,
        sunIntensity: 1.4,
        sunPos: [200, 200, -100],
        fogColor: 0xa5c9eb,
        fogDensity: 0.0007
      }
    },
    // Hamilton Straight, Abbey, Farm, The Loop, Aintree, Wellington, Brooklands, Luffield, Woodcote, Copse, Maggotts-Becketts-Chapel, Hangar Straight, Stowe, Club
    controlPoints: [
      new THREE.Vector3(130, 0, -140),  // 0. Hamilton Straight Start/Finish
      new THREE.Vector3(130, 0, 10),    // 1. Abbey Fast Right
      new THREE.Vector3(115, 0, 80),    // 2. Farm Curve Left
      new THREE.Vector3(80, 0, 125),    // 3. The Loop Tight Hairpin
      new THREE.Vector3(30, 0, 140),    // 4. Aintree Corner
      new THREE.Vector3(-30, 0, 130),   // 5. Wellington Straight
      new THREE.Vector3(-90, 0, 100),   // 6. Brooklands Sweeper
      new THREE.Vector3(-140, 0, 45),   // 7. Luffield Double Apex
      new THREE.Vector3(-160, 0, -25),  // 8. Woodcote Acceleration
      new THREE.Vector3(-145, 0, -90),  // 9. Copse High-Speed Right
      new THREE.Vector3(-110, 0, -150), // 10. Maggotts Entry Flick
      new THREE.Vector3(-65, 0, -185),  // 11. Becketts Chicane
      new THREE.Vector3(-15, 0, -195),  // 12. Chapel Curve Exit
      new THREE.Vector3(45, 0, -190),   // 13. Hangar Straight
      new THREE.Vector3(95, 0, -180)    // 14. Stowe Corner & Vale/Club
    ]
  },

  // 4. SPA-FRANCORCHAMPS - Circuit de Spa-Francorchamps (Belgium)
  {
    id: 'spa',
    name: 'Spa-Francorchamps',
    fullName: 'Circuit de Spa-Francorchamps, Ardennes',
    country: 'Belgium',
    countryCode: 'BEL',
    flag: '🇧🇪',
    laps: 20,
    difficultyRating: 'Extreme',
    difficultyScore: 5,
    lengthMeters: 2150,
    characteristics: 'Legendary Eau Rouge Elevation Plunge • Kemmel Straight • Ardennes Forest',
    trackWidth: 16.0,
    barrierDistance: 11.5,
    theme: {
      skyType: 'CLOUDY',
      skyColor: 0x4a6572,
      horizonColor: 0x7c909c,
      groundType: 'FOREST_TERRAIN',
      groundColor: 0x22482c,
      groundDetailColor: 0x18331f,
      curbColors: ['#ffd000', '#ce1126'], // Belgian Gold & Red
      barrierType: 'ARMCO',
      barrierColor: 0x85929e,
      barrierPostColor: 0x2c3e50,
      props: 'PINE_FOREST',
      lighting: {
        ambientColor: 0xe2e8f0,
        ambientIntensity: 0.7,
        sunColor: 0xfff2d6,
        sunIntensity: 1.25,
        sunPos: [100, 180, 80],
        fogColor: 0x6e828f,
        fogDensity: 0.0012 // Moody misty Ardennes atmosphere
      }
    },
    // La Source Hairpin, downhill to Eau Rouge, Raidillon crest (+18m elevation), Kemmel Straight, Les Combes, Bruxelles, Pouhon, Blanchimont, Bus Stop
    controlPoints: [
      new THREE.Vector3(140, 2, -150),  // 0. Start / Finish Straight
      new THREE.Vector3(140, 0, -40),   // 1. La Source Hairpin Braking Zone
      new THREE.Vector3(115, -3, 30),   // 2. La Source Hairpin Right Apex
      new THREE.Vector3(70, -8, 80),    // 3. Downhill Plunge to Eau Rouge
      new THREE.Vector3(20, -6, 120),   // 4. Eau Rouge Compression
      new THREE.Vector3(-25, 8, 150),   // 5. Raidillon Blind Crest (Climbing)
      new THREE.Vector3(-75, 14, 160),  // 6. Kemmel Straight Entry
      new THREE.Vector3(-130, 16, 130), // 7. Kemmel Straight Midpoint
      new THREE.Vector3(-170, 12, 80),  // 8. Les Combes Chicane
      new THREE.Vector3(-180, 8, 15),   // 9. Malmedy & Bruxelles Downhill Hairpin
      new THREE.Vector3(-160, 2, -45),  // 10. Pouhon Fast Double-Left
      new THREE.Vector3(-120, 0, -110), // 11. Campus Corner
      new THREE.Vector3(-70, 0, -165),  // 12. Stavelot Curve
      new THREE.Vector3(-15, 0, -190),  // 13. Blanchimont High-Speed Sweeper
      new THREE.Vector3(45, 0, -200),   // 14. Bus Stop Chicane Entry
      new THREE.Vector3(100, 1, -185)   // 15. Bus Stop Exit onto Main Straight
    ]
  },

  // 5. SUZUKA GP - Suzuka International Racing Course (Japan)
  {
    id: 'suzuka',
    name: 'Suzuka GP',
    fullName: 'Suzuka International Racing Course, Mie',
    country: 'Japan',
    countryCode: 'JPN',
    flag: '🇯🇵',
    laps: 20,
    difficultyRating: 'Extreme',
    difficultyScore: 5,
    lengthMeters: 1950,
    characteristics: 'Technical S-Curves • Degner Curves • 130R Supersonic Corner',
    trackWidth: 15.5,
    barrierDistance: 11.0,
    theme: {
      skyType: 'DAY',
      skyColor: 0x5680e9,
      horizonColor: 0x84ceeb,
      groundType: 'TECHNICAL_RUNOFF',
      groundColor: 0x3b6e44,
      groundDetailColor: 0x2c5233,
      curbColors: ['#e10600', '#ffffff'],
      barrierType: 'ARMCO',
      barrierColor: 0xa0aec0,
      barrierPostColor: 0x2d3748,
      props: 'CHERRY_TREES',
      lighting: {
        ambientColor: 0xffffff,
        ambientIntensity: 0.8,
        sunColor: 0xfffcf0,
        sunIntensity: 1.45,
        sunPos: [-120, 220, 150],
        fogColor: 0x93b7d8,
        fogDensity: 0.0007
      }
    },
    // Main Straight, First Corner, Technical S-Curves (1-4), Dunlop Curve, Degner 1 & 2, Hairpin, 200R, Spoon Curve, Back Straight, 130R, Casio Triangle
    controlPoints: [
      new THREE.Vector3(115, 0, -150),  // 0. Main Straight Start/Finish
      new THREE.Vector3(115, 0, -10),   // 1. First Corner Entry
      new THREE.Vector3(95, 0, 60),     // 2. First Corner Right
      new THREE.Vector3(65, 0, 110),    // 3. S-Curves Turn 1 (Left)
      new THREE.Vector3(30, 0, 140),    // 4. S-Curves Turn 2 (Right)
      new THREE.Vector3(-10, 0, 155),   // 5. S-Curves Turn 3 (Left)
      new THREE.Vector3(-55, 0, 140),   // 6. Dunlop Sweeper
      new THREE.Vector3(-95, 0, 100),   // 7. Degner 1 & 2
      new THREE.Vector3(-135, 0, 45),   // 8. Hairpin Braking Zone
      new THREE.Vector3(-150, 0, -10),  // 9. Hairpin Tight Apex
      new THREE.Vector3(-130, 0, -70),  // 10. 200R Sweeper
      new THREE.Vector3(-90, 0, -125),  // 11. Spoon Curve Entry
      new THREE.Vector3(-45, 0, -165),  // 12. Spoon Curve Exit
      new THREE.Vector3(15, 0, -195),   // 13. Back Straight Flat-Out
      new THREE.Vector3(65, 0, -200),   // 14. 130R High-Speed Left
      new THREE.Vector3(95, 0, -180)    // 15. Casio Triangle Chicane
    ]
  },

  // 6. SINGAPORE NIGHT GP - Marina Bay Street Circuit (Singapore)
  {
    id: 'singapore',
    name: 'Singapore Night GP',
    fullName: 'Marina Bay Street Circuit, Marina Centre',
    country: 'Singapore',
    countryCode: 'SGP',
    flag: '🇸🇬',
    laps: 20,
    difficultyRating: 'High',
    difficultyScore: 4,
    lengthMeters: 1780,
    characteristics: 'Under the Floodlights • Ultra-Grippy Night Asphalt • City Skyline',
    trackWidth: 14.5,
    barrierDistance: 10.0,
    theme: {
      skyType: 'NIGHT',
      skyColor: 0x050811,
      horizonColor: 0x0b1329,
      groundType: 'URBAN_ASPHALT',
      groundColor: 0x111827,
      groundDetailColor: 0x0b0f19,
      curbColors: ['#00f0ff', '#ffffff'], // Neon Cyan & White
      barrierType: 'FLOODLIGHT_WALLS',
      barrierColor: 0x475569,
      barrierPostColor: 0x0284c7, // Neon illuminated posts
      props: 'FLOODLIGHT_TOWERS',
      lighting: {
        ambientColor: 0x1e293b,
        ambientIntensity: 0.45,
        sunColor: 0x7dd3fc, // Cool moonlight/floodlight glow
        sunIntensity: 0.6,
        sunPos: [0, 280, 0],
        fogColor: 0x070d1e,
        fogDensity: 0.0014
      }
    },
    // Pit Straight, Sheares Turn 1-2-3, Republic Blvd, Turn 5, Raffles Ave, Memorial Corner, Padang, Singapore Sling chicane, Esplanade, Bay Grandstand
    controlPoints: [
      new THREE.Vector3(100, 0, -140),  // 0. Pit Straight Start/Finish
      new THREE.Vector3(100, 0, -20),   // 1. Pit Straight
      new THREE.Vector3(90, 0, 50),     // 2. Turn 1 (Sheares) Braking
      new THREE.Vector3(65, 0, 100),    // 3. Turn 2 & 3 Switchback
      new THREE.Vector3(25, 0, 135),    // 4. Republic Boulevard Straight
      new THREE.Vector3(-25, 0, 150),   // 5. Turn 5 Fast Right
      new THREE.Vector3(-75, 0, 135),   // 6. Raffles Avenue Sweeper
      new THREE.Vector3(-120, 0, 95),   // 7. Turn 7 (Memorial Corner)
      new THREE.Vector3(-145, 0, 40),   // 8. Stamford Road
      new THREE.Vector3(-150, 0, -20),  // 9. Padang 90° Left
      new THREE.Vector3(-130, 0, -75),  // 10. Singapore Sling Chicane
      new THREE.Vector3(-95, 0, -130),  // 11. Anderson Bridge
      new THREE.Vector3(-55, 0, -170),  // 12. Esplanade Drive
      new THREE.Vector3(-10, 0, -195),  // 13. Marina Bay Grandstand Turns
      new THREE.Vector3(45, 0, -190),   // 14. Floating Stadium Section
      new THREE.Vector3(80, 0, -170)    // 15. Final Turns 22 & 23
    ]
  },

  // 7. BAHRAIN DESERT GP - Bahrain International Circuit (Sakhir)
  {
    id: 'bahrain',
    name: 'Bahrain Desert GP',
    fullName: 'Bahrain International Circuit, Sakhir',
    country: 'Bahrain',
    countryCode: 'BHR',
    flag: '🇧🇭',
    laps: 20,
    difficultyRating: 'Medium',
    difficultyScore: 3,
    lengthMeters: 1890,
    characteristics: 'Sunset Desert Twilight • Heavy Braking Turn 1 • Off-Camber Sweepers',
    trackWidth: 16.0,
    barrierDistance: 11.5,
    theme: {
      skyType: 'SUNSET',
      skyColor: 0x9a3412,
      horizonColor: 0xf59e0b,
      groundType: 'DESERT_SAND',
      groundColor: 0xb58548, // Warm golden desert sand
      groundDetailColor: 0x8a6332,
      curbColors: ['#dc2626', '#ffffff'],
      barrierType: 'ARMCO',
      barrierColor: 0xd97706,
      barrierPostColor: 0x78350f,
      props: 'DESERT_FLOODLIGHTS',
      lighting: {
        ambientColor: 0xfef3c7,
        ambientIntensity: 0.8,
        sunColor: 0xfbbf24,
        sunIntensity: 1.5,
        sunPos: [-200, 90, -150], // Low golden sunset angle
        fogColor: 0xd97706,
        fogDensity: 0.0009
      }
    },
    // Main Straight, Michael Schumacher Hairpin Turn 1, Turns 2-3 acceleration, Turn 4 downhill, Turns 9-10 lockup trap, Back Straight, Final turns
    controlPoints: [
      new THREE.Vector3(125, 0, -150),  // 0. Oasis Main Straight Start/Finish
      new THREE.Vector3(125, 0, 0),     // 1. DRS Zone 1
      new THREE.Vector3(120, 0, 120),   // 2. Schumacher Turn 1 Braking
      new THREE.Vector3(95, 0, 170),    // 3. Turn 1 Tight Right Apex
      new THREE.Vector3(60, 0, 205),    // 4. Turns 2 & 3 Acceleration
      new THREE.Vector3(10, 0, 220),    // 5. Turn 4 Wide Sweeper
      new THREE.Vector3(-45, 0, 200),   // 6. Turns 5 & 6 High-Speed Flick
      new THREE.Vector3(-95, 0, 160),   // 7. Turn 8 Tight Hairpin
      new THREE.Vector3(-135, 0, 100),  // 8. Turns 9 & 10 Downhill Off-Camber Trap
      new THREE.Vector3(-145, 0, 30),   // 9. Back Straight DRS Zone
      new THREE.Vector3(-130, 0, -40),  // 10. Turn 11 Sweeper Right
      new THREE.Vector3(-100, 0, -100), // 11. Turn 12 Uphill Sweeper
      new THREE.Vector3(-60, 0, -155),  // 12. Turn 13 Heavy Braking
      new THREE.Vector3(-10, 0, -195),  // 13. Back Acceleration Straight
      new THREE.Vector3(45, 0, -210),   // 14. Turn 14 & 15 Final Sweeper
      new THREE.Vector3(95, 0, -190)    // 15. Final Corner Exit onto Straight
    ]
  },

  // 8. RED BULL RING - Red Bull Ring, Spielberg (Austria)
  {
    id: 'redbullring',
    name: 'Red Bull Ring',
    fullName: 'Red Bull Ring, Spielberg, Styria',
    country: 'Austria',
    countryCode: 'AUT',
    flag: '🇦🇹',
    laps: 20,
    difficultyRating: 'Medium',
    difficultyScore: 3,
    lengthMeters: 1620,
    characteristics: 'Styrian Mountain Hills • Punchy Uphill Hairpins • Short Lap Time',
    trackWidth: 15.5,
    barrierDistance: 11.0,
    theme: {
      skyType: 'DAY',
      skyColor: 0x4a90e2,
      horizonColor: 0xa0c4ff,
      groundType: 'ALPINE_HILLS',
      groundColor: 0x2d6a4f,
      groundDetailColor: 0x1b4332,
      curbColors: ['#e10600', '#ffffff'], // Austrian Red & White
      barrierType: 'ARMCO',
      barrierColor: 0x94a3b8,
      barrierPostColor: 0x1e293b,
      props: 'ALPINE_CHALETS',
      lighting: {
        ambientColor: 0xffffff,
        ambientIntensity: 0.85,
        sunColor: 0xfffaed,
        sunIntensity: 1.5,
        sunPos: [120, 260, 100],
        fogColor: 0x93c5fd,
        fogDensity: 0.0006
      }
    },
    // Start Straight, Turn 1 (Niki Lauda Kurve), Steep Uphill to Turn 3 (Remus Hairpin, +16m elevation), Downhill Rauch Kurve, Würth Kurve, Rindt Kurve, Red Bull Mobile
    controlPoints: [
      new THREE.Vector3(95, 0, -130),   // 0. Start / Finish Line
      new THREE.Vector3(95, 2, -10),    // 1. Pit Straight
      new THREE.Vector3(90, 5, 80),     // 2. Niki Lauda Kurve Braking
      new THREE.Vector3(70, 8, 140),    // 3. Turn 1 90° Right Apex
      new THREE.Vector3(35, 14, 190),   // 4. Steep Uphill Full Throttle Climb
      new THREE.Vector3(-15, 18, 210),  // 5. Remus Hairpin Braking Zone (+18m)
      new THREE.Vector3(-55, 16, 200),  // 6. Remus Hairpin Tight Apex (Peak)
      new THREE.Vector3(-90, 10, 160),  // 7. Downhill Plunge Acceleration
      new THREE.Vector3(-125, 4, 100),  // 8. Turn 4 (Schlossgold) Braking
      new THREE.Vector3(-140, 1, 40),   // 9. Turn 5 Sweeper
      new THREE.Vector3(-130, 0, -20),  // 10. Turn 6 Fast Left (Würth Kurve)
      new THREE.Vector3(-100, 0, -80),  // 11. Turn 7 Rindt Kurve Apex
      new THREE.Vector3(-60, 0, -130),  // 12. Turn 8 Acceleration
      new THREE.Vector3(-15, 0, -170),  // 13. Turn 9 (Red Bull Mobile) Sweeper
      new THREE.Vector3(40, 0, -175),   // 14. Turn 10 Final Corner
      new THREE.Vector3(75, 0, -160)    // 15. Exit onto Front Straight
    ]
  },

  // 9. INTERLAGOS - Autódromo José Carlos Pace (Brazil)
  {
    id: 'interlagos',
    name: 'Interlagos GP',
    fullName: 'Autódromo José Carlos Pace, São Paulo',
    country: 'Brazil',
    countryCode: 'BRA',
    flag: '🇧🇷',
    laps: 20,
    difficultyRating: 'High',
    difficultyScore: 4,
    lengthMeters: 1740,
    characteristics: 'Anti-Clockwise Natural Bowl • Famous Senna S • Banked Curve Arquibancadas',
    trackWidth: 16.0,
    barrierDistance: 11.5,
    theme: {
      skyType: 'DAY',
      skyColor: 0x3b82f6,
      horizonColor: 0x93c5fd,
      groundType: 'TROPICAL_GRASS',
      groundColor: 0x226b38,
      groundDetailColor: 0x164e28,
      curbColors: ['#ffd000', '#009933'], // Brazilian Gold & Green
      barrierType: 'ARMCO',
      barrierColor: 0x94a3b8,
      barrierPostColor: 0x1e293b,
      props: 'TROPICAL_TREES',
      lighting: {
        ambientColor: 0xffffff,
        ambientIntensity: 0.8,
        sunColor: 0xfff7ed,
        sunIntensity: 1.5,
        sunPos: [-150, 220, 100],
        fogColor: 0x93c5fd,
        fogDensity: 0.0007
      }
    },
    // Senna S downhill left-right flick, Curva do Sol, Reta Oposta, Descida do Lago, Ferradura, Pinheirinho, Bico de Pato, Mergulho, Junção, Arquibancadas
    controlPoints: [
      new THREE.Vector3(110, 0, -140),  // 0. Start / Finish Line
      new THREE.Vector3(110, 0, 0),     // 1. Pit Straight
      new THREE.Vector3(105, 0, 90),    // 2. Senna S Braking Zone
      new THREE.Vector3(85, -4, 145),   // 3. Senna S Turn 1 Downhill Left
      new THREE.Vector3(50, -6, 180),   // 4. Senna S Turn 2 Right Flick
      new THREE.Vector3(0, -6, 195),    // 5. Curva do Sol Sweeping Left
      new THREE.Vector3(-55, -4, 185),  // 6. Reta Oposta Straight
      new THREE.Vector3(-105, -2, 150), // 7. Descida do Lago Corner
      new THREE.Vector3(-140, 0, 95),   // 8. Ferradura Fast Right
      new THREE.Vector3(-150, 2, 30),   // 9. Pinheirinho Infield Hairpin
      new THREE.Vector3(-135, 3, -35),  // 10. Bico de Pato Tight Hairpin
      new THREE.Vector3(-100, 2, -90),  // 11. Mergulho High-Speed Left
      new THREE.Vector3(-60, 0, -145),  // 12. Junção Left Turn
      new THREE.Vector3(-10, 2, -185),  // 13. Subida dos Boxes Uphill
      new THREE.Vector3(45, 4, -195),   // 14. Arquibancadas Banked Sweeper
      new THREE.Vector3(85, 2, -175)    // 15. Front Straight Approach
    ]
  },

  // 10. BAKU CITY CIRCUIT - Baku City Circuit (Azerbaijan)
  {
    id: 'baku',
    name: 'Baku City Circuit',
    fullName: 'Baku City Circuit, Caspian Sea Promenade',
    country: 'Azerbaijan',
    countryCode: 'AZE',
    flag: '🇦🇿',
    laps: 20,
    difficultyRating: 'Extreme',
    difficultyScore: 5,
    lengthMeters: 2200,
    characteristics: 'Mega 2.2km Flat-Out Straight (350+ km/h) • Narrow Old Castle Section',
    trackWidth: 15.0,
    barrierDistance: 10.5,
    theme: {
      skyType: 'DAY',
      skyColor: 0x4f86c6,
      horizonColor: 0x93b7d8,
      groundType: 'CITY_PROMENADE',
      groundColor: 0x27272a, // Caspian sea asphalt & paving stones
      groundDetailColor: 0x18181b,
      curbColors: ['#0092bc', '#e10600'], // Baku Blue & Red
      barrierType: 'CONCRETE_WALL',
      barrierColor: 0xc4c7cc,
      barrierPostColor: 0x18181b,
      props: 'CASTLE_WALLS',
      lighting: {
        ambientColor: 0xffffff,
        ambientIntensity: 0.85,
        sunColor: 0xfffcf2,
        sunIntensity: 1.55,
        sunPos: [180, 240, -120],
        fogColor: 0x93b7d8,
        fogDensity: 0.0006
      }
    },
    // Neftchilar Avenue (huge straight), Turn 1-2 90° Lefts, Government House, Turn 3-4, Narrow Castle Section (Turns 8-10, 7.6m width), High-speed sweepers 13-15
    controlPoints: [
      new THREE.Vector3(135, 0, -180),  // 0. Neftchilar Avenue Start/Finish (350+ km/h straight)
      new THREE.Vector3(135, 0, -40),   // 1. Neftchilar Avenue Midpoint
      new THREE.Vector3(135, 0, 90),    // 2. Main Straight DRS End (Heavy Braking)
      new THREE.Vector3(115, 0, 160),   // 3. Turn 1 90° Left Corner
      new THREE.Vector3(75, 0, 195),    // 4. Turn 2 90° Left Corner
      new THREE.Vector3(25, 0, 200),    // 5. Government House Straight
      new THREE.Vector3(-30, 0, 185),   // 6. Turn 3 90° Left
      new THREE.Vector3(-75, 0, 150),   // 7. Turn 4 90° Right
      new THREE.Vector3(-115, 0, 100),  // 8. Turn 7 & Approach to Old Castle
      new THREE.Vector3(-140, 2, 45),   // 9. Narrow Old City Wall (Icherisheher)
      new THREE.Vector3(-145, 2, -15),  // 10. Castle Wall Chicane
      new THREE.Vector3(-125, 0, -75),  // 11. Turn 12 Exit from Fortress
      new THREE.Vector3(-90, 0, -135),  // 12. Turn 13 & 14 Acceleration Sweeper
      new THREE.Vector3(-45, 0, -185),  // 13. Turn 15 Downhill Left
      new THREE.Vector3(20, 0, -220),   // 14. Turn 16 onto Sea Promenade
      new THREE.Vector3(85, 0, -215)    // 15. Turns 17-20 Flat-Out Acceleration onto Mega Straight
    ]
  }
];

/**
 * Helper to look up track by ID
 */
export function getTrackById(trackId) {
  return TRACK_DATABASE.find(t => t.id === trackId) || TRACK_DATABASE[0];
}
