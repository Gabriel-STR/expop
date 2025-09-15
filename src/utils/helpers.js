// Tiny WAV data generators to avoid shipping binaries while keeping repo self-contained
// Simple square wave tone
export function generateBeepWavDataUrl(freq = 440, ms = 100, volume = 0.5) {
  const sampleRate = 22050
  const numSamples = Math.max(1, Math.floor((ms / 1000) * sampleRate))
  const data = new Uint8Array(numSamples)
  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate
    const s = Math.sign(Math.sin(2 * Math.PI * freq * t))
    data[i] = Math.floor((s * 0.5 + 0.5) * volume * 255)
  }
  return pcmToWavDataUrl(data, sampleRate, 1)
}

// Simple looped pattern for background music
export function generateMusicLoopWavDataUrl() {
  const sampleRate = 22050
  const seconds = 2
  const numSamples = sampleRate * seconds
  const data = new Uint8Array(numSamples)
  const tones = [220, 277, 330, 440]
  for (let i = 0; i < numSamples; i += 1) {
    const t = i / sampleRate
    const idx = Math.floor((t % 2) / 0.5) % tones.length
    const s = Math.sign(Math.sin(2 * Math.PI * tones[idx] * t))
    data[i] = Math.floor((s * 0.5 + 0.5) * 200)
  }
  return pcmToWavDataUrl(data, sampleRate, 1)
}

// Natural-sounding footstep loop using filtered noise bursts with quick decay
export function generateFootstepLoopWavDataUrl(options = {}) {
  const {
    seconds = 1.0,
    intervalSec = 0.3,
    noiseVolume = 0.35,
    cutoffHz = 1400,
    decayMs = 70
  } = options

  const sampleRate = 22050
  const totalSamples = Math.max(1, Math.floor(seconds * sampleRate))
  const intervalSamples = Math.max(1, Math.floor(intervalSec * sampleRate))
  const decaySamples = Math.max(1, Math.floor((decayMs / 1000) * sampleRate))

  // Stagger second foot roughly halfway between steps
  const secondFootOffset = Math.max(1, Math.floor(intervalSamples * 0.5))

  // Simple one-pole low-pass filter coefficient
  const clampedCutoff = Math.max(10, Math.min(cutoffHz, sampleRate / 2 - 100))
  const omega = 2 * Math.PI * clampedCutoff
  const alpha = omega / (omega + sampleRate)

  let yPrev = 0
  const data = new Uint8Array(totalSamples)
  for (let i = 0; i < totalSamples; i += 1) {
    const phase = i % intervalSamples
    const tA = phase // time since foot A impact (in samples)
    const tB = (phase - secondFootOffset + intervalSamples) % intervalSamples // time since foot B impact

    const envA = tA < decaySamples ? Math.exp(-tA / decaySamples) : 0
    const envB = tB < decaySamples ? Math.exp(-tB / decaySamples) : 0
    const env = Math.min(1, envA + envB * 0.9)

    // White noise burst shaped by envelope
    const x = (Math.random() * 2 - 1) * noiseVolume * env

    // Apply low-pass filter for softer thump
    const y = yPrev + alpha * (x - yPrev)
    yPrev = y

    const s = Math.max(-1, Math.min(1, y))
    data[i] = Math.floor((s * 0.5 + 0.5) * 255)
  }

  return pcmToWavDataUrl(data, sampleRate, 1)
}

function pcmToWavDataUrl(pcmU8, sampleRate, channels = 1) {
  const bytesPerSample = 1 // 8-bit PCM
  const blockAlign = channels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = pcmU8.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  let offset = 0
  const writeString = s => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i))
    offset += s.length
  }
  const writeUint32 = v => {
    view.setUint32(offset, v, true)
    offset += 4
  }
  const writeUint16 = v => {
    view.setUint16(offset, v, true)
    offset += 2
  }

  writeString('RIFF')
  writeUint32(36 + dataSize)
  writeString('WAVE')
  writeString('fmt ')
  writeUint32(16)
  writeUint16(1) // PCM
  writeUint16(channels)
  writeUint32(sampleRate)
  writeUint32(byteRate)
  writeUint16(blockAlign)
  writeUint16(8 * bytesPerSample)
  writeString('data')
  writeUint32(dataSize)
  for (let i = 0; i < pcmU8.length; i += 1) view.setUint8(offset + i, pcmU8[i])
  const blob = new Blob([buffer], { type: 'audio/wav' })
  return URL.createObjectURL(blob)
}

