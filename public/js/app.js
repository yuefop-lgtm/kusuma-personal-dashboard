// ========================================================
// CORE APPLICATION CONTROLLER & NAVIGATION
// ========================================================

const App = {
  user: null,
  settings: null,
  activeView: 'dashboard',

  async init() {
    this.initClock();
    this.initNavigation();
    this.initModals();
    this.initSidebarToggle();
    this.initAmbientLightning();
    this.initShinobiInteractive();

    // Check Authentication status
    await this.checkAuth();
  },

  // ------------------------------------------------------
  // AUTHENTICATION
  // ------------------------------------------------------
  async checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        this.user = data.user;
        this.settings = data.settings || {};
        this.applySettings(this.settings);
        this.updateUserUI(this.user);
        this.hideAuthOverlay();

        // Check if intro should be shown
        const skipLocal = localStorage.getItem('sasuke_skip_intro');
        if (this.settings.enable_intro !== 0 && !skipLocal) {
          this.showIntro();
        } else {
          const introElem = document.getElementById('intro-overlay');
          if (introElem) introElem.style.display = 'none';
        }

        // Load initial active view
        this.navigate(this.activeView);
      } else {
        this.showAuthOverlay();
      }
    } catch (err) {
      console.error('Check auth error:', err);
      this.showAuthOverlay();
    }
  },

  showAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    const introElem = document.getElementById('intro-overlay');
    if (introElem) introElem.style.display = 'none';
    if (overlay) overlay.classList.add('active');
  },

  hideAuthOverlay() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.classList.remove('active');
  },

  async login(username, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playSuccess();
        this.user = data.user;
        this.settings = data.settings;
        this.applySettings(this.settings);
        this.updateUserUI(this.user);
        this.hideAuthOverlay();
        this.showToast('success', 'Chidori Terbuka!', data.message);

        // Check intro
        const skipLocal = localStorage.getItem('sasuke_skip_intro');
        if (this.settings.enable_intro !== 0 && !skipLocal) {
          this.showIntro();
        } else {
          this.navigate('dashboard');
        }
      } else {
        window.ninjaSound && window.ninjaSound.playClick();
        this.showToast('error', 'Akses Ditolak', data.message || 'Username atau password salah.');
      }
    } catch (err) {
      this.showToast('error', 'Error Koneksi', 'Gagal menghubungi server.');
    }
  },

  async logout() {
    if (!confirm('Apakah kamu yakin ingin keluar dari Sasuke Shinobi Dashboard?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      this.user = null;
      window.ninjaSound && window.ninjaSound.playClick();
      this.showToast('info', 'Logged Out', 'Kamu telah keluar dari sistem.');
      this.showAuthOverlay();
    } catch (e) {
      location.reload();
    }
  },

  showIntro() {
    const introElem = document.getElementById('intro-overlay');
    if (introElem) {
      introElem.style.display = 'flex';
      introElem.classList.remove('intro-fade-out');
      const intro = new SasukeIntro();
      intro.init();
    }
  },

  updateUserUI(user) {
    const nameElems = document.querySelectorAll('.user-full-name');
    nameElems.forEach((el) => (el.textContent = user.full_name || 'Agung Kusuma Tri Atmaja'));

    const usernameElems = document.querySelectorAll('.user-username');
    usernameElems.forEach((el) => (el.textContent = '@' + (user.username || 'agung')));

    const rankElems = document.querySelectorAll('.user-ninja-rank');
    rankElems.forEach((el) => (el.textContent = user.ninja_rank || 'S-Rank Specialist'));

    const avatarElems = document.querySelectorAll('.user-avatar-img');
    const avatarUrl = user.avatar
      ? `/api/files/avatars/${user.avatar}`
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%231a1528" stroke="%23a855f7" stroke-width="4"/><path d="M50 25a18 18 0 1 0 0 36 18 18 0 0 0 0-36zm0 44c-20 0-36 10-36 20v4h72v-4c0-10-16-20-36-20z" fill="%23c084fc"/></svg>';

    avatarElems.forEach((img) => (img.src = avatarUrl));
  },

  applySettings(settings) {
    if (!settings) return;
    const root = document.documentElement;

    // Theme
    root.setAttribute('data-theme', settings.theme || 'dark');

    // Accent
    root.setAttribute('data-accent', settings.accent_color || 'purple');
    if (settings.accent_color === 'custom' && settings.custom_accent) {
      root.style.setProperty('--accent-primary', settings.custom_accent);
      root.style.setProperty('--accent-secondary', settings.custom_accent);
      root.style.setProperty('--border-glow', settings.custom_accent);
    }

    // Animation intensity
    root.setAttribute('data-anim', settings.animation_intensity || 'high');

    // Sidebar size
    root.setAttribute('data-sidebar', settings.sidebar_size || 'default');

    // Sound toggle
    if (window.ninjaSound) {
      window.ninjaSound.enabled = settings.enable_sound !== 0;
    }

    // Ambient lightning
    this.ambientLightningEnabled = settings.effect_lightning !== 0;
  },

  // ------------------------------------------------------
  // NAVIGATION & ROUTING
  // ------------------------------------------------------
  initNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = btn.getAttribute('data-view');
        this.navigate(targetView);
        // Mobile sidebar close
        const sidebar = document.querySelector('.app-sidebar');
        if (sidebar && window.innerWidth < 768) {
          sidebar.classList.remove('sidebar-open');
        }
      });
    });

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }

    // Auth Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value;
        const p = document.getElementById('login-password').value;
        this.login(u, p);
      });
    }
  },

  navigate(viewName) {
    window.ninjaSound && window.ninjaSound.playClick();
    this.activeView = viewName;

    // Highlight nav
    document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Hide all view sections
    document.querySelectorAll('.view-section').forEach((sec) => {
      sec.classList.remove('active');
    });

    // Show target view
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add('active');
    }

    // Update topbar title
    const titles = {
      dashboard: 'Dashboard Utama',
      profile: 'Profil Saya',
      subjects: 'Mata Pelajaran & Materi',
      sports: 'Jadwal Olahraga',
      documents: 'Dokumen Pribadi',
      gallery: 'Galeri Foto Sasuke',
      settings: 'Pengaturan Sistem'
    };
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = titles[viewName] || 'Dashboard';

    // Trigger specific view loaders
    if (viewName === 'dashboard' && window.DashboardView) window.DashboardView.load();
    if (viewName === 'subjects' && window.SubjectsView) window.SubjectsView.load();
    if (viewName === 'sports' && window.SportsView) window.SportsView.load();
    if (viewName === 'documents' && window.DocumentsView) window.DocumentsView.load();
    if (viewName === 'gallery' && window.GalleryView) window.GalleryView.load();
    if (viewName === 'settings' && window.SettingsView) window.SettingsView.load();
  },

  // ------------------------------------------------------
  // MODALS & DIALOGS
  // ------------------------------------------------------
  initModals() {
    document.querySelectorAll('.btn-modal-close, .modal-backdrop').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target === el || el.classList.contains('btn-modal-close')) {
          this.closeAllModals();
        }
      });
    });
  },

  openModal(modalId) {
    window.ninjaSound && window.ninjaSound.playClick();
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
  },

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.remove('active'));
  },

  // ------------------------------------------------------
  // TOAST NOTIFICATIONS
  // ------------------------------------------------------
  showToast(type, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      ${iconSvg}
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  // ------------------------------------------------------
  // CLOCK & SIDEBAR
  // ------------------------------------------------------
  initClock() {
    const clockEl = document.getElementById('live-clock-time');
    const dateEl = document.getElementById('live-clock-date');
    const update = () => {
      const now = new Date();
      if (clockEl) {
        clockEl.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
      if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      }
    };
    update();
    setInterval(update, 1000);
  },

  initSidebarToggle() {
    const btnToggle = document.getElementById('btn-sidebar-toggle');
    const sidebar = document.querySelector('.app-sidebar');
    if (btnToggle && sidebar) {
      btnToggle.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar-open');
      });
    }
  },

  // ------------------------------------------------------
  // BACKGROUND AMBIENT LIGHTNING
  // ------------------------------------------------------
  initAmbientLightning() {
    const canvas = document.getElementById('ambient-lightning-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let bolts = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const makeBolt = () => {
      if (!this.ambientLightningEnabled) return;
      const x1 = Math.random() * canvas.width;
      const y1 = 0;
      const x2 = x1 + (Math.random() - 0.5) * 200;
      const y2 = Math.random() * (canvas.height * 0.6) + 150;

      const segs = [];
      let cx = x1, cy = y1;
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const nx = cx + (x2 - x1) / steps + (Math.random() - 0.5) * 35;
        const ny = cy + (y2 - y1) / steps + (Math.random() - 0.5) * 25;
        segs.push({ x1: cx, y1: cy, x2: nx, y2: ny });
        cx = nx; cy = ny;
      }
      bolts.push({ segs, alpha: 0.8 });
    };

    setInterval(() => {
      if (Math.random() > 0.6) makeBolt();
    }, 4500);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        ctx.strokeStyle = `rgba(192, 132, 252, ${b.alpha * 0.5})`;
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        b.segs.forEach(s => { ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); });
        ctx.stroke();
        b.alpha -= 0.04;
        if (b.alpha <= 0) bolts.splice(i, 1);
      }
      requestAnimationFrame(draw);
    };
    draw();
    this.ambientLightningMakeBolt = makeBolt;
  },

  // ------------------------------------------------------
  // INTERACTIVE SASUKE UCHIHA EFFECTS & COMPANION
  // ------------------------------------------------------
  initShinobiInteractive() {
    const speechLines = [
      "⚡ Chidori siap! Tekad ninja klan Uchiha selalu menyertaimu, Agung.",
      "👁️ Mata Sharingan mampu menganalisis setiap baris kode dengan presisi mutlak.",
      "📚 Jangan biarkan tugas perkuliahan menumpuk. Disiplin adalah jalan ninja sejati!",
      "🏃 Kebugaran fisik sama pentingnya dengan kecerdasan strategi. Jaga konsistensi olahraga!",
      "🛡️ Susanoo pelindung aktif. Semua dokumen pribadimu aman terenkripsi di server.",
      "🔥 Amaterasu! Kobarkan semangat belajarmu dan lampaui batas kemampuanmu hari ini."
    ];
    let speechIdx = 0;

    const companionBtn = document.getElementById('btn-shinobi-companion');
    const bubble = document.getElementById('shinobi-speech-bubble');
    const speechText = document.getElementById('shinobi-speech-text');
    const closeBtn = document.getElementById('btn-close-shinobi-bubble');

    if (companionBtn) {
      companionBtn.addEventListener('click', () => {
        this.triggerChidoriBurst();
        speechIdx = (speechIdx + 1) % speechLines.length;
        if (speechText) speechText.textContent = speechLines[speechIdx];
        if (bubble) bubble.style.display = 'flex';
      });
    }

    if (closeBtn && bubble) {
      closeBtn.addEventListener('click', () => {
        bubble.style.display = 'none';
      });
    }

    const heroSasuke = document.getElementById('dash-hero-sasuke');
    if (heroSasuke) {
      heroSasuke.addEventListener('click', () => {
        this.triggerChidoriBurst();
        this.showToast('info', 'Chidori Strike!', 'Sasuke melepaskan sambaran petir Chidori Stream!');
      });
    }
  },

  triggerChidoriBurst() {
    window.ninjaSound && window.ninjaSound.playChidori();
    const canvas = document.getElementById('ambient-lightning-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Trigger visual screen shake & flash
    document.body.style.filter = 'drop-shadow(0 0 20px rgba(56, 189, 248, 0.6))';
    setTimeout(() => {
      document.body.style.filter = 'none';
    }, 250);

    // Blast multiple bolts across screen
    if (this.ambientLightningMakeBolt) {
      for (let i = 0; i < 6; i++) {
        setTimeout(() => this.ambientLightningMakeBolt(), i * 60);
      }
    }
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
