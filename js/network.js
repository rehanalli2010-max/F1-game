/**
 * WebRTC Peer-to-Peer Network Controller using PeerJS
 * Provides Host-Authoritative Client-Server topology over DataChannels with 6-character room codes.
 */

export const NETWORK_PACKET_TYPES = {
  HELLO: 'HELLO',
  INIT_GAME: 'INIT_GAME',
  STATE_SYNC: 'STATE_SYNC',
  INPUT: 'INPUT',
  START_LIGHTS: 'START_LIGHTS',
  QUALI_RESULTS: 'QUALI_RESULTS',
  RACE_FINISH: 'RACE_FINISH',
  DISCONNECT: 'DISCONNECT'
};

export class NetworkManager {
  constructor() {
    this.peer = null;
    this.conn = null;
    this.isHost = false;
    this.isConnected = false;
    this.roomCode = null;

    // Callbacks
    this.onPeerReady = null;
    this.onGuestConnected = null;
    this.onHostConnected = null;
    this.onDisconnected = null;
    this.onInitGame = null;
    this.onStateSync = null;
    this.onInput = null;
    this.onStartLights = null;
    this.onQualiResults = null;
    this.onRaceFinish = null;
    this.onError = null;

    // Rate limiting for state broadcast (~30Hz)
    this.lastBroadcastTime = 0;
    this.broadcastIntervalMs = 33; // 30 packets per second
  }