// Shape utilities
// Canvas 2D
export function drawCanvasShape(ctx, shape, x, y, width, height, options = {}) {
  const { fillStyle = '#cccccc', strokeStyle = null, lineWidth = 1, cornerRadius = 6 } = options

  const halfW = width / 2
  const halfH = height / 2

  ctx.save()
  if (fillStyle) ctx.fillStyle = fillStyle
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth
  }

  const begin = () => ctx.beginPath()
  const finalize = () => {
    if (fillStyle) ctx.fill()
    if (strokeStyle) ctx.stroke()
  }

  switch (shape) {
    case 'rect': {
      begin()
      ctx.rect(x - halfW, y - halfH, width, height)
      finalize()
      break
    }
    case 'roundedRect': {
      const r = Math.max(0, Math.min(cornerRadius, Math.min(halfW, halfH)))
      begin()
      // Rounded rect path
      ctx.moveTo(x - halfW + r, y - halfH)
      ctx.lineTo(x + halfW - r, y - halfH)
      ctx.quadraticCurveTo(x + halfW, y - halfH, x + halfW, y - halfH + r)
      ctx.lineTo(x + halfW, y + halfH - r)
      ctx.quadraticCurveTo(x + halfW, y + halfH, x + halfW - r, y + halfH)
      ctx.lineTo(x - halfW + r, y + halfH)
      ctx.quadraticCurveTo(x - halfW, y + halfH, x - halfW, y + halfH - r)
      ctx.lineTo(x - halfW, y - halfH + r)
      ctx.quadraticCurveTo(x - halfW, y - halfH, x - halfW + r, y - halfH)
      finalize()
      break
    }
    case 'circle': {
      begin()
      const r = Math.min(halfW, halfH)
      ctx.arc(x, y, r, 0, Math.PI * 2)
      finalize()
      break
    }
    case 'triangle': {
      begin()
      ctx.moveTo(x, y - halfH)
      ctx.lineTo(x + halfW, y + halfH)
      ctx.lineTo(x - halfW, y + halfH)
      ctx.closePath()
      finalize()
      break
    }
    case 'diamond': {
      begin()
      ctx.moveTo(x, y - halfH)
      ctx.lineTo(x + halfW, y)
      ctx.lineTo(x, y + halfH)
      ctx.lineTo(x - halfW, y)
      ctx.closePath()
      finalize()
      break
    }
    case 'hexagon': {
      begin()
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i - Math.PI / 6 // flat-top
        const px = x + halfW * Math.cos(angle)
        const py = y + halfH * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      finalize()
      break
    }
    case 'star': {
      begin()
      const spikes = 5
      const outerR = Math.min(halfW, halfH)
      const innerR = outerR * 0.5
      for (let i = 0; i < spikes * 2; i += 1) {
        const r = i % 2 === 0 ? outerR : innerR
        const angle = (Math.PI / spikes) * i - Math.PI / 2
        const px = x + r * Math.cos(angle)
        const py = y + r * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      finalize()
      break
    }
    default: {
      // Fallback to rect
      begin()
      ctx.rect(x - halfW, y - halfH, width, height)
      finalize()
      break
    }
  }

  ctx.restore()
}

// Phaser Graphics
import Phaser from 'phaser'
function toNumberColor(color, fallback = 0xffffff) {
  if (typeof color === 'number') return color
  if (typeof color === 'string') {
    try {
      return Phaser.Display.Color.HexStringToColor(color).color
    } catch (e) {
      return fallback
    }
  }
  return fallback
}

