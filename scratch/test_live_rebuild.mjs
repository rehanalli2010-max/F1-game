import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACTS_DIR = 'C:/Users/CHC/.gemini/antigravity-ide/brain/75d6a1f4-5ab9-4fe0-a584-01925a3c23a3';

async function getWsUrl() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const targets = JSON.parse(d);
        const t = targets.find(x => x.type === 'page' && x.url && x.url.includes('3000')) || targets[0];
        resolve(t.webSocketDebuggerUrl);
      });
    });
  });
}

async function main() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id).resolve(d.result);
      pending.delete(d.id);
    }
  };
  const send = (method, params = {}) => new Promise(resolve => {
    const reqId = id++;
    pending.set(reqId, { resolve });
    ws.send(JSON.stringify({ id: reqId, method, params }));
  });
  await new Promise(r => ws.onopen = r);

  // Apply new getTerrainHeight and rebuild terrain mesh in live game
  console.log('Injecting refined getTerrainHeight and rebuilding ground mesh...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const pts = g.track.sampledPoints;
      const count = pts.length;
      const halfW = g.track.trackWidth / 2;

      g.track.getTerrainHeight = function(x, z) {
        if (!pts || pts.length === 0) return -0.05;

        let minDistSq = Infinity;
        let bestIdx = 0;

        for (let i = 0; i < count; i++) {
          const p = pts[i];
          const dx = p.x - x;
          const dz = p.z - z;
          const dSq = dx * dx + dz * dz;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            bestIdx = i;
          }
        }

        const dist = Math.sqrt(minDistSq);
        const pt = pts[bestIdx];
        const roadClearance = halfW + 4.5;

        const minTrackY = this._minTrackElevation !== undefined ? this._minTrackElevation : -0.05;
        const baseGroundLevel = Math.min(-0.05, minTrackY - 1.5);

        let minLocalY = pt.y;
        for (let j = -8; j <= 8; j++) {
          const nIdx = (bestIdx + j + count) % count;
          if (pts[nIdx].y < minLocalY) minLocalY = pts[nIdx].y;
        }

        const safeRoadY = Math.min(pt.y - 0.15, minLocalY - 0.10);

        if (dist <= roadClearance) {
          return safeRoadY;
        }

        const maxInfluenceDist = 140.0;
        if (dist >= maxInfluenceDist) {
          return baseGroundLevel;
        }

        const u = (dist - roadClearance) / (maxInfluenceDist - roadClearance);
        const blend = 0.5 * (1.0 + Math.cos(Math.PI * u));
        const rawY = blend * safeRoadY + (1.0 - blend) * baseGroundLevel;

        return Math.min(rawY, minLocalY - 0.08, pt.y - 0.08);
      };

      // Re-evaluate ground mesh vertices
      let groundMesh = null;
      g.track.trackRoot.traverse(c => {
        if (c.isMesh && c.geometry && c.geometry.type === 'PlaneGeometry' && c.geometry.parameters.width > 2000) {
          groundMesh = c;
        }
      });

      if (groundMesh) {
        // Recreate with 180x180 resolution (13m spacing)
        const oldMat = groundMesh.material;
        g.track.trackRoot.remove(groundMesh);
        groundMesh.geometry.dispose();

        const terrainSize = 2600;
        const terrainSegments = 180;
        const newGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
        newGeo.rotateX(-Math.PI / 2);

        const posAttr = newGeo.attributes.position;
        const pArr = posAttr.array;
        const vCount = posAttr.count;

        for (let i = 0; i < vCount; i++) {
          const vx = pArr[i * 3];
          const vz = pArr[i * 3 + 2];
          pArr[i * 3 + 1] = g.track.getTerrainHeight(vx, vz);
        }
        posAttr.needsUpdate = true;
        newGeo.computeVertexNormals();

        const newMesh = new THREE.Mesh(newGeo, oldMat);
        newMesh.position.y = 0;
        newMesh.receiveShadow = true;
        g.track.trackRoot.add(newMesh);
      }
    })()`
  });

  // Teleport player car to Eau Rouge valley floor (t = 0.20)
  console.log('Positioning car at Eau Rouge valley floor...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.20;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t);
      const yaw = Math.atan2(tgt.x, tgt.z);

      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 65.0);
      g.playerCar.setPositionAndRotation(g.playerVehicle.body.position, g.playerVehicle.body.quaternion);

      const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
      g.camera.position.set(pt.x - fwd.x * 10.0, pt.y + 3.5, pt.z - fwd.z * 10.0);
      g.camera.lookAt(pt.x + fwd.x * 25.0, pt.y + 6.0, pt.z + fwd.z * 25.0);
    })()`
  });

  await new Promise(r => setTimeout(r, 600));
  let shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_perfect_eau_rouge_valley.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_perfect_eau_rouge_valley.png');

  // Also capture approach view
  await send('Runtime.evaluate', {
    expression: `(() => {
      const g = window.game;
      const t = 0.15;
      const pt = g.track.curve.getPointAt(t);
      const tgt = g.track.curve.getTangentAt(t);
      const yaw = Math.atan2(tgt.x, tgt.z);

      g.physics.resetVehicle(g.playerVehicle, pt.x, pt.y + 0.04, pt.z, yaw, 55.0);
      g.playerCar.setPositionAndRotation(g.playerVehicle.body.position, g.playerVehicle.body.quaternion);

      const fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
      g.camera.position.set(pt.x - fwd.x * 12.0, pt.y + 4.5, pt.z - fwd.z * 12.0);
      g.camera.lookAt(pt.x + fwd.x * 20.0, pt.y - 2.0, pt.z + fwd.z * 20.0);
    })()`
  });

  await new Promise(r => setTimeout(r, 600));
  shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'spa_perfect_eau_rouge_approach.png'), Buffer.from(shot.data, 'base64'));
  console.log('Saved spa_perfect_eau_rouge_approach.png');

  ws.close();
}

main().catch(console.error);
