import * as THREE from 'three';

/**
 * Grand Prix Circuit Database
 * Data-driven definitions for the 10 existing circuits and five original fictional layouts.
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
      new THREE.Vector3(120, 1, 0),     // 1. Main Straight DRS Zone
      new THREE.Vector3(120, 3, 140),   // 2. Rettifilo Braking Point
      new THREE.Vector3(112, 5, 190),   // 3. Rettifilo Chicane Right
      new THREE.Vector3(98, 7, 220),    // 4. Rettifilo Chicane Left Exit
      new THREE.Vector3(50, 5, 245),    // 5. Curva Grande Sweeper Entry
      new THREE.Vector3(-20, 2, 225),   // 6. Curva Grande Midpoint
      new THREE.Vector3(-70, -1, 175),   // 7. Curva di Lesmo 1 Entry
      new THREE.Vector3(-110, -3, 110),  // 8. Curva di Lesmo 2
      new THREE.Vector3(-125, -2, 20),   // 9. Serraglio Straight
      new THREE.Vector3(-130, 1, -60),  // 10. Variante Ascari Entry
      new THREE.Vector3(-105, 5, -120), // 11. Variante Ascari Apex
      new THREE.Vector3(-70, 8, -160),  // 12. Ascari Exit Straight
      new THREE.Vector3(-20, 7, -210),  // 13. Curva Parabolica Entry
      new THREE.Vector3(45, 4, -225),   // 14. Curva Parabolica Apex
      new THREE.Vector3(95, 1, -205)    // 15. Parabolica Exit onto Main Straight
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
    difficultyRating: 'Hard',
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
    difficultyRating: 'Hard',
    difficultyScore: 4,
    lengthMeters: 2278,
    characteristics: 'Hamilton Straight • Maggotts & Becketts Complex • High-Speed Airfield Flow',
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
    // Authentic Silverstone Circuit (Hamilton Straight, Abbey, Farm, Village, The Loop, Aintree, Wellington Straight, Brooklands, Luffield, Woodcote, National Straight, Copse, Maggotts-Becketts-Chapel, Hangar Straight, Stowe, Vale, Club)
    controlPoints: [
      new THREE.Vector3(140, 0, 0),       // 0. Start/Finish Line & Gantry (Hamilton Straight)
      new THREE.Vector3(140, 1, 60),      // 1. Hamilton Straight Acceleration to Abbey
      new THREE.Vector3(155, 2, 120),     // 2. Abbey (Turn 1) - High-speed right sweeper
      new THREE.Vector3(135, 4, 180),     // 3. Farm Curve (Turn 2) - Left sweep
      new THREE.Vector3(85, 6, 220),      // 4. Village (Turn 3) - Right hander
      new THREE.Vector3(30, 8, 210),      // 5. The Loop (Turn 4) - Infield hairpin entry
      new THREE.Vector3(15, 10, 165),      // 6. The Loop - Hairpin apex
      new THREE.Vector3(35, 8, 115),      // 7. Aintree (Turn 5) - Acceleration corner
      new THREE.Vector3(-20, 5, 50),      // 8. Wellington Straight - Full Throttle
      new THREE.Vector3(-85, 2, -25),     // 9. Wellington Straight - DRS Zone
      new THREE.Vector3(-150, 0, -100),   // 10. Wellington Straight - Braking Point
      new THREE.Vector3(-200, -2, -145),   // 11. Brooklands (Turn 6) - Left sweeper
      new THREE.Vector3(-245, -4, -105),   // 12. Luffield (Turn 7) - Carousel entry
      new THREE.Vector3(-235, -5, -35),    // 13. Luffield - Carousel exit
      new THREE.Vector3(-195, -3, 40),     // 14. Woodcote (Turn 8) - Fast right
      new THREE.Vector3(-145, 0, 115),    // 15. National Straight
      new THREE.Vector3(-85, 4, 190),     // 16. Copse (Turn 9) - 290 km/h blind right
      new THREE.Vector3(-15, 8, 245),     // 17. Copse Exit to Maggotts
      new THREE.Vector3(55, 11, 275),      // 18. Maggotts (Turn 10) - Fast left flick
      new THREE.Vector3(115, 9, 270),     // 19. Becketts (Turns 11-12) - High-speed chicane
      new THREE.Vector3(170, 6, 230),     // 20. Chapel Curve (Turn 13) - Exit onto Hangar Straight
      new THREE.Vector3(230, 2, 150),     // 21. Hangar Straight - Full throttle acceleration
      new THREE.Vector3(275, -1, 50),      // 22. Hangar Straight - 330 km/h DRS straight
      new THREE.Vector3(290, -3, -65),     // 23. Hangar Straight - Stowe braking point
      new THREE.Vector3(270, -1, -165),    // 24. Stowe (Turn 15) - Fast right
      new THREE.Vector3(215, 3, -225),    // 25. Vale Entry
      new THREE.Vector3(165, 6, -240),    // 26. Vale Chicane (Turns 16-17)
      new THREE.Vector3(125, 5, -205),    // 27. Club Corner (Turn 18) - Apex
      new THREE.Vector3(138, 2, -150),    // 28. Club Exit onto Hamilton Straight
      new THREE.Vector3(140, 0, -80)      // 29. Hamilton Straight Grid Approach
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
    difficultyRating: 'Hard',
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
      new THREE.Vector3(80, 2, -140),   // 0. Start / Finish Line
      new THREE.Vector3(80, 0, -50),    // 1. Pit Straight Braking into La Source
      new THREE.Vector3(95, -2, 10),    // 2. La Source Hairpin Right Apex
      new THREE.Vector3(70, -6, 50),    // 3. Downhill Acceleration to Eau Rouge
      new THREE.Vector3(35, -12, 95),   // 4. Eau Rouge Valley Floor (Compression)
      new THREE.Vector3(0, 4, 140),     // 5. Raidillon Steep Blind Climb (+16m)
      new THREE.Vector3(-35, 20, 180),  // 6. Raidillon Crest (Summit +20m)
      new THREE.Vector3(-75, 24, 235),  // 7. Kemmel Straight High-Speed Climb
      new THREE.Vector3(-120, 26, 290), // 8. Kemmel Straight 330+ km/h
      new THREE.Vector3(-165, 22, 310), // 9. Les Combes Chicane
      new THREE.Vector3(-190, 16, 275), // 10. Malmedy Downhill Right
      new THREE.Vector3(-175, 10, 205), // 11. Bruxelles Downhill Hairpin
      new THREE.Vector3(-190, 5, 135),  // 12. No Name Corner
      new THREE.Vector3(-215, 0, 55),   // 13. Pouhon Double-Apex Downhill Left
      new THREE.Vector3(-200, -2, -25), // 14. Pouhon Exit Full Throttle
      new THREE.Vector3(-165, -2, -90), // 15. Fagnes Right-Left Chicane
      new THREE.Vector3(-120, -1, -150),// 16. Stavelot Banked Sweeper
      new THREE.Vector3(-60, 0, -195),  // 17. Blanchimont High-Speed Left
      new THREE.Vector3(15, 0, -210),   // 18. Blanchimont 2 Full Throttle
      new THREE.Vector3(55, 1, -185)    // 19. Bus Stop Chicane
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
    difficultyRating: 'Hard',
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
      new THREE.Vector3(90, 0, -130),   // 0. Main Straight Start/Finish
      new THREE.Vector3(90, 0, -20),    // 1. Main Straight
      new THREE.Vector3(80, 0, 45),     // 2. First Corner Entry
      new THREE.Vector3(55, 0, 85),     // 3. Turn 2 Apex Right
      new THREE.Vector3(25, 0, 105),    // 4. S-Curves Turn 3 (Left)
      new THREE.Vector3(-5, 0, 125),    // 5. S-Curves Turn 4 (Right)
      new THREE.Vector3(-30, 0, 110),   // 6. S-Curves Turn 5 (Left)
      new THREE.Vector3(-45, 0, 80),    // 7. S-Curves Turn 6 (Right)
      new THREE.Vector3(-75, 4, 50),    // 8. Dunlop Sweeper Uphill Left
      new THREE.Vector3(-105, 3.0, 10), // 9. Degner 1 Fast 90° Right (Descent to Underpass)
      new THREE.Vector3(-110, 0.0, -25),// 10. Degner 2 Underpass Floor
      new THREE.Vector3(-80, 0.0, -60), // 11. Cross-Under Straight
      new THREE.Vector3(-105, 0.0, -100),// 12. Hairpin Braking Zone
      new THREE.Vector3(-135, 0.0, -80),// 13. Hairpin Tight Apex (60 km/h)
      new THREE.Vector3(-135, 7.5, -30),// 14. 200R Sweeper Uphill Right (Bridge Approach, raised for underpass clearance)
      new THREE.Vector3(-95, 10.2, 10), // 15. Crossover Overpass Bridge (+10.2m Elevation Crest, raised for underpass clearance)
      new THREE.Vector3(-45, 8.0, 15),  // 16. Overpass Exit (Descent to Spoon, raised for underpass clearance)
      new THREE.Vector3(-10, 2.0, -40), // 17. Spoon Curve Entry
      new THREE.Vector3(15, 0, -105),   // 18. Spoon Curve Double-Left
      new THREE.Vector3(45, 0, -170),   // 19. Back Straight Flat-Out (310 km/h)
      new THREE.Vector3(80, 0, -210),   // 20. 130R Supersonic Left
      new THREE.Vector3(95, 0, -175)    // 21. Casio Triangle Chicane
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
    difficultyRating: 'Hard',
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
      new THREE.Vector3(90, 0, -120),   // 0. Pit Straight Start/Finish
      new THREE.Vector3(90, 1, -10),    // 1. Pit Straight
      new THREE.Vector3(75, 3, 45),     // 2. Sheares Turn 1 (Left)
      new THREE.Vector3(50, 5, 65),     // 3. Sheares Turn 2 & 3 Switchback
      new THREE.Vector3(10, 7, 50),     // 4. Republic Boulevard Straight
      new THREE.Vector3(-40, 9, 50),    // 5. Turn 5 Fast 90° Right
      new THREE.Vector3(-70, 7, 95),    // 6. Raffles Avenue Straight
      new THREE.Vector3(-70, 4, 160),   // 7. Raffles Avenue Sweeper
      new THREE.Vector3(-70, 1, 200),   // 8. Turn 7 (Memorial Corner) 90° Left
      new THREE.Vector3(-120, -2, 200),  // 9. Stamford Road
      new THREE.Vector3(-160, -4, 170),  // 10. Turn 8 (Padang) 90° Right
      new THREE.Vector3(-160, -2, 90),   // 11. St. Andrew's Road Straight
      new THREE.Vector3(-160, 1, 0),    // 12. Turn 9 (City Hall) 90° Left
      new THREE.Vector3(-140, 4, -45),  // 13. Anderson Bridge Historic Squeeze
      new THREE.Vector3(-105, 7, -65),  // 14. Turn 13 Tight Hairpin
      new THREE.Vector3(-60, 8, -55),   // 15. Esplanade Waterfront Drive
      new THREE.Vector3(-15, 5, -80),   // 16. Floating Stadium Promenade
      new THREE.Vector3(25, 2, -115),   // 17. Marina Bay Grandstand Chicane
      new THREE.Vector3(65, 0, -145)    // 18. Final Turn 22 & 23 Double-Apex
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
      new THREE.Vector3(120, 0, -140),  // 0. Oasis Main Straight Start/Finish
      new THREE.Vector3(120, 0, -20),   // 1. DRS Zone 1
      new THREE.Vector3(120, 0, 75),    // 2. Michael Schumacher Turn 1 Braking
      new THREE.Vector3(95, 0, 125),    // 3. Turn 1 Tight Hairpin Right
      new THREE.Vector3(60, 0, 135),    // 4. Turn 2 & 3 Switchback Acceleration
      new THREE.Vector3(25, 2, 90),     // 5. Infield Acceleration Straight
      new THREE.Vector3(5, 5, 40),      // 6. Turn 4 Wide Sweeping Uphill Right
      new THREE.Vector3(-25, 6, 15),    // 7. Turn 4 Exit Crest
      new THREE.Vector3(-60, 3, 20),    // 8. Turns 5-6-7 Downhill High-Speed S-Curves
      new THREE.Vector3(-95, 0, 40),    // 9. Turn 7 Exit into Valley
      new THREE.Vector3(-130, 0, 65),   // 10. Turn 8 Tight Right Hairpin
      new THREE.Vector3(-145, -2, 10),  // 11. Turns 9 & 10 Downhill Blind Off-Camber Trap
      new THREE.Vector3(-135, -3, -45), // 12. Turn 10 Tight Hairpin Apex
      new THREE.Vector3(-105, 0, -110), // 13. Back Straight Flat-Out DRS Zone
      new THREE.Vector3(-70, 0, -170),  // 14. Turn 11 Fast Uphill Left
      new THREE.Vector3(-25, 3, -195),  // 15. Turn 12 Uphill Sweeper Right
      new THREE.Vector3(25, 2, -185),   // 16. Turn 13 Heavy Braking Right
      new THREE.Vector3(75, 0, -175),   // 17. Turns 14 & 15 Final Sweeper
      new THREE.Vector3(105, 0, -155)   // 18. Final Corner Exit onto Oasis Straight
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
      new THREE.Vector3(80, 0, -110),   // 0. Start / Finish Line
      new THREE.Vector3(80, 2, -10),    // 1. Pit Straight
      new THREE.Vector3(70, 5, 40),     // 2. Turn 1 (Niki Lauda Kurve) Uphill 90° Right
      new THREE.Vector3(45, 9, 70),     // 3. Turn 1 Exit Full Throttle
      new THREE.Vector3(15, 16, 120),   // 4. Steep Styrian Mountain Drag Climb
      new THREE.Vector3(-20, 22, 175),  // 5. Steep Uphill Approach (+22m)
      new THREE.Vector3(-55, 24, 205),  // 6. Turn 3 (Remus Hairpin) Peak Elevation (+24m)
      new THREE.Vector3(-80, 23, 195),  // 7. Remus Hairpin Downhill Launch
      new THREE.Vector3(-105, 16, 140), // 8. Steep Mountain Descent
      new THREE.Vector3(-125, 10, 80),  // 9. Turn 4 (Schlossgold) Downhill Right
      new THREE.Vector3(-120, 6, 25),   // 10. Schlossgold Exit
      new THREE.Vector3(-95, 4, -25),   // 11. Turn 5 & 6 (Rauch Kurve) Fast Lefts
      new THREE.Vector3(-60, 2, -65),   // 12. Würth Kurve
      new THREE.Vector3(-25, 1, -95),   // 13. Turn 7 & 8 (Rindt Kurve) Double Right
      new THREE.Vector3(15, 0, -120),   // 14. Turn 9 (Red Bull Mobile) Fast Sweeper
      new THREE.Vector3(55, 0, -120)    // 15. Turn 10 Final Corner
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
    difficultyRating: 'Hard',
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
      new THREE.Vector3(90, 2, -120),   // 0. Start / Finish Line (Driven Counter-Clockwise)
      new THREE.Vector3(90, 0, -20),    // 1. Pit Straight
      new THREE.Vector3(90, -2, 40),    // 2. Senna S Heavy Braking Point
      new THREE.Vector3(75, -6, 95),    // 3. Senna S Turn 1 Downhill Left Drop
      new THREE.Vector3(45, -8, 125),   // 4. Senna S Turn 2 Uphill Right Flick
      new THREE.Vector3(10, -6, 105),   // 5. Senna S Exit
      new THREE.Vector3(-25, -4, 80),   // 6. Curva do Sol Long Accelerating Left
      new THREE.Vector3(-70, -2, 55),   // 7. Curva do Sol Exit onto Back Straight
      new THREE.Vector3(-120, 0, 25),   // 8. Reta Oposta Straight Flat-Out
      new THREE.Vector3(-170, 0, -15),  // 9. Reta Oposta Braking Zone
      new THREE.Vector3(-200, -4, -50), // 10. Descida do Lago Turn 4 Downhill Left
      new THREE.Vector3(-190, -6, -95), // 11. Descida do Lago Turn 5 Left
      new THREE.Vector3(-155, -5, -135),// 12. Ferradura Fast Right Sweeper
      new THREE.Vector3(-115, -3, -120),// 13. Ferradura Exit
      new THREE.Vector3(-85, -1, -75),  // 14. Curva do Laranjinha Left
      new THREE.Vector3(-75, 0, -35),   // 15. Pinheirinho Tight Infield Left
      new THREE.Vector3(-55, 1, -15),   // 16. Bico de Pato Sharp Right Hairpin
      new THREE.Vector3(-35, 1, -40),   // 17. Bico de Pato Exit
      new THREE.Vector3(-40, -1, -85),  // 18. Mergulho Fast Downhill Left Dive
      new THREE.Vector3(-25, 0, -135),  // 19. Junção Critical Uphill Left
      new THREE.Vector3(15, 4, -165),   // 20. Subida dos Boxes Steep Amphitheater Climb
      new THREE.Vector3(55, 5, -150),   // 21. Arquibancadas Banked Bowl Curve
      new THREE.Vector3(80, 3, -135)    // 22. Final Acceleration to Front Straight
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
    difficultyRating: 'Hard',
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
      new THREE.Vector3(120, 0, -190),  // 0. Neftchilar Avenue Start/Finish (350+ km/h straight)
      new THREE.Vector3(120, 0, -60),   // 1. Neftchilar Avenue Full Throttle
      new THREE.Vector3(120, 1, 50),    // 2. Neftchilar Avenue DRS Zone
      new THREE.Vector3(120, 3, 150),   // 3. Mega Straight Heavy Braking Zone
      new THREE.Vector3(95, 6, 190),    // 4. Turn 1 90° Left Corner
      new THREE.Vector3(55, 10, 190),    // 5. Short Street Straight
      new THREE.Vector3(25, 13, 190),    // 6. Turn 2 90° Left Corner
      new THREE.Vector3(25, 12, 135),    // 7. Government House Square Straight
      new THREE.Vector3(25, 8, 75),     // 8. Turn 3 90° Left Corner
      new THREE.Vector3(-10, 4, 75),    // 9. Turn 4 90° Right Corner
      new THREE.Vector3(-10, 0, 130),   // 10. Street Straight
      new THREE.Vector3(-45, -3, 130),   // 11. Turns 5 & 6 Chicane
      new THREE.Vector3(-75, -5, 105),   // 12. Turn 7 & Approach to Old Castle
      new THREE.Vector3(-100, -2, 60),   // 13. Medieval Fortress Wall Entrance
      new THREE.Vector3(-115, 3, 20),   // 14. Turn 8-9 (Icherisheher Narrow Castle Squeeze)
      new THREE.Vector3(-115, 8, -20),  // 15. Castle Tower Apex
      new THREE.Vector3(-95, 11, -50),   // 16. Turn 11-12 Exit from Fortress
      new THREE.Vector3(-65, 8, -85),   // 17. Turns 13 & 14 Acceleration Sweepers
      new THREE.Vector3(-35, 4, -135),  // 18. Turn 15 Downhill Left
      new THREE.Vector3(5, 1, -180),    // 19. Turn 16 onto Sea Promenade
      new THREE.Vector3(45, -1, -215),   // 20. Turns 17-18 Full Throttle
      new THREE.Vector3(85, 0, -220)    // 21. Turns 19-20 Blast joining the Mega Straight
    ]
  }

  // Five additional original, fictional circuits with different layouts and elevation profiles.
  // 11. Original fictional circuit: Ember Valley Circuit; not modelled on a real-world layout.
  {
    id: 'ember-valley',
    name: 'Ember Valley Circuit',
    fullName: 'Ember Valley Original Raceway',
    country: 'Veyra Basin',
    countryCode: 'VBR',
    flag: '🌄',
    laps: 20,
    difficultyRating: 'Easy',
    difficultyScore: 1,
    lengthMeters: 1470,
    characteristics: 'Wide flowing bends • Gentle ridge climbs • Forgiving run-off',
    trackWidth: 17,
    barrierDistance: 12.5,
    theme: {
      skyType: 'DAY',
      skyColor: 0x75b8d9,
      horizonColor: 0xd8f0ff,
      groundType: 'PARK_GRASS',
      groundColor: 0x377849,
      groundDetailColor: 0x2b643d,
      curbColors: ["#16a34a","#f8fafc"],
      barrierType: 'ARMCO',
      barrierColor: 0x94a3b8,
      barrierPostColor: 0x334155,
      props: 'PARK_TREES',
      lighting: {
        ambientColor: 0xffffff,
        ambientIntensity: 0.8,
        sunColor: 0xfff4dc,
        sunIntensity: 1.35,
        sunPos: [160, 210, 120],
        fogColor: 0xb5d7e8,
        fogDensity: 0.0007
      }
    },
    controlPoints: [
      new THREE.Vector3(18.1, 0, -159.5),
      new THREE.Vector3(96.1, 0.5, -162.1),
      new THREE.Vector3(172.5, 1.5, -142.3),
      new THREE.Vector3(241, 3, -105.9),
      new THREE.Vector3(254.4, 4, -46.2),
      new THREE.Vector3(242, 3, 8.9),
      new THREE.Vector3(216.7, 2, 56),
      new THREE.Vector3(196.2, 1, 102.4),
      new THREE.Vector3(161.6, 1, 148.5),
      new THREE.Vector3(105.9, 2, 187.7),
      new THREE.Vector3(28.2, 3, 198.3),
      new THREE.Vector3(-46.1, 5, 181.9),
      new THREE.Vector3(-107.4, 7, 158.2),
      new THREE.Vector3(-168.5, 9, 138.4),
      new THREE.Vector3(-234.5, 10, 112.5),
      new THREE.Vector3(-290.3, 8, 70.3),
      new THREE.Vector3(-311.3, 6, 13.8),
      new THREE.Vector3(-276.5, 4, -39.8),
      new THREE.Vector3(-224.2, 2, -80),
      new THREE.Vector3(-173.2, 1, -113.2),
      new THREE.Vector3(-123.3, 0.5, -149.7),
      new THREE.Vector3(-56.2, 0, -175.9)
    ]
  },

  // 12. Original fictional circuit: Cloudbreak Highlands; not modelled on a real-world layout.
  {
    id: 'cloudbreak-highlands',
    name: 'Cloudbreak Highlands',
    fullName: 'Cloudbreak Highlands Original Grand Prix',
    country: 'Cloudbreak Range',
    countryCode: 'CBR',
    flag: '🏔️',
    laps: 20,
    difficultyRating: 'Medium',
    difficultyScore: 3,
    lengthMeters: 1930,
    characteristics: 'Linked S-bends • Long mountain climb • Blind downhill braking zones',
    trackWidth: 15.5,
    barrierDistance: 11.5,
    theme: {
      skyType: 'DAY',
      skyColor: 0x769bbd,
      horizonColor: 0xd9e9f5,
      groundType: 'ALPINE_HILLS',
      groundColor: 0x476c55,
      groundDetailColor: 0x395a48,
      curbColors: ["#06b6d4","#ffffff"],
      barrierType: 'ARMCO',
      barrierColor: 0x7d8fa3,
      barrierPostColor: 0x263848,
      props: 'PINE_FOREST',
      lighting: {
        ambientColor: 0xffffff,
        ambientIntensity: 0.75,
        sunColor: 0xfff3dc,
        sunIntensity: 1.25,
        sunPos: [-130, 240, 95],
        fogColor: 0x9ab8c9,
        fogDensity: 0.001
      }
    },
    controlPoints: [
      new THREE.Vector3(107.6, 0, -234.9),
      new THREE.Vector3(188.9, 2, -223.9),
      new THREE.Vector3(262.9, 5, -190.3),
      new THREE.Vector3(290.6, 8, -125.2),
      new THREE.Vector3(271.8, 12, -56.2),
      new THREE.Vector3(239.5, 15, -2.4),
      new THREE.Vector3(217.2, 18, 40.4),
      new THREE.Vector3(228.2, 21, 92.5),
      new THREE.Vector3(237.5, 24, 163.5),
      new THREE.Vector3(205.4, 27, 230.8),
      new THREE.Vector3(136.1, 28, 275.5),
      new THREE.Vector3(45, 26, 267.4),
      new THREE.Vector3(-31.3, 23, 228.9),
      new THREE.Vector3(-82.1, 19, 179.3),
      new THREE.Vector3(-119.8, 15, 142),
      new THREE.Vector3(-183.4, 12, 132.7),
      new THREE.Vector3(-276.1, 8, 119),
      new THREE.Vector3(-359.8, 4, 74.4),
      new THREE.Vector3(-388.2, 0, 3.9),
      new THREE.Vector3(-345.9, -2, -64.3),
      new THREE.Vector3(-272.4, 0, -110.4),
      new THREE.Vector3(-193.8, 3, -133.3),
      new THREE.Vector3(-133.7, 6, -150.3),
      new THREE.Vector3(-96.8, 4, -195.9),
      new THREE.Vector3(-40.6, 1, -241.3),
      new THREE.Vector3(35.7, 0, -261.7)
    ]
  },

  // 13. Original fictional circuit: Copper Canyon Switchback; not modelled on a real-world layout.
  {
    id: 'copper-canyon',
    name: 'Copper Canyon Switchback',
    fullName: 'Copper Canyon Original Switchback Circuit',
    country: 'Copper Mesa',
    countryCode: 'CME',
    flag: '🌵',
    laps: 20,
    difficultyRating: 'Hard',
    difficultyScore: 5,
    lengthMeters: 2110,
    characteristics: 'Tight switchbacks • Steep mesa ascent • Technical canyon descent',
    trackWidth: 13.2,
    barrierDistance: 10.5,
    theme: {
      skyType: 'SUNSET',
      skyColor: 0xc66c4a,
      horizonColor: 0xf6bd88,
      groundType: 'DESERT_SAND',
      groundColor: 0xc98c4b,
      groundDetailColor: 0xb56d34,
      curbColors: ["#f97316","#fef3c7"],
      barrierType: 'CONCRETE_WALL',
      barrierColor: 0x9a725d,
      barrierPostColor: 0x513e32,
      props: 'DESERT_FLOODLIGHTS',
      lighting: {
        ambientColor: 0xffe7cd,
        ambientIntensity: 0.72,
        sunColor: 0xffb46b,
        sunIntensity: 1.35,
        sunPos: [210, 185, -100],
        fogColor: 0xdba77b,
        fogDensity: 0.0009
      }
    },
    controlPoints: [
      new THREE.Vector3(-14.7, 0, -295.2),
      new THREE.Vector3(37.2, 0, -320.9),
      new THREE.Vector3(94.3, 1, -323.6),
      new THREE.Vector3(140.2, 4, -281.4),
      new THREE.Vector3(154, 8, -199.1),
      new THREE.Vector3(141.7, 14, -119),
      new THREE.Vector3(146.7, 20, -76.4),
      new THREE.Vector3(195.5, 24, -51.5),
      new THREE.Vector3(253.4, 27, -4.5),
      new THREE.Vector3(301.1, 26, 70.1),
      new THREE.Vector3(289.2, 22, 146),
      new THREE.Vector3(226.1, 18, 185.3),
      new THREE.Vector3(149.7, 13, 181.6),
      new THREE.Vector3(92.5, 9, 163.1),
      new THREE.Vector3(65.6, 5, 187.6),
      new THREE.Vector3(38.7, 1, 254.2),
      new THREE.Vector3(-10.4, -3, 337.3),
      new THREE.Vector3(-76.1, -5, 363.1),
      new THREE.Vector3(-128.4, -3, 317.5),
      new THREE.Vector3(-143.5, 0, 224),
      new THREE.Vector3(-124.3, 4, 128.9),
      new THREE.Vector3(-124.8, 8, 79.9),
      new THREE.Vector3(-167.5, 12, 51.5),
      new THREE.Vector3(-218.7, 15, 4.4),
      new THREE.Vector3(-260.1, 13, -66.9),
      new THREE.Vector3(-267.3, 9, -149.2),
      new THREE.Vector3(-209, 5, -194.8),
      new THREE.Vector3(-130.8, 2, -193.7),
      new THREE.Vector3(-78.1, 1, -191.4),
      new THREE.Vector3(-57, 0, -257.9)
    ]
  },

  // 14. Original fictional circuit: Aurora Ridge Raceway; not modelled on a real-world layout.
  {
    id: 'aurora-ridge',
    name: 'Aurora Ridge Raceway',
    fullName: 'Aurora Ridge Original Mountain Raceway',
    country: 'Aurora Divide',
    countryCode: 'ARD',
    flag: '🌌',
    laps: 20,
    difficultyRating: 'Hard',
    difficultyScore: 5,
    lengthMeters: 2300,
    characteristics: 'Crest-blind hairpins • High-altitude sweepers • Rapid elevation changes',
    trackWidth: 13.5,
    barrierDistance: 10.8,
    theme: {
      skyType: 'NIGHT',
      skyColor: 0x101d3d,
      horizonColor: 0x34496d,
      groundType: 'ALPINE_HILLS',
      groundColor: 0x243746,
      groundDetailColor: 0x192c39,
      curbColors: ["#8b5cf6","#c4b5fd"],
      barrierType: 'ARMCO',
      barrierColor: 0x6b7280,
      barrierPostColor: 0x1f2937,
      props: 'FLOODLIGHT_TOWERS',
      lighting: {
        ambientColor: 0x9aa9ff,
        ambientIntensity: 0.55,
        sunColor: 0x9eb7ff,
        sunIntensity: 0.65,
        sunPos: [-100, 220, -160],
        fogColor: 0x202b52,
        fogDensity: 0.001
      }
    },
    controlPoints: [
      new THREE.Vector3(-71.1, 0, -330.1),
      new THREE.Vector3(-26.7, 1, -374.7),
      new THREE.Vector3(27.1, 4, -399),
      new THREE.Vector3(72, 8, -343.2),
      new THREE.Vector3(94.3, 12, -257.7),
      new THREE.Vector3(100.4, 16, -181.6),
      new THREE.Vector3(109.1, 21, -135.5),
      new THREE.Vector3(153.1, 26, -126.7),
      new THREE.Vector3(215.6, 30, -109.1),
      new THREE.Vector3(277, 33, -64.1),
      new THREE.Vector3(306.5, 34, 7.2),
      new THREE.Vector3(281.5, 31, 78.8),
      new THREE.Vector3(218.6, 27, 122.4),
      new THREE.Vector3(149.8, 22, 134),
      new THREE.Vector3(105.6, 17, 140.7),
      new THREE.Vector3(91.9, 12, 179.5),
      new THREE.Vector3(84.8, 8, 254.4),
      new THREE.Vector3(61.5, 3, 338.4),
      new THREE.Vector3(17.4, -2, 408.8),
      new THREE.Vector3(-41.1, -5, 432.9),
      new THREE.Vector3(-90.6, -4, 375.9),
      new THREE.Vector3(-114.3, -1, 280.4),
      new THREE.Vector3(-119.4, 4, 195),
      new THREE.Vector3(-125.1, 9, 141.1),
      new THREE.Vector3(-147.9, 13, 113.6),
      new THREE.Vector3(-196.9, 16, 94.3),
      new THREE.Vector3(-256.8, 18, 57),
      new THREE.Vector3(-298.6, 15, -6.8),
      new THREE.Vector3(-298.9, 10, -80.5),
      new THREE.Vector3(-241.6, 5, -128.9),
      new THREE.Vector3(-182.4, 2, -152.5),
      new THREE.Vector3(-130.7, 0, -158.2),
      new THREE.Vector3(-118.1, 1, -207.1),
      new THREE.Vector3(-104.3, 0, -277.5)
    ]
  },

  // 15. Original fictional circuit: Tidal Spiral Park; not modelled on a real-world layout.
  {
    id: 'tidal-spiral',
    name: 'Tidal Spiral Park',
    fullName: 'Tidal Spiral Original Coastal Circuit',
    country: 'Blueglass Coast',
    countryCode: 'BGC',
    flag: '🌊',
    laps: 20,
    difficultyRating: 'Easy',
    difficultyScore: 2,
    lengthMeters: 1540,
    characteristics: 'Coastal sweepers • Broad spiral turns • Gentle rolling elevation',
    trackWidth: 16.5,
    barrierDistance: 12,
    theme: {
      skyType: 'SUNSET',
      skyColor: 0x4f91b2,
      horizonColor: 0xf2c7a0,
      groundType: 'MARINA_HARBOR',
      groundColor: 0x164e63,
      groundDetailColor: 0x0e7490,
      curbColors: ["#22d3ee","#f8fafc"],
      barrierType: 'CONCRETE_WALL',
      barrierColor: 0x9db9c5,
      barrierPostColor: 0x304c5c,
      props: 'CITY_BUILDINGS',
      lighting: {
        ambientColor: 0xfff1df,
        ambientIntensity: 0.82,
        sunColor: 0xffc18b,
        sunIntensity: 1.2,
        sunPos: [170, 180, 40],
        fogColor: 0xa6c4d0,
        fogDensity: 0.0007
      }
    },
    controlPoints: [
      new THREE.Vector3(138.1, 0, -137.3),
      new THREE.Vector3(215, 1, -127.2),
      new THREE.Vector3(282.6, 2, -98.1),
      new THREE.Vector3(329.4, 4, -54.1),
      new THREE.Vector3(329.4, 5, -1.8),
      new THREE.Vector3(290.5, 4, 44.2),
      new THREE.Vector3(236.2, 2, 78.6),
      new THREE.Vector3(173.5, 1, 100),
      new THREE.Vector3(109.6, 2, 108.2),
      new THREE.Vector3(55.1, 5, 115.1),
      new THREE.Vector3(0.6, 8, 140.4),
      new THREE.Vector3(-74.5, 10, 160.5),
      new THREE.Vector3(-156.9, 12, 155.9),
      new THREE.Vector3(-227, 10, 128.3),
      new THREE.Vector3(-260.8, 8, 81.5),
      new THREE.Vector3(-254.4, 5, 31.2),
      new THREE.Vector3(-225.9, 2, -10.7),
      new THREE.Vector3(-190.6, 0, -42.7),
      new THREE.Vector3(-184, -2, -78.3),
      new THREE.Vector3(-178, 0, -125.8),
      new THREE.Vector3(-146.8, 1, -179.8),
      new THREE.Vector3(-74.5, 2, -214.1),
      new THREE.Vector3(15.5, 1, -203.5),
      new THREE.Vector3(85.9, 0, -169.3)
    ]
  }
];

/**
 * Helper to look up track by ID
 */
export function getTrackById(trackId) {
  return TRACK_DATABASE.find(t => t.id === trackId) || TRACK_DATABASE[0];
}
