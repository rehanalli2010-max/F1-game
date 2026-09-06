/**
 * Formula 1 3D Web Racing Simulator - Internationalization & Localization Engine (i18n)
 * Provides automatic geographic/browser locale detection (e.g. Italian in Italy)
 * with manual override and comprehensive translations for all HUD, sessions, alerts, and modals.
 */

export const SUPPORTED_LANGUAGES = {
  it: { code: 'it', name: 'Italiano', flag: '🇮🇹', region: 'Italia' },
  en: { code: 'en', name: 'English', flag: '🇬🇧', region: 'International' },
  es: { code: 'es', name: 'Español', flag: '🇪🇸', region: 'España / Latinoamérica' },
  fr: { code: 'fr', name: 'Français', flag: '🇫🇷', region: 'France' },
  de: { code: 'de', name: 'Deutsch', flag: '🇩🇪', region: 'Deutschland' },
  ja: { code: 'ja', name: '日本語', flag: '🇯🇵', region: '日本' },
  pt: { code: 'pt', name: 'Português', flag: '🇧🇷', region: 'Brasil / Portugal' }
};

export const TRANSLATIONS = {
  // =========================================================================
  // ITALIANO (🇮🇹)
  // =========================================================================
  it: {
    // Navigation & Session Modes
    nav_practice: 'Prove Libere',
    nav_qualifying: 'Qualifiche',
    nav_race: 'Gara',
    nav_multiplayer: 'Multigiocatore',
    nav_practice_title: 'Prove Libere (Giri Illimitati)',
    nav_qualifying_title: 'Qualifiche Giro Secco (1 Giro Veloce)',
    nav_race_title: 'Gara (Griglia a 10 Vetture)',
    nav_multiplayer_title: 'Multigiocatore P2P tramite WebRTC',
    
    // Header Selectors
    select_track_title: 'Seleziona Circuito Grand Prix',
    select_car_title: 'Scegli la tua Vettura e Livrea F1',
    diff_title: 'DIFFICOLTÀ:',
    diff_easy: 'FACILE',
    diff_medium: 'MEDIA',
    diff_hard: 'DIFFICILE',
    diff_easy_title: 'IA Accessibile passo 82%, Sorpassi Facili',
    diff_medium_title: 'IA Competitiva passo 94%, Sorpassi Puliti, Difende il Cordolo',
    diff_hard_title: 'IA Hardcore passo 100%+, Staccate al Limite e Scia Aggressiva',
    btn_mute_title: 'Attiva/Disattiva Audio (M)',
    btn_restart: 'Riavvia',
    btn_restart_title: 'Riavvia la Sessione Attuale (R)',
    btn_help_title: 'Guida Comandi (H)',
    btn_lang_title: 'Cambia Lingua / Change Language',

    // Timing Tower & Leaderboard
    hud_driver: 'PILOTA',
    hud_current: 'ATTUALE',
    hud_best: 'MIGLIORE',
    hud_last: 'ULTIMO',
    hud_delta: 'DISTACCO',
    hud_pos: 'POS',
    hud_gap: 'DISTACCO',
    hud_pos_driver: 'POS PILOTA',

    // Telemetry & Radar
    hud_gear: 'MARCIA',
    hud_speed: 'KM/H',
    hud_drs: 'DRS',
    hud_drift: 'DERAPATA',
    radar_title: 'RADAR PISTA',

    // Driving Controls Guide Bar
    controls_guide: 'W A S D o Frecce per Guidare • R Ripristina • Spazio Freno a mano',

    // Session Status Badges
    badge_practice_free: 'PROVE LIBERE - GUIDA LIBERA',
    badge_practice_solo: 'PROVE LIBERE - GIRO PISTA',
    badge_quali_outlap: 'QUALIFICHE - GIRO DI LANCIO',
    badge_quali_hotlap: 'QUALIFICHE - GIRO VELOCE',
    badge_race_grid: 'GARA - GRIGLIA DI PARTENZA',
    badge_race_racing: 'GARA',
    badge_finished: 'SESSIONE COMPLETATA',
    badge_lap: 'GIRO {current}/{total}',

    // Center Broadcast Alerts
    alert_practice_start: 'SESSIONE PROVE LIBERE - GUIDA LIBERA',
    alert_out_lap: 'GIRO DI LANCIO - PREPARARSI AL GIRO VELOCE',
    alert_flying_lap: 'GIRO CRONOMETRATO ATTIVO - MASSIMO ATTACCO!',
    alert_lights_out: 'SI SPENGONO I SEMAFORI, VIA!',
    alert_checkered_flag: 'BANDIERA A SCACCHI! VINCITORE: {winner}',
    alert_jump_start: 'PENALITÀ PER PARTENZA ANTICIPATA (+5.0s)',
    alert_lap_invalidated: 'GIRO ANNULLATO - CHECKPOINT MANCATI',
    alert_final_lap: 'ULTIMO GIRO!',
    alert_wrong_way: 'SENSO CONTRARIO!',
    alert_reverse_prohibited: 'RETROMARCIA SUL TRAGUARDO VIETATA',
    alert_circuit_loaded: 'CIRCUITO CARICATO: {name}',
    alert_car_selected: 'VETTURA SELEZIONATA: {team}',
    alert_p2_connected: 'GIOCATORE 2 CONNESSO VIA WEBRTC!',
    alert_connected_to_host: 'CONNESSO ALL\'HOST! PREPARAZIONE GRIGLIA...',
    alert_network_error: 'RETE: {err}',
    alert_ai_diff: 'DIFFICOLTÀ IA: {diff}',

    // Controls Guide Modal
    help_modal_title: 'COMANDI DEL SIMULATORE F1',
    help_primary_driving: 'Comandi Primari di Guida',
    help_secondary_actions: 'Azioni Secondarie e Visuale',
    help_controller: 'Supporto Gamepad e Controller',
    help_tips_title: 'Consigli di Guida Grand Prix',
    help_tip_1: 'Braking Markers: Frenare in linea retta prima del cordolo interno per massimizzare la trazione in uscita.',
    help_tip_2: 'DRS Boost: Il DRS si attiva automaticamente sui rettilinei designati quando sei a meno di 1 secondo.',
    help_tip_3: 'Downforce Aerodinamica: A velocità elevate (>220 km/h) il carico permette inserimenti fulminei.',
    help_btn_close: 'Torna in Pista',
    help_key_gas: 'Acceleratore / Gas (Analogico progressivo)',
    help_key_brake: 'Freno / Retromarcia',
    help_key_steer: 'Sterzata sinistra / destra',
    help_key_handbrake: 'Freno a mano (Innesco Derapata)',
    help_key_reset: 'Ripristina Vettura su Pista',
    help_key_camera: 'Telecamera Inseguimento 3ª Persona (Fissa)',
    help_key_drs: 'Attivazione DRS (Zone Consentite)',
    help_key_sound: 'Attiva/Disattiva Audio Motore',
    help_key_help: 'Apri questa Guida Comandi',

    // Circuit Selector Modal
    track_modal_title: 'CALENDARIO UFFICIALE FORMULA 1 2026',
    track_modal_subtitle: 'SELEZIONA IL CIRCUITO DEL GRAND PRIX',
    track_stat_length: 'LUNGHEZZA',
    track_stat_turns: 'CURVE',
    track_stat_drs: 'ZONE DRS',
    track_stat_diff: 'DIFFICOLTÀ',
    track_active_badge: 'ATTIVO',

    // Car Selector Modal
    car_modal_title: 'SCHIERAMENTO COSTRUTTORI F1 2026',
    car_modal_subtitle: 'SCEGLI LA TUA VETTURA UFFICIALE E LA POWER UNIT',
    car_stat_speed: 'VELOCITÀ MAX',
    car_stat_aero: 'AERODINAMICA',
    car_stat_accel: 'ACCELERAZIONE',
    car_btn_select: 'Seleziona Scuderia',
    car_active_badge: 'ATTIVO',

    // Qualifying Results Modal
    quali_modal_title: 'RISULTATI DELLE QUALIFICHE',
    quali_pole_text: 'POLE POSITION!',
    quali_lap_time: 'TEMPO SUL GIRO',
    quali_delta: 'DISTACCO DALLA POLE',
    quali_btn_race: 'Inizia Gara',
    quali_btn_practice: 'Torna alle Prove',

    // Race Finish Modal
    race_modal_title: 'GARA COMPLETATA',
    race_modal_subtitle: 'Classifica Ufficiale del Gran Premio',
    race_btn_restart: 'Riavvia Gara',
    race_btn_practice: 'Torna alle Prove',

    // Multiplayer Modal
    mp_modal_title: 'LOBBY MULTIGIOCATORE P2P WEBRTC',
    mp_host_tab: 'CREA STANZA (HOST)',
    mp_join_tab: 'UNISCITI A STANZA',
    mp_host_code_label: 'Il Tuo Codice Stanza Host:',
    mp_copy_code: 'Copia Codice',
    mp_copied: 'COPIATO NEGLI APPUNTI!',
    mp_host_status_waiting: 'In attesa del Giocatore 2...',
    mp_btn_launch: 'Avvia Gara Multigiocatore',
    mp_join_code_label: 'Inserisci Codice Stanza (6 Lettere):',
    mp_btn_join: 'Connettiti all\'Host',
    mp_guest_waiting: 'In attesa che l\'host avvii la sessione...',

    // Disconnect Modal
    disc_modal_title: 'AVVERSARIO DISCONNESSO',
    disc_modal_text: 'Il giocatore remoto ha abbandonato la sessione.',
    disc_btn_close: 'Torna alla Guida Singola',

    // Language Modal
    lang_modal_title: 'SELEZIONA LINGUA / CHOOSE LANGUAGE',
    lang_modal_subtitle: 'RILEVAMENTO AUTOMATICO REGIONALE O SCELTA MANUALE',
    lang_auto_badge: 'Rilevata Automaticamente',
    lang_btn_save: 'Conferma Lingua'
  },

  // =========================================================================
  // ENGLISH (🇬🇧)
  // =========================================================================
  en: {
    nav_practice: 'Practice',
    nav_qualifying: 'Qualifying',
    nav_race: 'Race',
    nav_multiplayer: 'Multiplayer',
    nav_practice_title: 'Free Practice (Unlimited Laps)',
    nav_qualifying_title: 'One-Shot Qualifying (1 Flying Lap)',
    nav_race_title: 'Race (10-Car Grid)',
    nav_multiplayer_title: 'P2P Multiplayer via WebRTC',
    
    select_track_title: 'Select Grand Prix Circuit',
    select_car_title: 'Choose Your F1 Car & Constructor Livery',
    diff_title: 'DIFFICULTY:',
    diff_easy: 'EASY',
    diff_medium: 'MEDIUM',
    diff_hard: 'HARD',
    diff_easy_title: 'AI Overtakes, Accessible 82% Pace, Easy to Re-Overtake',
    diff_medium_title: 'Competitive 94% Pace, Clean Overtakes, Guards Apex',
    diff_hard_title: 'Hardcore 100%+ Pace, Late Braking, Aggressive Blocking & Slipstream',
    btn_mute_title: 'Toggle Sound (M)',
    btn_restart: 'Restart',
    btn_restart_title: 'Restart Current Session (R)',
    btn_help_title: 'Controls Guide (H)',
    btn_lang_title: 'Change Language / Lingua',

    hud_driver: 'PLAYER',
    hud_current: 'CURRENT',
    hud_best: 'BEST',
    hud_last: 'LAST',
    hud_delta: 'DELTA',
    hud_pos: 'POS',
    hud_gap: 'GAP',
    hud_pos_driver: 'POS DRIVER',

    hud_gear: 'GEAR',
    hud_speed: 'KM/H',
    hud_drs: 'DRS',
    hud_drift: 'DRIFT',
    radar_title: 'TRACK RADAR',

    controls_guide: 'W A S D or Arrow Keys to Drive • R Reset • Space Handbrake',

    badge_practice_free: 'PRACTICE - FREE DRIVING',
    badge_practice_solo: 'PRACTICE - SOLO RUN',
    badge_quali_outlap: 'QUALIFYING - OUT-LAP',
    badge_quali_hotlap: 'QUALIFYING - HOT LAP',
    badge_race_grid: 'RACE - START GRID',
    badge_race_racing: 'RACE',
    badge_finished: 'SESSION FINISHED',
    badge_lap: 'LAP {current}/{total}',

    alert_practice_start: 'PRACTICE SESSION - FREE DRIVING',
    alert_out_lap: 'OUT-LAP APPROACH - PREPARE FOR HOT LAP',
    alert_flying_lap: 'FLYING LAP ACTIVE - MAXIMUM ATTACK!',
    alert_lights_out: 'LIGHTS OUT AND AWAY WE GO!',
    alert_checkered_flag: 'CHECKERED FLAG! WINNER: {winner}',
    alert_jump_start: 'JUMP START PENALTY (+5.0s)',
    alert_lap_invalidated: 'LAP INVALIDATED - CHECKPOINTS MISSED',
    alert_final_lap: 'FINAL LAP!',
    alert_wrong_way: 'WRONG WAY!',
    alert_reverse_prohibited: 'REVERSE ACROSS START LINE PROHIBITED',
    alert_circuit_loaded: 'CIRCUIT LOADED: {name}',
    alert_car_selected: 'CAR SELECTED: {team}',
    alert_p2_connected: 'PLAYER 2 CONNECTED VIA WEBRTC!',
    alert_connected_to_host: 'CONNECTED TO HOST! PREPARING GRID...',
    alert_network_error: 'NETWORK: {err}',
    alert_ai_diff: 'AI DIFFICULTY: {diff}',

    help_modal_title: 'F1 RACING SIMULATOR CONTROLS',
    help_primary_driving: 'Primary Driving Controls',
    help_secondary_actions: 'Secondary Actions & Utilities',
    help_controller: 'Gamepad & Controller Support',
    help_tips_title: 'Grand Prix Handling Tips',
    help_tip_1: 'Braking Markers: Brake in a straight line before turning to maximize apex exit speed.',
    help_tip_2: 'DRS Boost: DRS opens automatically along straightaways when within 1 second.',
    help_tip_3: 'High-Speed Downforce: Above 220 km/h the aerodynamic wing provides immense grip.',
    help_btn_close: 'Back to Track',
    help_key_gas: 'Throttle / Accelerate (Smooth ramp)',
    help_key_brake: 'Brake / Reverse',
    help_key_steer: 'Steer Left / Right',
    help_key_handbrake: 'Handbrake / Drift Initiation',
    help_key_reset: 'Reset Car on Track',
    help_key_camera: 'Third-Person Chase Camera (Locked)',
    help_key_drs: 'DRS Rear Wing Flap Toggle',
    help_key_sound: 'Mute / Unmute Audio',
    help_key_help: 'Toggle Controls Guide',

    track_modal_title: 'OFFICIAL 2026 FORMULA 1 CALENDAR',
    track_modal_subtitle: 'SELECT GRAND PRIX CIRCUIT',
    track_stat_length: 'LENGTH',
    track_stat_turns: 'TURNS',
    track_stat_drs: 'DRS ZONES',
    track_stat_diff: 'DIFFICULTY',
    track_active_badge: 'ACTIVE',

    car_modal_title: '2026 F1 CONSTRUCTOR CONVOY',
    car_modal_subtitle: 'CHOOSE YOUR OFFICIAL TEAM LIVERY & POWER UNIT',
    car_stat_speed: 'TOP SPEED',
    car_stat_aero: 'AERODYNAMICS',
    car_stat_accel: 'ACCELERATION',
    car_btn_select: 'Select Team',
    car_active_badge: 'ACTIVE',

    quali_modal_title: 'QUALIFYING RESULTS',
    quali_pole_text: 'POLE POSITION!',
    quali_lap_time: 'LAP TIME',
    quali_delta: 'DELTA TO POLE',
    quali_btn_race: 'Start Race',
    quali_btn_practice: 'Return to Practice',

    race_modal_title: 'RACE FINISHED',
    race_modal_subtitle: 'Official Grand Prix Classification',
    race_btn_restart: 'Restart Race',
    race_btn_practice: 'Return to Practice',

    mp_modal_title: 'P2P MULTIPLAYER LOBBY',
    mp_host_tab: 'HOST LOBBY',
    mp_join_tab: 'JOIN LOBBY',
    mp_host_code_label: 'Your Host Room Code:',
    mp_copy_code: 'Copy Code',
    mp_copied: 'COPIED TO CLIPBOARD!',
    mp_host_status_waiting: 'Waiting for Player 2 to join...',
    mp_btn_launch: 'Launch Multiplayer Race',
    mp_join_code_label: 'Enter 6-Letter Room Code:',
    mp_btn_join: 'Connect to Host',
    mp_guest_waiting: 'Connected! Waiting for host to launch session...',

    disc_modal_title: 'PEER DISCONNECTED',
    disc_modal_text: 'The remote player has left the session.',
    disc_btn_close: 'Return to Solo Practice',

    lang_modal_title: 'SELECT LANGUAGE / SELEZIONA LINGUA',
    lang_modal_subtitle: 'AUTOMATIC REGIONAL DETECTION OR MANUAL SELECTION',
    lang_auto_badge: 'Auto-Detected',
    lang_btn_save: 'Confirm Language'
  },

  // =========================================================================
  // ESPAÑOL (🇪🇸)
  // =========================================================================
  es: {
    nav_practice: 'Práctica',
    nav_qualifying: 'Clasificación',
    nav_race: 'Carrera',
    nav_multiplayer: 'Multijugador',
    nav_practice_title: 'Práctica Libre (Vueltas Ilimitadas)',
    nav_qualifying_title: 'Clasificación a Vuelta Única',
    nav_race_title: 'Carrera (Parrilla de 10 Coches)',
    nav_multiplayer_title: 'Multijugador P2P vía WebRTC',

    select_track_title: 'Seleccionar Circuito de Gran Premio',
    select_car_title: 'Elige tu Coche y Decoración F1',
    diff_title: 'DIFICULTAD:',
    diff_easy: 'FÁCIL',
    diff_medium: 'MEDIA',
    diff_hard: 'DIFÍCIL',
    diff_easy_title: 'IA Accesible ritmo 82%, Fácil de adelantar',
    diff_medium_title: 'IA Competitiva ritmo 94%, Adelantamientos limpios',
    diff_hard_title: 'IA Experta ritmo 100%+, Frenadas al límite y rebufo',
    btn_mute_title: 'Silenciar Sonido (M)',
    btn_restart: 'Reiniciar',
    btn_restart_title: 'Reiniciar Sesión Actual (R)',
    btn_help_title: 'Guía de Controles (H)',
    btn_lang_title: 'Cambiar Idioma / Change Language',

    hud_driver: 'PILOTO',
    hud_current: 'ACTUAL',
    hud_best: 'MEJOR',
    hud_last: 'ÚLTIMA',
    hud_delta: 'DIFERENCIA',
    hud_pos: 'POS',
    hud_gap: 'DIF.',
    hud_pos_driver: 'POS PILOTO',

    hud_gear: 'MARCHA',
    hud_speed: 'KM/H',
    hud_drs: 'DRS',
    hud_drift: 'DERRAPE',
    radar_title: 'RADAR DEL CIRCUITO',

    controls_guide: 'W A S D o Flechas para Conducir • R Reiniciar • Espacio Freno de Mano',

    badge_practice_free: 'PRÁCTICA - CONDUCCIÓN LIBRE',
    badge_practice_solo: 'PRÁCTICA - VUELTA EN SOLITARIO',
    badge_quali_outlap: 'CLASIFICACIÓN - VUELTA DE SALIDA',
    badge_quali_hotlap: 'CLASIFICACIÓN - VUELTA RÁPIDA',
    badge_race_grid: 'CARRERA - PARRILLA DE SALIDA',
    badge_race_racing: 'CARRERA',
    badge_finished: 'SESIÓN TERMINADA',
    badge_lap: 'VUELTA {current}/{total}',

    alert_practice_start: 'SESIÓN DE PRÁCTICA - CONDUCCIÓN LIBRE',
    alert_out_lap: 'VUELTA DE SALIDA - PREPÁRATE PARA LA VUELTA RÁPIDA',
    alert_flying_lap: '¡VUELTA RÁPIDA ACTIVA - MÁXIMO ATAQUE!',
    alert_lights_out: '¡SE APAGAN LOS SEMÁFOROS Y ARRANCAMOS!',
    alert_checkered_flag: '¡BANDERA A CUADROS! GANADOR: {winner}',
    alert_jump_start: 'PENALIZACIÓN POR SALIDA EN FALSO (+5.0s)',
    alert_lap_invalidated: 'VUELTA INVALIDADA - PUNTOS DE CONTROL OMITIDOS',
    alert_final_lap: '¡ÚLTIMA VUELTA!',
    alert_wrong_way: '¡DIRECCIÓN CONTRARIA!',
    alert_reverse_prohibited: 'PROHIBIDO MARCHA ATRÁS EN META',
    alert_circuit_loaded: 'CIRCUITO CARGADO: {name}',
    alert_car_selected: 'COCHE SELECCIONADO: {team}',
    alert_p2_connected: '¡JUGADOR 2 CONECTADO POR WEBRTC!',
    alert_connected_to_host: '¡CONECTADO AL ANFITRIÓN! PREPARANDO PARRILLA...',
    alert_network_error: 'RED: {err}',
    alert_ai_diff: 'DIFICULTAD IA: {diff}',

    help_modal_title: 'CONTROLES DEL SIMULADOR F1',
    help_primary_driving: 'Controles Principales de Conducción',
    help_secondary_actions: 'Acciones Secundarias y Cámara',
    help_controller: 'Soporte para Mando / Gamepad',
    help_tips_title: 'Consejos de Conducción Grand Prix',
    help_tip_1: 'Puntos de Frenada: Frena en línea recta antes de entrar a la curva para máxima tracción.',
    help_tip_2: 'Activación DRS: El DRS se abre en rectas habilitadas cuando estás a menos de 1 segundo.',
    help_tip_3: 'Carga Aerodinámica: A más de 220 km/h los alerones proporcionan un agarre inmenso.',
    help_btn_close: 'Volver a Pista',
    help_key_gas: 'Acelerador / Gas',
    help_key_brake: 'Freno / Marcha Atrás',
    help_key_steer: 'Girar Izquierda / Derecha',
    help_key_handbrake: 'Freno de Mano (Inicio de Derrape)',
    help_key_reset: 'Reiniciar Coche en Pista',
    help_key_camera: 'Cámara en Tercera Persona (Fija)',
    help_key_drs: 'Interruptor del Alerón Trasero DRS',
    help_key_sound: 'Silenciar / Activar Sonido',
    help_key_help: 'Abrir Guía de Controles',

    track_modal_title: 'CALENDARIO OFICIAL FORMULA 1 2026',
    track_modal_subtitle: 'SELECCIONA CIRCUITO DE GRAN PREMIO',
    track_stat_length: 'LONGITUD',
    track_stat_turns: 'CURVAS',
    track_stat_drs: 'ZONAS DRS',
    track_stat_diff: 'DIFICULTAD',
    track_active_badge: 'ACTIVO',

    car_modal_title: 'PARRILLA DE CONSTRUCTORES F1 2026',
    car_modal_subtitle: 'ELIGE TU COCHE OFICIAL Y UNIDAD DE POTENCIA',
    car_stat_speed: 'VELOCIDAD PUNTA',
    car_stat_aero: 'AERODINÁMICA',
    car_stat_accel: 'ACELERACIÓN',
    car_btn_select: 'Seleccionar Equipo',
    car_active_badge: 'ACTIVO',

    quali_modal_title: 'RESULTADOS DE CLASIFICACIÓN',
    quali_pole_text: '¡POLE POSITION!',
    quali_lap_time: 'TIEMPO DE VUELTA',
    quali_delta: 'DIFERENCIA A POLE',
    quali_btn_race: 'Iniciar Carrera',
    quali_btn_practice: 'Volver a Práctica',

    race_modal_title: 'CARRERA FINALIZADA',
    race_modal_subtitle: 'Clasificación Oficial del Gran Premio',
    race_btn_restart: 'Reiniciar Carrera',
    race_btn_practice: 'Volver a Práctica',

    mp_modal_title: 'SALA MULTIJUGADOR P2P WEBRTC',
    mp_host_tab: 'CREAR SALA (HOST)',
    mp_join_tab: 'UNIRSE A SALA',
    mp_host_code_label: 'Código de Sala Anfitrión:',
    mp_copy_code: 'Copiar Código',
    mp_copied: '¡COPIADO AL PORTAPAPELES!',
    mp_host_status_waiting: 'Esperando al Jugador 2...',
    mp_btn_launch: 'Iniciar Carrera Multijugador',
    mp_join_code_label: 'Introduce Código de 6 Letras:',
    mp_btn_join: 'Conectar con Anfitrión',
    mp_guest_waiting: 'Conectado. Esperando que el anfitrión inicie...',

    disc_modal_title: 'RIVAL DESCONECTADO',
    disc_modal_text: 'El otro jugador ha abandonado la sesión.',
    disc_btn_close: 'Volver a Práctica Solitaria',

    lang_modal_title: 'SELECCIONA IDIOMA / CHOOSE LANGUAGE',
    lang_modal_subtitle: 'DETECCIÓN AUTOMÁTICA REGIONAL O ELECCIÓN MANUAL',
    lang_auto_badge: 'Detección Automática',
    lang_btn_save: 'Confirmar Idioma'
  },

  // =========================================================================
  // FRANÇAIS (🇫🇷)
  // =========================================================================
  fr: {
    nav_practice: 'Essais Libres',
    nav_qualifying: 'Qualifications',
    nav_race: 'Course',
    nav_multiplayer: 'Multijoueur',
    nav_practice_title: 'Essais Libres (Tours Illimités)',
    nav_qualifying_title: 'Qualifications sur 1 Tour Chrono',
    nav_race_title: 'Course (Grille de 10 Voitures)',
    nav_multiplayer_title: 'Multijoueur P2P via WebRTC',

    select_track_title: 'Sélectionner le Circuit Grand Prix',
    select_car_title: 'Choisir votre Monoplace F1',
    diff_title: 'DIFFICULTÉ :',
    diff_easy: 'FACILE',
    diff_medium: 'MOYEN',
    diff_hard: 'DIFFICILE',
    diff_easy_title: 'IA Accessible allure 82%, Dépassements Faciles',
    diff_medium_title: 'IA Compétitive allure 94%, Trajectoires Propres',
    diff_hard_title: 'IA Hardcore allure 100%+, Freinages Tardifs et Aspiration',
    btn_mute_title: 'Couper le Son (M)',
    btn_restart: 'Recommencer',
    btn_restart_title: 'Recommencer la Session (R)',
    btn_help_title: 'Guide des Commandes (H)',
    btn_lang_title: 'Changer de Langue / Change Language',

    hud_driver: 'PILOTE',
    hud_current: 'ACTUEL',
    hud_best: 'MEILLEUR',
    hud_last: 'DERNIER',
    hud_delta: 'ÉCART',
    hud_pos: 'POS',
    hud_gap: 'ÉCART',
    hud_pos_driver: 'POS PILOTE',

    hud_gear: 'VITESSE',
    hud_speed: 'KM/H',
    hud_drs: 'DRS',
    hud_drift: 'DÉRIVE',
    radar_title: 'RADAR PISTE',

    controls_guide: 'W A S D ou Flèches pour Conduire • R Réinitialiser • Espace Frein à main',

    badge_practice_free: 'ESSAIS LIBRES - ROULAGE LIBRE',
    badge_practice_solo: 'ESSAIS - TOUR EN SOLITAIRE',
    badge_quali_outlap: 'QUALIFICATIONS - TOUR DE SORTIE',
    badge_quali_hotlap: 'QUALIFICATIONS - TOUR CHRONO',
    badge_race_grid: 'COURSE - GRILLE DE DÉPART',
    badge_race_racing: 'COURSE',
    badge_finished: 'SESSION TERMINÉE',
    badge_lap: 'TOUR {current}/{total}',

    alert_practice_start: 'SESSION D\'ESSAIS - ROULAGE LIBRE',
    alert_out_lap: 'TOUR DE SORTIE - PRÉPAREZ VOTRE TOUR CHRONO',
    alert_flying_lap: 'TOUR CHRONOMÉTRÉ ACTIF - ATTAQUE MAXIMALE !',
    alert_lights_out: 'LES FEUX S\'ÉTEIGNENT, C\'EST PARTI !',
    alert_checkered_flag: 'DRAPEAU À DAMIER ! VAINQUEUR : {winner}',
    alert_jump_start: 'PÉNALITÉ DÉPART ANTICIPÉ (+5.0s)',
    alert_lap_invalidated: 'TOUR ANNULÉ - CHECKPOINTS MANQUÉS',
    alert_final_lap: 'DERNIER TOUR !',
    alert_wrong_way: 'MAUVAIS SENS !',
    alert_reverse_prohibited: 'MARCHE ARRIÈRE INTERDITE SUR LA LIGNE',
    alert_circuit_loaded: 'CIRCUIT CHARGÉ : {name}',
    alert_car_selected: 'VOITURE SÉLECTIONNÉE : {team}',
    alert_p2_connected: 'JOUEUR 2 CONNECTÉ VIA WEBRTC !',
    alert_connected_to_host: 'CONNECTÉ À L\'HÔTE ! PRÉPARATION DE LA GRILLE...',
    alert_network_error: 'RÉSEAU : {err}',
    alert_ai_diff: 'DIFFICULTÉ IA : {diff}',

    help_modal_title: 'COMMANDES DU SIMULATEUR F1',
    help_primary_driving: 'Commandes de Pilotage',
    help_secondary_actions: 'Actions Secondaires et Caméra',
    help_controller: 'Prise en Charge Manette / Gamepad',
    help_tips_title: 'Conseils de Pilotage Grand Prix',
    help_tip_1: 'Points de Freinage : Freinez en ligne droite avant la corde pour relancer fort en sortie.',
    help_tip_2: 'Boost DRS : Le DRS s\'ouvre sur les lignes droites quand vous êtes à moins d\'une seconde.',
    help_tip_3: 'Appui Aérodynamique : À plus de 220 km/h, l\'aileron colle la monoplace au bitume.',
    help_btn_close: 'Retour en Piste',
    help_key_gas: 'Accélérateur / Gaz',
    help_key_brake: 'Frein / Marche Arrière',
    help_key_steer: 'Virage Gauche / Droite',
    help_key_handbrake: 'Frein à Main (Déclenchement Glisse)',
    help_key_reset: 'Réinitialiser la Voiture',
    help_key_camera: 'Caméra Poursuite 3ème Personne (Fixe)',
    help_key_drs: 'Basculement Flap DRS Aileron Arrière',
    help_key_sound: 'Activer / Couper le Son',
    help_key_help: 'Ouvrir ce Guide',

    track_modal_title: 'CALENDRIER OFFICIEL FORMULA 1 2026',
    track_modal_subtitle: 'SÉLECTIONNER LE CIRCUIT DU GRAND PRIX',
    track_stat_length: 'LONGUEUR',
    track_stat_turns: 'VIRAGES',
    track_stat_drs: 'ZONES DRS',
    track_stat_diff: 'DIFFICULTÉ',
    track_active_badge: 'ACTIF',

    car_modal_title: 'PLATEAU DES CONSTRUCTEURS F1 2026',
    car_modal_subtitle: 'CHOISISSEZ VOTRE MONOPLACE ET UNITÉ DE PUISSANCE',
    car_stat_speed: 'VITESSE DE POINTE',
    car_stat_aero: 'AÉRODYNAMIQUE',
    car_stat_accel: 'ACCÉLÉRATION',
    car_btn_select: 'Sélectionner l\'Écurie',
    car_active_badge: 'ACTIF',

    quali_modal_title: 'RÉSULTATS DES QUALIFICATIONS',
    quali_pole_text: 'POLE POSITION !',
    quali_lap_time: 'TEMPS AU TOUR',
    quali_delta: 'ÉCART AVEC LA POLE',
    quali_btn_race: 'Démarrer la Course',
    quali_btn_practice: 'Retour aux Essais',

    race_modal_title: 'COURSE TERMINÉE',
    race_modal_subtitle: 'Classement Officiel du Grand Prix',
    race_btn_restart: 'Recommencer la Course',
    race_btn_practice: 'Retour aux Essais',

    mp_modal_title: 'SALON MULTIJOUEUR P2P WEBRTC',
    mp_host_tab: 'CRÉER UN SALON',
    mp_join_tab: 'REJOINDRE UN SALON',
    mp_host_code_label: 'Votre Code de Salon :',
    mp_copy_code: 'Copier le Code',
    mp_copied: 'COPIÉ DANS LE PRESSE-PAPIER !',
    mp_host_status_waiting: 'En attente du Joueur 2...',
    mp_btn_launch: 'Lancer la Course Multijoueur',
    mp_join_code_label: 'Entrez le Code à 6 Lettres :',
    mp_btn_join: 'Se Connecter à l\'Hôte',
    mp_guest_waiting: 'Connecté ! En attente du départ...',

    disc_modal_title: 'ADVERSAIRE DÉCONNECTÉ',
    disc_modal_text: 'Le joueur distant a quitté la session.',
    disc_btn_close: 'Retour en Solo',

    lang_modal_title: 'CHOISIR LA LANGUE / SELECT LANGUAGE',
    lang_modal_subtitle: 'DÉTECTION AUTOMATIQUE RÉGIONALE OU CHOIX MANUEL',
    lang_auto_badge: 'Détection Automatique',
    lang_btn_save: 'Confirmer la Langue'
  },

  // =========================================================================
  // DEUTSCH (🇩🇪)
  // =========================================================================
  de: {
    nav_practice: 'Freies Training',
    nav_qualifying: 'Qualifying',
    nav_race: 'Rennen',
    nav_multiplayer: 'Mehrspieler',
    nav_practice_title: 'Freies Training (Unbegrenzte Runden)',
    nav_qualifying_title: 'Qualifying (1 Schnelle Runde)',
    nav_race_title: 'Rennen (10 Fahrzeuge)',
    nav_multiplayer_title: 'P2P-Mehrspieler über WebRTC',

    select_track_title: 'Grand-Prix-Strecke wählen',
    select_car_title: 'F1-Fahrzeug und Team-Design wählen',
    diff_title: 'SCHWIERIGKEIT:',
    diff_easy: 'EINFACH',
    diff_medium: 'MITTEL',
    diff_hard: 'SCHWER',
    diff_easy_title: 'KI Tempo 82%, Leichtes Überholen',
    diff_medium_title: 'KI Tempo 94%, Saubere Überholmanöver, Schützt Scheitelpunkt',
    diff_hard_title: 'KI Tempo 100%+, Spätes Bremsen und Aggressiver Windschatten',
    btn_mute_title: 'Ton Ein/Aus (M)',
    btn_restart: 'Neustart',
    btn_restart_title: 'Aktuelle Session neu starten (R)',
    btn_help_title: 'Steuerungsanleitung (H)',
    btn_lang_title: 'Sprache ändern / Change Language',

    hud_driver: 'FAHRER',
    hud_current: 'AKTUELL',
    hud_best: 'BESTE',
    hud_last: 'LETZTE',
    hud_delta: 'ABSTAND',
    hud_pos: 'POS',
    hud_gap: 'DIFF.',
    hud_pos_driver: 'POS FAHRER',

    hud_gear: 'GANG',
    hud_speed: 'KM/H',
    hud_drs: 'DRS',
    hud_drift: 'DRIFT',
    radar_title: 'STRECKEN-RADAR',

    controls_guide: 'W A S D oder Pfeiltasten zum Fahren • R Zurücksetzen • Leertaste Handbremse',

    badge_practice_free: 'TRAINING - FREIES FAHREN',
    badge_practice_solo: 'TRAINING - EINZELRUNDE',
    badge_quali_outlap: 'QUALIFYING - OUT-LAP',
    badge_quali_hotlap: 'QUALIFYING - SCHNELLE RUNDE',
    badge_race_grid: 'RENNEN - STARTAUFSTELLUNG',
    badge_race_racing: 'RENNEN',
    badge_finished: 'SESSION BEENDET',
    badge_lap: 'RUNDE {current}/{total}',

    alert_practice_start: 'TRAININGS-SESSION - FREIES FAHREN',
    alert_out_lap: 'OUT-LAP - VORBEREITUNG AUF SCHNELLE RUNDE',
    alert_flying_lap: 'SCHNELLE RUNDE AKTIV - VOLLER ANGRIFF!',
    alert_lights_out: 'LICHTER AUS UND LOS GEHT\'S!',
    alert_checkered_flag: 'ZIELFLAGGE! SIEGER: {winner}',
    alert_jump_start: 'FRÜHSTART-STRAFE (+5.0s)',
    alert_lap_invalidated: 'RUNDE UNGÜLTIG - WEGPUNKTE VERPASST',
    alert_final_lap: 'LETZTE RUNDE!',
    alert_wrong_way: 'FALSCHE RICHTUNG!',
    alert_reverse_prohibited: 'RÜCKWÄRTSFAHREN ÜBER DIE ZIELLINIE VERBOTEN',
    alert_circuit_loaded: 'STRECKE GELADEN: {name}',
    alert_car_selected: 'FAHRZEUG GEWÄHLT: {team}',
    alert_p2_connected: 'SPIELER 2 ÜBER WEBRTC VERBUNDEN!',
    alert_connected_to_host: 'MIT HOST VERBUNDEN! STARTAUFSTELLUNG WIRD ERSTELLT...',
    alert_network_error: 'NETZWERK: {err}',
    alert_ai_diff: 'KI-SCHWIERIGKEIT: {diff}',

    help_modal_title: 'F1-RENN-SIMULATOR STEUERUNG',
    help_primary_driving: 'Haupt-Fahrsteuerung',
    help_secondary_actions: 'Sekundäre Aktionen & Kamera',
    help_controller: 'Gamepad- & Controller-Unterstützung',
    help_tips_title: 'Grand-Prix-Fahrtipps',
    help_tip_1: 'Bremspunkte: Geradeaus vor der Kurve anbremsen für optimale Beschleunigung am Ausgang.',
    help_tip_2: 'DRS-Boost: Öffnet auf Geraden automatisch bei weniger als 1 Sekunde Rückstand.',
    help_tip_3: 'Abtrieb: Bei über 220 km/h erzeugen die Flügel enormen Anpressdruck.',
    help_btn_close: 'Zurück zur Strecke',
    help_key_gas: 'Gaspedal / Beschleunigen',
    help_key_brake: 'Bremse / Rückwärtsgang',
    help_key_steer: 'Lenkung Links / Rechts',
    help_key_handbrake: 'Handbremse (Drift-Einleitung)',
    help_key_reset: 'Fahrzeug auf Strecke zurücksetzen',
    help_key_camera: '3rd-Person-Verfolgungskamera (Fixiert)',
    help_key_drs: 'DRS-Heckflügelklappe umschalten',
    help_key_sound: 'Ton Stummschalten / Aktivieren',
    help_key_help: 'Steuerungshilfe öffnen',

    track_modal_title: 'OFFIZIELLER FORMULA 1 KALENDER 2026',
    track_modal_subtitle: 'GRAND-PRIX-STRECKE AUSWÄHLEN',
    track_stat_length: 'LÄNGE',
    track_stat_turns: 'KURVEN',
    track_stat_drs: 'DRS-ZONEN',
    track_stat_diff: 'SCHWIERIGKEIT',
    track_active_badge: 'AKTIV',

    car_modal_title: 'F1-KONSTRUKTEURE 2026',
    car_modal_subtitle: 'WÄHLE DEIN TEAM UND DEINE POWER-UNIT',
    car_stat_speed: 'TOPSPEED',
    car_stat_aero: 'AERODYNAMIK',
    car_stat_accel: 'BESCHLEUNIGUNG',
    car_btn_select: 'Team wählen',
    car_active_badge: 'AKTIV',

    quali_modal_title: 'QUALIFYING-ERGEBNISSE',
    quali_pole_text: 'POLE POSITION!',
    quali_lap_time: 'RUNDENZEIT',
    quali_delta: 'RÜCKSTAND ZUR POLE',
    quali_btn_race: 'Rennen starten',
    quali_btn_practice: 'Zurück zum Training',

    race_modal_title: 'RENNEN BEENDET',
    race_modal_subtitle: 'Offizielles Grand-Prix-Klassement',
    race_btn_restart: 'Rennen neu starten',
    race_btn_practice: 'Zurück zum Training',

    mp_modal_title: 'P2P-MEHRSPIELER-LOBBY',
    mp_host_tab: 'LOBBY ERSTELLEN (HOST)',
    mp_join_tab: 'LOBBY BEITRETEN',
    mp_host_code_label: 'Dein Host-Raumcode:',
    mp_copy_code: 'Code kopieren',
    mp_copied: 'IN ZWISCHENABLAGE KOPIERT!',
    mp_host_status_waiting: 'Warte auf Spieler 2...',
    mp_btn_launch: 'Mehrspieler-Rennen starten',
    mp_join_code_label: '6-stelligen Raumcode eingeben:',
    mp_btn_join: 'Mit Host verbinden',
    mp_guest_waiting: 'Verbunden! Warte auf Rennstart...',

    disc_modal_title: 'VERBINDUNG GETRENNT',
    disc_modal_text: 'Der Gegenspieler hat die Session verlassen.',
    disc_btn_close: 'Zurück zum Solo-Modus',

    lang_modal_title: 'SPRACHE WÄHLEN / SELECT LANGUAGE',
    lang_modal_subtitle: 'REGIONALE AUTOMATIK ODER MANUELLE AUSWAHL',
    lang_auto_badge: 'Automatisch Erkannt',
    lang_btn_save: 'Sprache Bestätigen'
  },

  // =========================================================================
  // 日本語 (🇯🇵)
  // =========================================================================
  ja: {
    nav_practice: 'フリー走行',
    nav_qualifying: '予選',
    nav_race: 'レース',
    nav_multiplayer: 'マルチプレイヤー',
    nav_practice_title: 'フリー走行（無制限ラップ）',
    nav_qualifying_title: 'ワンショット予選（1アタックラップ）',
    nav_race_title: '決勝レース（10台グリッド）',
    nav_multiplayer_title: 'WebRTC P2Pマルチプレイヤー',

    select_track_title: 'グランプリサーキット選択',
    select_car_title: 'マシン＆カラーリング選択',
    diff_title: '難易度:',
    diff_easy: 'イージー',
    diff_medium: 'ミディアム',
    diff_hard: 'ハード',
    diff_easy_title: 'AI 82%ペース、オーバーテイク容易',
    diff_medium_title: 'AI 94%ペース、クリーンなバトル、エイペックス防衛',
    diff_hard_title: 'AI 100%+ペース、限界ブレーキング、強気なスリップストリーム',
    btn_mute_title: 'サウンド切替 (M)',
    btn_restart: 'リスタート',
    btn_restart_title: 'セッションをリスタート (R)',
    btn_help_title: '操作ガイド (H)',
    btn_lang_title: '言語変更 / Change Language',

    hud_driver: 'ドライバー',
    hud_current: '現在',
    hud_best: 'ベスト',
    hud_last: 'ラスト',
    hud_delta: '差',
    hud_pos: '順位',
    hud_gap: 'ギャップ',
    hud_pos_driver: '順位 ドライバー',

    hud_gear: 'ギア',
    hud_speed: 'KM/H',
    hud_drs: 'DRS',
    hud_drift: 'ドリフト',
    radar_title: 'コースレーダー',

    controls_guide: 'W A S D または矢印キーで走行 • R リセット • Space サイドブレーキ',

    badge_practice_free: 'フリー走行 - フリー走行中',
    badge_practice_solo: 'フリー走行 - 単独走行',
    badge_quali_outlap: '予選 - アウトラップ',
    badge_quali_hotlap: '予選 - アタックラップ',
    badge_race_grid: 'レース - スターティンググリッド',
    badge_race_racing: 'レース',
    badge_finished: 'セッション終了',
    badge_lap: 'LAP {current}/{total}',

    alert_practice_start: 'フリー走行セッション開始 - 自由走行',
    alert_out_lap: 'アウトラップ - アタックの準備をしてください',
    alert_flying_lap: 'タイムアタック開始 - プッシュ！',
    alert_lights_out: 'ブラックアウト！スタート！',
    alert_checkered_flag: 'チェッカーフラッグ！勝者: {winner}',
    alert_jump_start: 'ジャンプスタートペナルティ (+5.0秒)',
    alert_lap_invalidated: 'ラップタイム抹消 - コース境界外',
    alert_final_lap: 'ファイナルラップ！',
    alert_wrong_way: '逆走警告！',
    alert_reverse_prohibited: 'フィニッシュラインの逆走は禁止です',
    alert_circuit_loaded: 'サーキット読み込み: {name}',
    alert_car_selected: 'マシン選択: {team}',
    alert_p2_connected: 'プレイヤー2がWebRTCで接続しました！',
    alert_connected_to_host: 'ホストに接続完了！グリッド整列中...',
    alert_network_error: '通信エラー: {err}',
    alert_ai_diff: 'AI難易度: {diff}',

    help_modal_title: 'F1レーシングシミュレーター 操作方法',
    help_primary_driving: '基本操作',
    help_secondary_actions: '補助アクション＆カメラ',
    help_controller: 'ゲームパッド＆コントローラー対応',
    help_tips_title: 'グランプリ走行テクニック',
    help_tip_1: 'ブレーキングポイント: 直線でしっかり減速し、脱出速度を最大化しましょう。',
    help_tip_2: 'DRS加速: 1秒以内につけるとストレートで自動的にDRSが展開します。',
    help_tip_3: '高速ダウンフォース: 220 km/h以上では驚異的なグリップを発揮します。',
    help_btn_close: 'コースに戻る',
    help_key_gas: 'アクセル / 前進',
    help_key_brake: 'ブレーキ / バック',
    help_key_steer: 'ステアリング 左右',
    help_key_handbrake: 'ハンドブレーキ（ドリフト誘発）',
    help_key_reset: 'マシンをコース上にリセット',
    help_key_camera: '三人称追従カメラ（固定）',
    help_key_drs: 'DRSリアウイング開閉切替',
    help_key_sound: 'ミュート / サウンドON',
    help_key_help: '操作ガイドの開閉',

    track_modal_title: '公式 2026 FORMULA 1 カレンダー',
    track_modal_subtitle: 'グランプリサーキットを選択',
    track_stat_length: '全長',
    track_stat_turns: 'コーナー数',
    track_stat_drs: 'DRSゾーン',
    track_stat_diff: '難易度',
    track_active_badge: '選択中',

    car_modal_title: '2026 F1 コンストラクター',
    car_modal_subtitle: 'マシンとパワーユニットを選択',
    car_stat_speed: '最高速',
    car_stat_aero: '空力',
    car_stat_accel: '加速性能',
    car_btn_select: 'チームを選択',
    car_active_badge: '選択中',

    quali_modal_title: '予選結果',
    quali_pole_text: 'ポールポジション！',
    quali_lap_time: 'ラップタイム',
    quali_delta: 'ポールとの差',
    quali_btn_race: 'レース開始',
    quali_btn_practice: '練習走行に戻る',

    race_modal_title: 'レース終了',
    race_modal_subtitle: '公式決勝リザルト',
    race_btn_restart: 'レースをリスタート',
    race_btn_practice: '練習走行に戻る',

    mp_modal_title: 'P2Pマルチプレイヤー ロビー',
    mp_host_tab: '部屋を作成 (HOST)',
    mp_join_tab: '部屋に参加',
    mp_host_code_label: 'あなたのルームコード:',
    mp_copy_code: 'コードをコピー',
    mp_copied: 'クリップボードにコピーしました！',
    mp_host_status_waiting: 'プレイヤー2の参加を待っています...',
    mp_btn_launch: 'マルチプレイヤーレース開始',
    mp_join_code_label: '6文字のルームコードを入力:',
    mp_btn_join: 'ホストに接続',
    mp_guest_waiting: '接続完了！ホストのスタートを待っています...',

    disc_modal_title: '対戦相手が切断されました',
    disc_modal_text: 'リモートプレイヤーが退出しました。',
    disc_btn_close: 'ソロ練習に戻る',

    lang_modal_title: '言語選択 / SELECT LANGUAGE',
    lang_modal_subtitle: '地域自動判定または手動選択',
    lang_auto_badge: '自動判定',
    lang_btn_save: '言語を決定'
  },

  // =========================================================================
  // PORTUGUÊS (🇧🇷)
  // =========================================================================
  pt: {
    nav_practice: 'Treino Livre',
    nav_qualifying: 'Classificação',
    nav_race: 'Corrida',
    nav_multiplayer: 'Multijogador',
    nav_practice_title: 'Treino Livre (Voltas Ilimitadas)',
    nav_qualifying_title: 'Classificação em Volta Única',
    nav_race_title: 'Corrida (Grid de 10 Carros)',
    nav_multiplayer_title: 'Multijogador P2P via WebRTC',

    select_track_title: 'Selecionar Circuito do Grande Prêmio',
    select_car_title: 'Escolha seu Carro e Pintura F1',
    diff_title: 'DIFICULDADE:',
    diff_easy: 'FÁCIL',
    diff_medium: 'MÉDIO',
    diff_hard: 'DIFÍCIL',
    diff_easy_title: 'IA Acessível 82% ritmo, Ultrapassagens fáceis',
    diff_medium_title: 'IA Competitiva 94% ritmo, Disputas limpas',
    diff_hard_title: 'IA Hardcore 100%+ ritmo, Freadas no limite e vácuo agressivo',
    btn_mute_title: 'Mutar Som (M)',
    btn_restart: 'Reiniciar',
    btn_restart_title: 'Reiniciar Sessão Atual (R)',
    btn_help_title: 'Guia de Controles (H)',
    btn_lang_title: 'Mudar Idioma / Change Language',

    hud_driver: 'PILOTO',
    hud_current: 'ATUAL',
    hud_best: 'MELHOR',
    hud_last: 'ÚLTIMA',
    hud_delta: 'DIFERENÇA',
    hud_pos: 'POS',
    hud_gap: 'DIF.',
    hud_pos_driver: 'POS PILOTO',

    hud_gear: 'MARCHA',
    hud_speed: 'KM/H',
    hud_drs: 'DRS',
    hud_drift: 'DRIFT',
    radar_title: 'RADAR DA PISTA',

    controls_guide: 'W A S D ou Setas para Pilotar • R Reiniciar • Espaço Freio de Mão',

    badge_practice_free: 'TREINO LIVRE - PISTA ABERTA',
    badge_practice_solo: 'TREINO - VOLTA SOLO',
    badge_quali_outlap: 'CLASSIFICAÇÃO - VOLTA DE SAÍDA',
    badge_quali_hotlap: 'CLASSIFICAÇÃO - VOLTA RÁPIDA',
    badge_race_grid: 'CORRIDA - GRID DE LARGADA',
    badge_race_racing: 'CORRIDA',
    badge_finished: 'SESSÃO CONCLUÍDA',
    badge_lap: 'VOLTA {current}/{total}',

    alert_practice_start: 'SESSÃO DE TREINO LIVRE - PISTA ABERTA',
    alert_out_lap: 'VOLTA DE SAÍDA - PREPARE-SE PARA A VOLTA RÁPIDA',
    alert_flying_lap: 'VOLTA RÁPIDA ATIVA - ATAQUE TOTAL!',
    alert_lights_out: 'LUZES APAGADAS E LÁ VAMOS NÓS!',
    alert_checkered_flag: 'BANDEIRA QUADRICULADA! VENCEDOR: {winner}',
    alert_jump_start: 'PENALIDADE POR QUEIMA DE LARGADA (+5.0s)',
    alert_lap_invalidated: 'VOLTA DELETADA - LIMITES DE PISTA EXCEDIDOS',
    alert_final_lap: 'ÚLTIMA VOLTA!',
    alert_wrong_way: 'CONTRAMÃO!',
    alert_reverse_prohibited: 'RÉ NA LINHA DE CHEGADA PROIBIDA',
    alert_circuit_loaded: 'CIRCUITO CARREGADO: {name}',
    alert_car_selected: 'CARRO SELECIONADO: {team}',
    alert_p2_connected: 'JOGADOR 2 CONECTADO VIA WEBRTC!',
    alert_connected_to_host: 'CONECTADO AO HOST! FORMANDO GRID...',
    alert_network_error: 'REDE: {err}',
    alert_ai_diff: 'DIFICULDADE IA: {diff}',

    help_modal_title: 'CONTROLES DO SIMULADOR F1',
    help_primary_driving: 'Controles Principais de Pilotagem',
    help_secondary_actions: 'Ações Secundárias e Câmera',
    help_controller: 'Suporte a Gamepad e Volante',
    help_tips_title: 'Dicas de Pilotagem Grand Prix',
    help_tip_1: 'Pontos de Freada: Freie em linha reta antes da zebra para máxima tração na saída.',
    help_tip_2: 'Uso de DRS: Abre automaticamente nas retas demarcadas quando estiver a menos de 1 segundo.',
    help_tip_3: 'Pressão Aerodinâmica: Acima de 220 km/h o downforce gruda o carro no asfalto.',
    help_btn_close: 'Voltar à Pista',
    help_key_gas: 'Acelerador / Tracionar',
    help_key_brake: 'Freio / Marcha Ré',
    help_key_steer: 'Esterçar Esquerda / Direita',
    help_key_handbrake: 'Freio de Mão (Iniciar Dérrapada)',
    help_key_reset: 'Reposicionar Carro na Pista',
    help_key_camera: 'Câmera em Terceira Pessoa (Fixa)',
    help_key_drs: 'Ativação da Asa Traseira DRS',
    help_key_sound: 'Mutar / Desmutar Áudio',
    help_key_help: 'Abrir este Guia',

    track_modal_title: 'CALENDÁRIO OFICIAL FORMULA 1 2026',
    track_modal_subtitle: 'SELECIONAR CIRCUITO DO GRANDE PRÊMIO',
    track_stat_length: 'EXTENSÃO',
    track_stat_turns: 'CURVAS',
    track_stat_drs: 'ZONAS DRS',
    track_stat_diff: 'DIFICULDADE',
    track_active_badge: 'ATIVO',

    car_modal_title: 'GRID DE CONSTRUTORES F1 2026',
    car_modal_subtitle: 'ESCOLHA SEU CARRO OFICIAL E POWER UNIT',
    car_stat_speed: 'VELOCIDADE MÁXIMA',
    car_stat_aero: 'AERODINÂMICA',
    car_stat_accel: 'ACELERAÇÃO',
    car_btn_select: 'Selecionar Equipe',
    car_active_badge: 'ATIVO',

    quali_modal_title: 'RESULTADOS DA CLASSIFICAÇÃO',
    quali_pole_text: 'POLE POSITION!',
    quali_lap_time: 'TEMPO DE VOLTA',
    quali_delta: 'DIFERENÇA PARA A POLE',
    quali_btn_race: 'Iniciar Corrida',
    quali_btn_practice: 'Voltar aos Treinos',

    race_modal_title: 'CORRIDA CONCLUÍDA',
    race_modal_subtitle: 'Classificação Oficial do Grande Prêmio',
    race_btn_restart: 'Reiniciar Corrida',
    race_btn_practice: 'Voltar aos Treinos',

    mp_modal_title: 'SALA MULTIJOGADOR P2P WEBRTC',
    mp_host_tab: 'CRIAR SALA (HOST)',
    mp_join_tab: 'ENTRAR NA SALA',
    mp_host_code_label: 'Código da Sua Sala:',
    mp_copy_code: 'Copiar Código',
    mp_copied: 'COPIADO PARA A ÁREA DE TRANSFERÊNCIA!',
    mp_host_status_waiting: 'Aguardando o Jogador 2 entrar...',
    mp_btn_launch: 'Iniciar Corrida Multijugador',
    mp_join_code_label: 'Digite o Código de 6 Letras:',
    mp_btn_join: 'Conectar ao Host',
    mp_guest_waiting: 'Conectado! Aguardando o host iniciar...',

    disc_modal_title: 'ADVERSÁRIO DESCONECTADO',
    disc_modal_text: 'O outro piloto desconectou da sessão.',
    disc_btn_close: 'Voltar ao Treino Solo',

    lang_modal_title: 'SELECIONAR IDIOMA / SELECT LANGUAGE',
    lang_modal_subtitle: 'DETECÇÃO AUTOMÁTICA REGIONAL OU SELEÇÃO MANUAL',
    lang_auto_badge: 'Detecção Automática',
    lang_btn_save: 'Confirmar Idioma'
  }
};

