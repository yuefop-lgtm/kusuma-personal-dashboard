// Cinematic Sasuke Uchiha Intro Engine
class SasukeIntro {
  constructor() {
    this.container = document.getElementById('intro-overlay');
    this.canvas = document.getElementById('intro-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.lightningBolts = [];
    this.animId = null;
    this.active = true;
    this.tomoesRotation = 0;
    this.lastLightning = Date.now();
  }

  init() {
    if (!this.container || !this.canvas) return;
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Create initial particle pool
    const count = window.innerWidth < 768 ? 40 : 80;
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 2.5 + 0.5,
        speedX: (Math.random() - 0.5) * 1.2,
        speedY: (Math.random() - 0.5) * 1.5 - 0.3,
        color: Math.random() > 0.4 ? 'rgba(168, 85, 247, ' : 'rgba(56, 189, 248, ',
        alpha: Math.random() * 0.7 + 0.3,
        flicker: Math.random() * 0.04 + 0.01
      });
    }

    this.bindButtons();
    this.loop();
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  bindButtons() {
    const btnEnter = document.getElementById('btn-intro-enter');
    const btnSkip = document.getElementById('btn-intro-skip');
    const chkDontShow = document.getElementById('chk-intro-never');

    if (btnEnter) {
      btnEnter.addEventListener('click', () => {
        window.ninjaSound && window.ninjaSound.playChidori();
        this.finish(chkDontShow ? chkDontShow.checked : false);
      });
    }

    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        window.ninjaSound && window.ninjaSound.playClick();
        this.finish(chkDontShow ? chkDontShow.checked : false);
      });
    }

    const sasukeAvatar = document.getElementById('sasuke-intro-avatar');
    if (sasukeAvatar) {
      sasukeAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        window.ninjaSound && window.ninjaSound.playChidori();
        const rect = sasukeAvatar.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;
        // Burst 8 lightning bolts shooting outward
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i + (Math.random() - 0.5) * 0.4;
          const dist = Math.random() * 350 + 200;
          this.createLightning(originX, originY, originX + Math.cos(angle) * dist, originY + Math.sin(angle) * dist);
        }
        const hint = document.querySelector('.sasuke-click-hint');
        if (hint) {
          hint.textContent = '⚡ CHIDORI MELEDAK! SHARINGAN BERPUTAR PENUH! ⚡';
          hint.style.color = '#c084fc';
          hint.style.borderColor = '#c084fc';
        }
      });
    }
  }

  createLightning(startX, startY, endX, endY) {
    const segments = [];
    let curX = startX;
    let curY = startY;
    const steps = 14;
    const dx = (endX - startX) / steps;
    const dy = (endY - startY) / steps;

    for (let i = 0; i < steps; i++) {
      const nextX = curX + dx + (Math.random() - 0.5) * 45;
      const nextY = curY + dy + (Math.random() - 0.5) * 45;
      segments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });
      curX = nextX;
      curY = nextY;
    }
    segments.push({ x1: curX, y1: curY, x2: endX, y2: endY });

    this.lightningBolts.push({
      segments,
      alpha: 1.0,
      color: Math.random() > 0.3 ? '#c084fc' : '#38bdf8'
    });
  }

  loop() {
    if (!this.active) return;
    const ctx = this.ctx;
    if (!ctx) return;

    // Dark gradient with motion blur trail
    ctx.fillStyle = 'rgba(7, 7, 14, 0.28)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render Chidori glow pulse in center background
    const pulse = (Math.sin(Date.now() / 400) + 1) * 0.5;
    const radial = ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height * 0.42,
      20,
      this.canvas.width / 2,
      this.canvas.height * 0.42,
      this.canvas.width * 0.45
    );
    radial.addColorStop(0, `rgba(168, 85, 247, ${0.18 + pulse * 0.12})`);
    radial.addColorStop(0.5, `rgba(56, 189, 248, ${0.08 + pulse * 0.08})`);
    radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw & update lightning
    const now = Date.now();
    if (now - this.lastLightning > 1200 + Math.random() * 2000) {
      this.lastLightning = now;
      const startX = Math.random() * this.canvas.width;
      const endX = this.canvas.width / 2 + (Math.random() - 0.5) * 300;
      const endY = this.canvas.height * 0.45 + (Math.random() - 0.5) * 200;
      this.createLightning(startX, 0, endX, endY);
    }

    for (let i = this.lightningBolts.length - 1; i >= 0; i--) {
      const bolt = this.lightningBolts[i];
      ctx.save();
      ctx.strokeStyle = bolt.color;
      ctx.lineWidth = 2.5 * bolt.alpha;
      ctx.shadowColor = bolt.color;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      bolt.segments.forEach((seg) => {
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
      });
      ctx.stroke();
      ctx.restore();

      bolt.alpha -= 0.08;
      if (bolt.alpha <= 0) {
        this.lightningBolts.splice(i, 1);
      }
    }

    // Draw energy particles
    this.particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.alpha += (Math.random() - 0.5) * p.flicker;
      if (p.alpha < 0.2) p.alpha = 0.2;
      if (p.alpha > 0.9) p.alpha = 0.9;

      if (p.y < 0) p.y = this.canvas.height;
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${p.alpha})`;
      ctx.shadowColor = p.color === 'rgba(168, 85, 247, ' ? '#c084fc' : '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.fill();
    });

    this.animId = requestAnimationFrame(() => this.loop());
  }

  finish(dontShowAgain = false) {
    this.active = false;
    if (this.animId) cancelAnimationFrame(this.animId);

    if (dontShowAgain) {
      localStorage.setItem('sasuke_skip_intro', 'true');
      // If user is logged in, sync with backend settings
      fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable_intro: 0 })
      }).catch(() => {});
    }

    if (this.container) {
      this.container.classList.add('intro-fade-out');
      setTimeout(() => {
        this.container.style.display = 'none';
        document.body.classList.remove('intro-active');
      }, 700);
    }
  }
}

window.SasukeIntro = SasukeIntro;