export function drawGraphicsShape(graphics, shape, width, height, options = {}) {
  const { fillColor = 0xffffff, strokeColor = 0x111111, lineWidth = 2, cornerRadius = 6, alpha = 1 } = options

  const halfW = width / 2
  const halfH = height / 2
  const fCol = toNumberColor(fillColor, 0xffffff)
  const sCol = toNumberColor(strokeColor, 0x111111)

  graphics.clear()
  graphics.fillStyle(fCol, alpha)
  graphics.lineStyle(lineWidth, sCol, Math.min(1, alpha * 0.9))

  const begin = () => graphics.beginPath()
  const finalize = () => {
    graphics.closePath()
    graphics.fillPath()
    graphics.strokePath()
  }

  switch (shape) {
    case 'rect': {
      graphics.fillRect(-halfW, -halfH, width, height)
      graphics.strokeRect(-halfW, -halfH, width, height)
      break
    }
    case 'roundedRect': {
      const r = Math.max(0, Math.min(cornerRadius, Math.min(halfW, halfH)))
      begin()
      graphics.moveTo(-halfW + r, -halfH)
      graphics.lineTo(halfW - r, -halfH)
      graphics.arc(halfW - r, -halfH + r, r, Math.PI * 1.5, 0)
      graphics.lineTo(halfW, halfH - r)
      graphics.arc(halfW - r, halfH - r, r, 0, Math.PI * 0.5)
      graphics.lineTo(-halfW + r, halfH)
      graphics.arc(-halfW + r, halfH - r, r, Math.PI * 0.5, Math.PI)
      graphics.lineTo(-halfW, -halfH + r)
      graphics.arc(-halfW + r, -halfH + r, r, Math.PI, Math.PI * 1.5)
      finalize()
      break
    }
    case 'circle': {
      graphics.fillCircle(0, 0, Math.min(halfW, halfH))
      graphics.strokeCircle(0, 0, Math.min(halfW, halfH))
      break
    }
    case 'triangle': {
      begin()
      graphics.moveTo(0, -halfH)
      graphics.lineTo(halfW, halfH)
      graphics.lineTo(-halfW, halfH)
      finalize()
      break
    }
    case 'diamond': {
      begin()
      graphics.moveTo(0, -halfH)
      graphics.lineTo(halfW, 0)
      graphics.lineTo(0, halfH)
      graphics.lineTo(-halfW, 0)
      finalize()
      break
    }
    case 'hexagon': {
      begin()
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i - Math.PI / 6 // flat-top
        const px = Math.cos(angle) * halfW
        const py = Math.sin(angle) * halfH
        if (i === 0) graphics.moveTo(px, py)
        else graphics.lineTo(px, py)
      }
      finalize()
      break
    }
    case 'star': {
      begin()
      const spikes = 5
      const outerR = Math.min(halfW, halfH)
      const innerR = outerR * 0.5
      for (let i = 0; i < spikes * 2; i += 1) {
        const r = i % 2 === 0 ? outerR : innerR
        const angle = (Math.PI / spikes) * i - Math.PI / 2
        const px = Math.cos(angle) * r
        const py = Math.sin(angle) * r
        if (i === 0) graphics.moveTo(px, py)
        else graphics.lineTo(px, py)
      }
      finalize()
      break
    }
    default: {
      graphics.fillRect(-halfW, -halfH, width, height)
      graphics.strokeRect(-halfW, -halfH, width, height)
      break
    }
  }
}

// Simple SVG-like path support (M, L, H, V, C, Z). Coordinates are normalized [0..1].
function tokenizePath(path) {
  if (!path || typeof path !== 'string') return []
  return path.match(/[a-zA-Z]|-?\d*\.?\d+/g) || []
}

function isCommandToken(t) {
  return /^[a-zA-Z]$/.test(t)
}

function parseNormalizedPath(path) {
  const tokens = tokenizePath(path)
  const segs = []
  let i = 0
  let cmd = null
  let cx = 0
  let cy = 0
  let sx = 0
  let sy = 0
  const readNum = () => parseFloat(tokens[i++])
  while (i < tokens.length) {
    if (isCommandToken(tokens[i])) cmd = tokens[i++]
    if (!cmd) break
    switch (cmd) {
      case 'M':
      case 'm': {
        const rx = readNum()
        const ry = readNum()
        const x = cmd === 'm' ? cx + rx : rx
        const y = cmd === 'm' ? cy + ry : ry
        cx = x
        cy = y
        sx = x
        sy = y
        segs.push({ t: 'M', x, y })
        break
      }
      case 'L':
      case 'l': {
        const rx = readNum()
        const ry = readNum()
        const x = cmd === 'l' ? cx + rx : rx
        const y = cmd === 'l' ? cy + ry : ry
        segs.push({ t: 'L', x, y })
        cx = x
        cy = y
        break
      }
      case 'H':
      case 'h': {
        const rx = readNum()
        const x = cmd === 'h' ? cx + rx : rx
        const y = cy
        segs.push({ t: 'L', x, y })
        cx = x
        cy = y
        break
      }
      case 'V':
      case 'v': {
        const ry = readNum()
        const x = cx
        const y = cmd === 'v' ? cy + ry : ry
        segs.push({ t: 'L', x, y })
        cx = x
        cy = y
        break
      }
      case 'C':
      case 'c': {
        const rx1 = readNum()
        const ry1 = readNum()
        const rx2 = readNum()
        const ry2 = readNum()
        const rx = readNum()
        const ry = readNum()
        const x1 = cmd === 'c' ? cx + rx1 : rx1
        const y1 = cmd === 'c' ? cy + ry1 : ry1
        const x2 = cmd === 'c' ? cx + rx2 : rx2
        const y2 = cmd === 'c' ? cy + ry2 : ry2
        const x = cmd === 'c' ? cx + rx : rx
        const y = cmd === 'c' ? cy + ry : ry
        segs.push({ t: 'C', x1, y1, x2, y2, x, y })
        cx = x
        cy = y
        break
      }
      case 'Z':
      case 'z': {
        segs.push({ t: 'Z' })
        cx = sx
        cy = sy
        break
      }
      default: {
        // Skip unsupported commands safely by advancing to the next command token
        while (i < tokens.length && !isCommandToken(tokens[i])) i += 1
        cmd = null
        break
      }
    }
  }
  return segs
}