export class I18nManager {
  constructor() {
    this.translations = TRANSLATIONS;
    this.supportedLanguages = SUPPORTED_LANGUAGES;
    this.autoDetectedLang = this.detectBrowserLocale();
    this.currentLanguage = this.detectUserLanguage();
    this.listeners = [];
  }

  /**
   * Scans browser navigator locales for regional geographic matching
   * e.g. User with Italian browser locale ('it', 'it-IT', 'it-CH') -> 'it'
   */
  detectBrowserLocale() {
    const browserLocales = [];
    if (typeof navigator !== 'undefined') {
      if (navigator.languages && navigator.languages.length > 0) {
        browserLocales.push(...navigator.languages);
      }
      if (navigator.language) {
        browserLocales.push(navigator.language);
      }
      if (navigator.userLanguage) {
        browserLocales.push(navigator.userLanguage);
      }
    }

    for (const rawLocale of browserLocales) {
      if (!rawLocale) continue;
      const clean = rawLocale.toLowerCase().trim();
      if (clean.startsWith('it')) return 'it';
      if (clean.startsWith('es')) return 'es';
      if (clean.startsWith('fr')) return 'fr';
      if (clean.startsWith('de')) return 'de';
      if (clean.startsWith('ja')) return 'ja';
      if (clean.startsWith('pt')) return 'pt';
      if (clean.startsWith('en')) return 'en';
    }

    return 'en';
  }

