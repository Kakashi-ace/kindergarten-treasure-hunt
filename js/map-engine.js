const SoundEngine = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playStep() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(560, this.ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  },
  playSuccess() {
    this.init();
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, this.ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.12);
      osc.stop(this.ctx.currentTime + idx * 0.12 + 0.35);
    });
  },
  playFail() {
    this.init();
    const notes = [340, 280, 220];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.15 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.15);
      osc.stop(this.ctx.currentTime + idx * 0.15 + 0.25);
    });
  }
};

class MapEngine {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.colPercent = [11.7, 27.3, 44.1, 62.3];
    this.rowPercent = [27.2, 46.6, 66.8];
    this.token = null;
    this.svgLayer = null;
    this.timeline = null;
    this.initElements();
  }

  initElements() {
    this.container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:10;');
    this.container.appendChild(svg);
    this.svgLayer = svg;

    const token = document.createElement('div');
    token.className = 'map-token';
    token.innerHTML = `<img src="assets/mascot_boy.png" alt="小高">`;
    this.container.appendChild(token);
    this.token = token;
    this.placeAt(2, 3);
  }

  getPixel(row, col) {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const rIdx = Math.max(0, Math.min(this.rowPercent.length - 1, row));
    const cIdx = Math.max(0, Math.min(this.colPercent.length - 1, col));
    return {
      x: (this.colPercent[cIdx] / 100) * w,
      y: (this.rowPercent[rIdx] / 100) * h
    };
  }

  placeAt(row, col) {
    const pos = this.getPixel(row, col);
    if (this.token) {
      this.token.style.left = `${pos.x}px`;
      this.token.style.top = `${pos.y}px`;
    }
  }

  drawPath(coords) {
    this.svgLayer.innerHTML = '';
    if (!coords || coords.length < 2) return;
    const pts = coords.map(c => {
      const p = this.getPixel(c[0], c[1]);
      return `${p.x},${p.y}`;
    }).join(' ');

    const glowLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    glowLine.setAttribute('points', pts);
    glowLine.setAttribute('fill', 'none');
    glowLine.setAttribute('stroke', 'rgba(239, 68, 68, 0.25)');
    glowLine.setAttribute('stroke-width', '14');
    glowLine.setAttribute('stroke-linecap', 'round');
    glowLine.setAttribute('stroke-linejoin', 'round');
    this.svgLayer.appendChild(glowLine);

    const mainLine = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    mainLine.setAttribute('points', pts);
    mainLine.setAttribute('fill', 'none');
    mainLine.setAttribute('stroke', '#E53E3E');
    mainLine.setAttribute('stroke-width', '5');
    mainLine.setAttribute('stroke-dasharray', '10 5');
    mainLine.setAttribute('stroke-linecap', 'round');
    mainLine.setAttribute('stroke-linejoin', 'round');
    this.svgLayer.appendChild(mainLine);

    coords.forEach((c, idx) => {
      const p = this.getPixel(c[0], c[1]);
      if (idx === 0) {
        const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outerCircle.setAttribute('cx', p.x);
        outerCircle.setAttribute('cy', p.y);
        outerCircle.setAttribute('r', '14');
        outerCircle.setAttribute('fill', 'rgba(16, 185, 129, 0.2)');
        this.svgLayer.appendChild(outerCircle);
      }
      const nodeCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      nodeCircle.setAttribute('cx', p.x);
      nodeCircle.setAttribute('cy', p.y);
      nodeCircle.setAttribute('r', idx === 0 ? '7' : '5');
      nodeCircle.setAttribute('fill', idx === 0 ? '#10B981' : '#FFFFFF');
      nodeCircle.setAttribute('stroke', idx === 0 ? '#FFFFFF' : '#E53E3E');
      nodeCircle.setAttribute('stroke-width', '2.5');
      this.svgLayer.appendChild(nodeCircle);
    });
  }

  playRoute(coords, reached, onComplete) {
    if (this.timeline) {
      this.timeline.kill();
    }
    this.placeAt(2, 3);
    this.drawPath([]);

    if (!coords || coords.length <= 1) {
      if (onComplete) onComplete();
      return;
    }

    const currentPts = [coords[0]];
    const tl = gsap.timeline({
      onComplete: () => {
        if (reached) {
          SoundEngine.playSuccess();
          gsap.fromTo(this.token, { scale: 1 }, { scale: 1.35, duration: 0.35, yoyo: true, repeat: 3, ease: "back.out(2)" });
        } else {
          SoundEngine.playFail();
          gsap.to(this.token, { rotation: 15, duration: 0.1, yoyo: true, repeat: 4 });
        }
        if (onComplete) onComplete();
      }
    });

    for (let i = 1; i < coords.length; i++) {
      const targetPos = this.getPixel(coords[i][0], coords[i][1]);
      tl.to(this.token, {
        left: `${targetPos.x}px`,
        top: `${targetPos.y}px`,
        duration: 0.45,
        ease: "power2.out",
        onStart: () => {
          SoundEngine.playStep();
          currentPts.push(coords[i]);
          this.drawPath(currentPts);
        }
      });
      tl.fromTo(this.token, { y: 0, rotation: -3 }, { y: -16, rotation: 3, duration: 0.22, yoyo: true, repeat: 1, ease: "sine.out" }, "<");
    }
    this.timeline = tl;
  }
}