export function drawCanvasPath(ctx, path, x, y, width, height, options = {}) {
  const { fillStyle = '#cccccc', strokeStyle = '#111111', lineWidth = 1 } = options
  const segs = parseNormalizedPath(path)
  const baseX = x - width / 2
  const baseY = y - height / 2
  ctx.save()
  if (fillStyle) ctx.fillStyle = fillStyle
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth
  }
  ctx.beginPath()
  let startX = 0
  let startY = 0
  let hasStart = false
  for (const s of segs) {
    if (s.t === 'M') {
      const px = baseX + s.x * width
      const py = baseY + s.y * height
      ctx.moveTo(px, py)
      startX = px
      startY = py
      hasStart = true
    } else if (s.t === 'L') {
      const px = baseX + s.x * width
      const py = baseY + s.y * height
      ctx.lineTo(px, py)
    } else if (s.t === 'C') {
      const x1 = baseX + s.x1 * width
      const y1 = baseY + s.y1 * height
      const x2 = baseX + s.x2 * width
      const y2 = baseY + s.y2 * height
      const px = baseX + s.x * width
      const py = baseY + s.y * height
      ctx.bezierCurveTo(x1, y1, x2, y2, px, py)
    } else if (s.t === 'Z' && hasStart) {
      ctx.lineTo(startX, startY)
    }
  }
  if (fillStyle) ctx.fill()
  if (strokeStyle) ctx.stroke()
  ctx.restore()
}

export function drawGraphicsPath(graphics, path, width, height, options = {}) {
  const { fillColor = 0xffffff, strokeColor = 0x111111, lineWidth = 2, alpha = 1 } = options
  const segs = parseNormalizedPath(path)
  const baseX = -width / 2
  const baseY = -height / 2
  graphics.clear()
  graphics.fillStyle(toNumberColor(fillColor, 0xffffff), alpha)
  graphics.lineStyle(lineWidth, toNumberColor(strokeColor, 0x111111), Math.min(1, alpha * 0.9))
  graphics.beginPath()
  let startX = 0
  let startY = 0
  let hasStart = false
  let lastX = null
  let lastY = null
  for (const s of segs) {
    if (s.t === 'M') {
      const px = baseX + s.x * width
      const py = baseY + s.y * height
      graphics.moveTo(px, py)
      startX = px
      startY = py
      hasStart = true
      lastX = px
      lastY = py
    } else if (s.t === 'L') {
      const px = baseX + s.x * width
      const py = baseY + s.y * height
      graphics.lineTo(px, py)
      lastX = px
      lastY = py
    } else if (s.t === 'C') {
      // Approximate cubic Bezier with line segments for Phaser Graphics
      if (lastX === null || lastY === null) {
        const moveX = baseX + s.x * width
        const moveY = baseY + s.y * height
        graphics.moveTo(moveX, moveY)
        lastX = moveX
        lastY = moveY
      } else {
        const p0x = lastX
        const p0y = lastY
        const p1x = baseX + s.x1 * width
        const p1y = baseY + s.y1 * height
        const p2x = baseX + s.x2 * width
        const p2y = baseY + s.y2 * height
        const p3x = baseX + s.x * width
        const p3y = baseY + s.y * height
        const steps = 16
        for (let tStep = 1; tStep <= steps; tStep += 1) {
          const t = tStep / steps
          const mt = 1 - t
          const x = mt * mt * mt * p0x + 3 * mt * mt * t * p1x + 3 * mt * t * t * p2x + t * t * t * p3x
          const y = mt * mt * mt * p0y + 3 * mt * mt * t * p1y + 3 * mt * t * t * p2y + t * t * t * p3y
          graphics.lineTo(x, y)
        }
        lastX = p3x
        lastY = p3y
      }
    } else if (s.t === 'Z' && hasStart) {
      graphics.lineTo(startX, startY)
      lastX = startX
      lastY = startY
    }
  }
  graphics.closePath()
  graphics.fillPath()
  graphics.strokePath()
}