  /**
   * Automatically detects the user's regional language based on browser/system settings,
   * falling back to saved user preference if one was explicitly selected.
   */
  detectUserLanguage() {
    try {
      const saved = localStorage.getItem('f1_language');
      if (saved && SUPPORTED_LANGUAGES[saved]) {
        return saved;
      }
    } catch (e) {
      // Ignore localStorage access errors (e.g. security isolation)
    }

    return this.detectBrowserLocale();
  }

  getLanguage() {
    return this.currentLanguage;
  }

  getCurrentLanguage() {
    return this.currentLanguage;
  }

  getLanguageMeta() {
    return SUPPORTED_LANGUAGES[this.currentLanguage] || SUPPORTED_LANGUAGES.en;
  }

  setLanguage(langCode) {
    if (!SUPPORTED_LANGUAGES[langCode]) {
      console.warn(`[i18n] Language '${langCode}' not supported, falling back to 'en'.`);
      langCode = 'en';
    }

    this.currentLanguage = langCode;
    try {
      localStorage.setItem('f1_language', langCode);
    } catch (e) {
      // Ignore localStorage errors
    }

    // Update entire document
    this.updateDOM();

    // Fire listeners
    this.listeners.forEach((callback) => {
      try {
        callback(langCode);
      } catch (e) {
        console.error('[i18n] Listener error:', e);
      }
    });
  }

  onLanguageChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  addListener(callback) {
    return this.onLanguageChange(callback);
  }

  /**
   * Translates a key with optional parameter substitution
   */
  t(key, params = {}, fallback = null) {
    const dict = TRANSLATIONS[this.currentLanguage] || TRANSLATIONS.en;
    let text = dict[key] || TRANSLATIONS.en[key] || fallback || key;
    if (typeof text !== 'string') {
      text = String(text ?? '');
    }

    if (params && typeof params === 'object') {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v ?? ''));
      }
    }

    return text;
  }

  /**
   * Traverses DOM and updates all elements with data-i18n and data-i18n-title
   */
  updateDOM(root = (typeof document !== 'undefined' ? document : null)) {
    if (!root || typeof root.querySelectorAll !== 'function') return;

    // Update text content
    const textEls = root.querySelectorAll('[data-i18n]');
    textEls.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        // If element has SVG or child elements, only replace text node if needed, or set textContent
        const hasSvg = el.querySelector('svg');
        if (hasSvg) {
          // preserve first svg child if present
          const svg = hasSvg.cloneNode(true);
          el.textContent = ' ' + this.t(key);
          el.prepend(svg);
        } else {
          el.textContent = this.t(key);
        }
      }
    });

    // Update tooltip titles
    const titleEls = root.querySelectorAll('[data-i18n-title]');
    titleEls.forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', this.t(key));
      }
    });

    // Update language button display
    if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
      const btnFlag = document.getElementById('lang-btn-flag');
      const btnCode = document.getElementById('lang-btn-code');
      const meta = this.getLanguageMeta();
      if (btnFlag) btnFlag.textContent = meta.flag;
      if (btnCode) btnCode.textContent = meta.code.toUpperCase();

      // Update html lang attribute
      if (document.documentElement) {
        document.documentElement.lang = meta.code;
      }
    }
  }
}

export const i18n = new I18nManager();
