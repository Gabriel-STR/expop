// Tiny WAV data generators to avoid shipping binaries while keeping repo self-contained
// Simple square wave tone
export function generateBeepWavDataUrl(freq = 440, ms = 100, volume = 0.5) {
  const sampleRate = 22050;
  const numSamples = Math.max(1, Math.floor((ms / 1000) * sampleRate));
  const data = new Uint8Array(numSamples);
  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    const s = Math.sign(Math.sin(2 * Math.PI * freq * t));
    data[i] = Math.floor((s * 0.5 + 0.5) * volume * 255);
  }
  return pcmToWavDataUrl(data, sampleRate, 1);
}

// Simple looped pattern for background music
export function generateMusicLoopWavDataUrl() {
  const sampleRate = 22050;
  const seconds = 2;
  const numSamples = sampleRate * seconds;
  const data = new Uint8Array(numSamples);
  const tones = [220, 277, 330, 440];
  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate;
    const idx = Math.floor((t % 2) / 0.5) % tones.length;
    const s = Math.sign(Math.sin(2 * Math.PI * tones[idx] * t));
    data[i] = Math.floor((s * 0.5 + 0.5) * 200);
  }
  return pcmToWavDataUrl(data, sampleRate, 1);
}

function pcmToWavDataUrl(pcmU8, sampleRate, channels = 1) {
  const bytesPerSample = 1; // 8-bit PCM
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmU8.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;
  const writeString = (s) => { for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i)); offset += s.length; };
  const writeUint32 = (v) => { view.setUint32(offset, v, true); offset += 4; };
  const writeUint16 = (v) => { view.setUint16(offset, v, true); offset += 2; };

  writeString('RIFF');
  writeUint32(36 + dataSize);
  writeString('WAVE');
  writeString('fmt ');
  writeUint32(16);
  writeUint16(1); // PCM
  writeUint16(channels);
  writeUint32(sampleRate);
  writeUint32(byteRate);
  writeUint16(blockAlign);
  writeUint16(8 * bytesPerSample);
  writeString('data');
  writeUint32(dataSize);
  for (let i = 0; i < pcmU8.length; i += 1) view.setUint8(offset + i, pcmU8[i]);
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}


// Shape utilities
// Canvas 2D
export function drawCanvasShape(ctx, shape, x, y, width, height, options = {}) {
  const {
    fillStyle = '#cccccc',
    strokeStyle = null,
    lineWidth = 1,
    cornerRadius = 6,
  } = options;

  const halfW = width / 2;
  const halfH = height / 2;

  ctx.save();
  if (fillStyle) ctx.fillStyle = fillStyle;
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
  }

  const begin = () => ctx.beginPath();
  const finalize = () => {
    if (fillStyle) ctx.fill();
    if (strokeStyle) ctx.stroke();
  };

  switch (shape) {
    case 'rect': {
      begin();
      ctx.rect(x - halfW, y - halfH, width, height);
      finalize();
      break;
    }
    case 'roundedRect': {
      const r = Math.max(0, Math.min(cornerRadius, Math.min(halfW, halfH)));
      begin();
      // Rounded rect path
      ctx.moveTo(x - halfW + r, y - halfH);
      ctx.lineTo(x + halfW - r, y - halfH);
      ctx.quadraticCurveTo(x + halfW, y - halfH, x + halfW, y - halfH + r);
      ctx.lineTo(x + halfW, y + halfH - r);
      ctx.quadraticCurveTo(x + halfW, y + halfH, x + halfW - r, y + halfH);
      ctx.lineTo(x - halfW + r, y + halfH);
      ctx.quadraticCurveTo(x - halfW, y + halfH, x - halfW, y + halfH - r);
      ctx.lineTo(x - halfW, y - halfH + r);
      ctx.quadraticCurveTo(x - halfW, y - halfH, x - halfW + r, y - halfH);
      finalize();
      break;
    }
    case 'circle': {
      begin();
      const r = Math.min(halfW, halfH);
      ctx.arc(x, y, r, 0, Math.PI * 2);
      finalize();
      break;
    }
    case 'triangle': {
      begin();
      ctx.moveTo(x, y - halfH);
      ctx.lineTo(x + halfW, y + halfH);
      ctx.lineTo(x - halfW, y + halfH);
      ctx.closePath();
      finalize();
      break;
    }
    case 'diamond': {
      begin();
      ctx.moveTo(x, y - halfH);
      ctx.lineTo(x + halfW, y);
      ctx.lineTo(x, y + halfH);
      ctx.lineTo(x - halfW, y);
      ctx.closePath();
      finalize();
      break;
    }
    case 'hexagon': {
      begin();
      for (let i = 0; i < 6; i += 1) {
        const angle = Math.PI / 3 * i - Math.PI / 6; // flat-top
        const px = x + halfW * Math.cos(angle);
        const py = y + halfH * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      finalize();
      break;
    }
    case 'star': {
      begin();
      const spikes = 5;
      const outerR = Math.min(halfW, halfH);
      const innerR = outerR * 0.5;
      for (let i = 0; i < spikes * 2; i += 1) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      finalize();
      break;
    }
    default: {
      // Fallback to rect
      begin();
      ctx.rect(x - halfW, y - halfH, width, height);
      finalize();
      break;
    }
  }

  ctx.restore();
}

