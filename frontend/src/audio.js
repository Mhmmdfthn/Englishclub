// Audio synthesizer using browser Web Audio API (Zero external assets, instant zero-latency feedback)

class AudioManager {
  constructor() {
    this.ctx = null
    this.muted = localStorage.getItem('wh_muted') === 'true'
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  toggleMute() {
    this.muted = !this.muted
    localStorage.setItem('wh_muted', String(this.muted))
    return this.muted
  }

  playSelect() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(440 + Math.random() * 80, this.ctx.currentTime)
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.06)
  }

  playSuccess(combo = 1) {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const baseFreq = 523.25 * (1 + (combo - 1) * 0.12) // C5 escalates with combo
    const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5]

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.07)

      gain.gain.setValueAtTime(0, this.ctx.currentTime + i * 0.07)
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + i * 0.07 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.07 + 0.25)

      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start(this.ctx.currentTime + i * 0.07)
      osc.stop(this.ctx.currentTime + i * 0.07 + 0.25)
    })
  }

  playError() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(150, this.ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(90, this.ctx.currentTime + 0.18)

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18)

    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + 0.18)
  }

  playFever() {
    if (this.muted) return
    this.init()
    if (!this.ctx) return

    const chord = [523.25, 659.25, 783.99, 1046.5]
    chord.forEach((freq) => {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4)

      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.4)
    })
  }
}

export const sound = new AudioManager()