  /**
   * Generates a clean, randomized 6-character room code (e.g. "F1-X7K2")
   */
  static generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous 0, O, 1, I
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `F1-${suffix}`;
  }

  /**
   * Formats a room code into an internal PeerJS ID
   */
  static formatPeerId(code) {
    const clean = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return `f1gp-2026-${clean.toLowerCase()}`;
  }

  /**
   * Host a new room with a 6-character room code
   */
  hostRoom(roomCode = null, retryCount = 0) {
    this.cleanup();
    this.isHost = true;
    this.roomCode = roomCode || NetworkManager.generateRoomCode();
    const peerId = NetworkManager.formatPeerId(this.roomCode);

    if (typeof window.Peer === 'undefined') {
      console.error('PeerJS library not loaded');
      if (this.onError) this.onError('PeerJS library not loaded. Check internet connection.');
      return;
    }

    const MAX_RETRIES = 5;

    try {
      this.peer = new window.Peer(peerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        console.log(`[Host] Peer initialized with room code ${this.roomCode} (id: ${id})`);
        if (this.onPeerReady) this.onPeerReady(this.roomCode);
      });

      this.peer.on('connection', (conn) => {
        console.log('[Host] Guest connection request received');
        this.conn = conn;
        this.setupConnectionHandlers();
      });

      this.peer.on('error', (err) => {
        console.error('[Host] Peer error:', err);
        if (err.type === 'unavailable-id' && retryCount < MAX_RETRIES) {
          // Retry with new code if collision (max 5 retries)
          this.hostRoom(null, retryCount + 1);
        } else {
          if (this.onError) this.onError(err.message || 'PeerJS network error');
        }
      });

      this.peer.on('disconnected', () => {
        console.warn('[Host] Peer disconnected from signaling server');
      });
    } catch (e) {
      console.error('[Host] Initialization failed:', e);
      if (this.onError) this.onError(e.message);
    }
  }

  /**
   * Join an existing room via 6-character room code
   */
  joinRoom(roomCode) {
    this.cleanup();
    this.isHost = false;
    this.roomCode = roomCode.trim().toUpperCase();
    const targetPeerId = NetworkManager.formatPeerId(this.roomCode);

    if (typeof window.Peer === 'undefined') {
      console.error('PeerJS library not loaded');
      if (this.onError) this.onError('PeerJS library not loaded');
      return;
    }

    try {
      // Connect as an anonymous guest
      this.peer = new window.Peer({
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        console.log(`[Guest] Anonymous peer opened (${id}), connecting to ${targetPeerId}...`);
        this.conn = this.peer.connect(targetPeerId, {
          reliable: false // Low-latency UDP DataChannel for game state/inputs
        });
        this.setupConnectionHandlers();
      });

      this.peer.on('error', (err) => {
        console.error('[Guest] Peer error:', err);
        if (this.onError) this.onError(`Failed to connect to room: ${err.type || err.message}`);
      });
    } catch (e) {
      console.error('[Guest] Join failed:', e);
      if (this.onError) this.onError(e.message);
    }
  }

  setupConnectionHandlers() {
    if (!this.conn) return;

    this.conn.on('open', () => {
      this.isConnected = true;
      console.log(`[Network] Connection established (isHost=${this.isHost})`);

      if (this.isHost) {
        if (this.onGuestConnected) this.onGuestConnected(this.conn);
      } else {
        // Send initial HELLO packet
        this.send({
          type: NETWORK_PACKET_TYPES.HELLO,
          clientTime: performance.now(),
          name: 'GUEST'
        });
        if (this.onHostConnected) this.onHostConnected(this.conn);
      }
    });

    this.conn.on('data', (packet) => {
      this.handleIncomingPacket(packet);
    });

    this.conn.on('close', () => {
      console.warn('[Network] Connection closed');
      this.handleDisconnection();
    });

    this.conn.on('error', (err) => {
      console.error('[Network] Connection error:', err);
      this.handleDisconnection();
    });
  }

  handleIncomingPacket(packet) {
    if (!packet || !packet.type) return;

    switch (packet.type) {
      case NETWORK_PACKET_TYPES.HELLO:
        console.log('[Host] Received HELLO from Guest');
        break;

      case NETWORK_PACKET_TYPES.INIT_GAME:
        if (!this.isHost && this.onInitGame) {
          this.onInitGame(packet);
        }
        break;

      case NETWORK_PACKET_TYPES.STATE_SYNC:
        if (!this.isHost && this.onStateSync) {
          this.onStateSync(packet);
        }
        break;

      case NETWORK_PACKET_TYPES.INPUT:
        if (this.isHost && this.onInput) {
          this.onInput(packet);
        }
        break;

      case NETWORK_PACKET_TYPES.START_LIGHTS:
        if (!this.isHost && this.onStartLights) {
          this.onStartLights(packet);
        }
        break;

      case NETWORK_PACKET_TYPES.QUALI_RESULTS:
        if (!this.isHost && this.onQualiResults) {
          this.onQualiResults(packet);
        }
        break;

      case NETWORK_PACKET_TYPES.RACE_FINISH:
        if (!this.isHost && this.onRaceFinish) {
          this.onRaceFinish(packet);
        }
        break;

      case NETWORK_PACKET_TYPES.DISCONNECT:
        this.handleDisconnection();
        break;
    }
  }

  handleDisconnection() {
    const wasConnected = this.isConnected;
    this.isConnected = false;
    if (this.conn) {
      try { this.conn.close(); } catch (e) {}
      this.conn = null;
    }
    if (wasConnected && this.onDisconnected) {
      this.onDisconnected();
    }
  }

  /**
   * Sends arbitrary payload through WebRTC DataChannel
   */
  send(packet) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(packet);
      } catch (e) {
        console.warn('[Network] Send failed:', e);
      }
    }
  }

  /**
   * Host broadcast state packet (rate-limited to 30Hz)
   */
  broadcastState(sessionState, carsArray) {
    if (!this.isHost || !this.isConnected) return;

    const now = performance.now();
    if (now - this.lastBroadcastTime < this.broadcastIntervalMs) {
      return;
    }
    this.lastBroadcastTime = now;

    this.send({
      type: NETWORK_PACKET_TYPES.STATE_SYNC,
      t: now,
      session: sessionState,
      cars: carsArray
    });
  }

  /**
   * Guest sends local raw input to Host at 60Hz
   */
  sendGuestInput(inputs) {
    if (this.isHost || !this.isConnected) return;

    this.send({
      type: NETWORK_PACKET_TYPES.INPUT,
      t: performance.now(),
      inputs: {
        throttle: inputs.throttle || 0,
        brake: inputs.brake || 0,
        steer: inputs.steer || 0
      }
    });
  }

  cleanup() {
    this.isConnected = false;
    if (this.conn) {
      try {
        this.send({ type: NETWORK_PACKET_TYPES.DISCONNECT });
        this.conn.close();
      } catch (e) {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
  }
}