// Phaser Graphics
import Phaser from 'phaser';
function toNumberColor(color, fallback = 0xffffff) {
  if (typeof color === 'number') return color;
  if (typeof color === 'string') {
    try {
      return Phaser.Display.Color.HexStringToColor(color).color;
    } catch (e) {
      return fallback;
    }
  }
  return fallback;
}

export function drawGraphicsShape(graphics, shape, width, height, options = {}) {
  const {
    fillColor = 0xffffff,
    strokeColor = 0x111111,
    lineWidth = 2,
    cornerRadius = 6,
    alpha = 1,
  } = options;

  const halfW = width / 2;
  const halfH = height / 2;
  const fCol = toNumberColor(fillColor, 0xffffff);
  const sCol = toNumberColor(strokeColor, 0x111111);

  graphics.clear();
  graphics.fillStyle(fCol, alpha);
  graphics.lineStyle(lineWidth, sCol, Math.min(1, alpha * 0.9));

  const begin = () => graphics.beginPath();
  const finalize = () => { graphics.closePath(); graphics.fillPath(); graphics.strokePath(); };

  switch (shape) {
    case 'rect': {
      graphics.fillRect(-halfW, -halfH, width, height);
      graphics.strokeRect(-halfW, -halfH, width, height);
      break;
    }
    case 'roundedRect': {
      const r = Math.max(0, Math.min(cornerRadius, Math.min(halfW, halfH)));
      begin();
      graphics.moveTo(-halfW + r, -halfH);
      graphics.lineTo(halfW - r, -halfH);
      graphics.arc(halfW - r, -halfH + r, r, Math.PI * 1.5, 0);
      graphics.lineTo(halfW, halfH - r);
      graphics.arc(halfW - r, halfH - r, r, 0, Math.PI * 0.5);
      graphics.lineTo(-halfW + r, halfH);
      graphics.arc(-halfW + r, halfH - r, r, Math.PI * 0.5, Math.PI);
      graphics.lineTo(-halfW, -halfH + r);
      graphics.arc(-halfW + r, -halfH + r, r, Math.PI, Math.PI * 1.5);
      finalize();
      break;
    }
    case 'circle': {
      graphics.fillCircle(0, 0, Math.min(halfW, halfH));
      graphics.strokeCircle(0, 0, Math.min(halfW, halfH));
      break;
    }
    case 'triangle': {
      begin();
      graphics.moveTo(0, -halfH);
      graphics.lineTo(halfW, halfH);
      graphics.lineTo(-halfW, halfH);
      finalize();
      break;
    }
    case 'diamond': {
      begin();
      graphics.moveTo(0, -halfH);
      graphics.lineTo(halfW, 0);
      graphics.lineTo(0, halfH);
      graphics.lineTo(-halfW, 0);
      finalize();
      break;
    }
    case 'hexagon': {
      begin();
      for (let i = 0; i < 6; i += 1) {
        const angle = Math.PI / 3 * i - Math.PI / 6; // flat-top
        const px = Math.cos(angle) * halfW;
        const py = Math.sin(angle) * halfH;
        if (i === 0) graphics.moveTo(px, py); else graphics.lineTo(px, py);
      }
      finalize();
      break;
    }
    case 'star': {
      begin();
      const spikes = 5;
      const outerR = Math.min(halfW, halfH);
      const innerR = outerR * 0.5;
      for (let i = 0; i < spikes * 2; i += 1) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) graphics.moveTo(px, py); else graphics.lineTo(px, py);
      }
      finalize();
      break;
    }
    default: {
      graphics.fillRect(-halfW, -halfH, width, height);
      graphics.strokeRect(-halfW, -halfH, width, height);
      break;
    }
  }
}

// Simple SVG-like path support (M, L, H, V, Z). Coordinates are normalized [0..1].
function tokenizePath(path) {
  if (!path || typeof path !== 'string') return [];
  return path.match(/[a-zA-Z]|-?\d*\.?\d+/g) || [];
}

function isCommandToken(t) {
  return /^[a-zA-Z]$/.test(t);
}

function parseNormalizedPath(path) {
  const tokens = tokenizePath(path);
  const segs = [];
  let i = 0;
  let cmd = null;
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  const readNum = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    if (isCommandToken(tokens[i])) cmd = tokens[i++];
    if (!cmd) break;
    switch (cmd) {
      case 'M':
      case 'm': {
        const rx = readNum(); const ry = readNum();
        const x = cmd === 'm' ? cx + rx : rx; const y = cmd === 'm' ? cy + ry : ry;
        cx = x; cy = y; sx = x; sy = y;
        segs.push({ t: 'M', x, y });
        break;
      }
      case 'L':
      case 'l': {
        const rx = readNum(); const ry = readNum();
        const x = cmd === 'l' ? cx + rx : rx; const y = cmd === 'l' ? cy + ry : ry;
        segs.push({ t: 'L', x, y });
        cx = x; cy = y;
        break;
      }
      case 'H':
      case 'h': {
        const rx = readNum();
        const x = cmd === 'h' ? cx + rx : rx; const y = cy;
        segs.push({ t: 'L', x, y });
        cx = x; cy = y;
        break;
      }
      case 'V':
      case 'v': {
        const ry = readNum();
        const x = cx; const y = cmd === 'v' ? cy + ry : ry;
        segs.push({ t: 'L', x, y });
        cx = x; cy = y;
        break;
      }
      case 'Z':
      case 'z': {
        segs.push({ t: 'Z' });
        cx = sx; cy = sy;
        break;
      }
      default: {
        // Skip unsupported commands for now
        break;
      }
    }
  }
  return segs;
}

export function drawCanvasPath(ctx, path, x, y, width, height, options = {}) {
  const { fillStyle = '#cccccc', strokeStyle = '#111111', lineWidth = 1 } = options;
  const segs = parseNormalizedPath(path);
  const baseX = x - width / 2;
  const baseY = y - height / 2;
  ctx.save();
  if (fillStyle) ctx.fillStyle = fillStyle;
  if (strokeStyle) { ctx.strokeStyle = strokeStyle; ctx.lineWidth = lineWidth; }
  ctx.beginPath();
  let startX = 0; let startY = 0; let hasStart = false;
  for (const s of segs) {
    if (s.t === 'M') {
      const px = baseX + s.x * width;
      const py = baseY + s.y * height;
      ctx.moveTo(px, py);
      startX = px; startY = py; hasStart = true;
    } else if (s.t === 'L') {
      const px = baseX + s.x * width;
      const py = baseY + s.y * height;
      ctx.lineTo(px, py);
    } else if (s.t === 'Z' && hasStart) {
      ctx.lineTo(startX, startY);
    }
  }
  if (fillStyle) ctx.fill();
  if (strokeStyle) ctx.stroke();
  ctx.restore();
}

export function drawGraphicsPath(graphics, path, width, height, options = {}) {
  const { fillColor = 0xffffff, strokeColor = 0x111111, lineWidth = 2, alpha = 1 } = options;
  const segs = parseNormalizedPath(path);
  const baseX = -width / 2;
  const baseY = -height / 2;
  graphics.clear();
  graphics.fillStyle(toNumberColor(fillColor, 0xffffff), alpha);
  graphics.lineStyle(lineWidth, toNumberColor(strokeColor, 0x111111), Math.min(1, alpha * 0.9));
  graphics.beginPath();
  let startX = 0; let startY = 0; let hasStart = false;
  for (const s of segs) {
    if (s.t === 'M') {
      const px = baseX + s.x * width;
      const py = baseY + s.y * height;
      graphics.moveTo(px, py);
      startX = px; startY = py; hasStart = true;
    } else if (s.t === 'L') {
      const px = baseX + s.x * width;
      const py = baseY + s.y * height;
      graphics.lineTo(px, py);
    } else if (s.t === 'Z' && hasStart) {
      graphics.lineTo(startX, startY);
    }
  }
  graphics.closePath();
  graphics.fillPath();
  graphics.strokePath();
}


