// ========================================================
// PENGATURAN & PROFIL VIEW CONTROLLER
// ========================================================

const SettingsView = {
  settings: null,

  init() {
    this.bindSettingsControls();
    this.bindProfileControls();
    this.bindPasswordControls();
  },

  async load() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        this.settings = data.settings;
        this.populateSettingsForm(this.settings);
      }
    } catch (e) {
      console.error('Settings load error:', e);
    }
  },

  populateSettingsForm(s) {
    // Theme select
    const themeSelect = document.getElementById('setting-theme');
    if (themeSelect) themeSelect.value = s.theme || 'dark';

    // Accent swatch active state
    document.querySelectorAll('.swatch-btn').forEach((btn) => {
      if (btn.getAttribute('data-accent') === s.accent_color) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const customColorInput = document.getElementById('setting-custom-accent');
    if (customColorInput) customColorInput.value = s.custom_accent || '#9d4edd';

    // Animation intensity slider
    const animSlider = document.getElementById('setting-anim-intensity');
    if (animSlider) animSlider.value = s.animation_intensity || 'high';

    // Toggles
    const togLightning = document.getElementById('setting-toggle-lightning');
    if (togLightning) togLightning.checked = s.effect_lightning !== 0;

    const togSharingan = document.getElementById('setting-toggle-sharingan');
    if (togSharingan) togSharingan.checked = s.effect_sharingan !== 0;

    const togIntro = document.getElementById('setting-toggle-intro');
    if (togIntro) togIntro.checked = s.enable_intro !== 0;

    const togSound = document.getElementById('setting-toggle-sound');
    if (togSound) togSound.checked = s.enable_sound !== 0;

    // Sidebar size
    const sidebarSelect = document.getElementById('setting-sidebar-size');
    if (sidebarSelect) sidebarSelect.value = s.sidebar_size || 'default';
  },

  bindSettingsControls() {
    // Swatch click
    document.querySelectorAll('.swatch-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.swatch-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const accent = btn.getAttribute('data-accent');
        document.documentElement.setAttribute('data-accent', accent);
      });
    });

    // Theme live preview
    const themeSelect = document.getElementById('setting-theme');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.value);
      });
    }

    // Animation live preview
    const animSlider = document.getElementById('setting-anim-intensity');
    if (animSlider) {
      animSlider.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-anim', e.target.value);
      });
    }

    // Save Settings Button
    const btnSave = document.getElementById('btn-save-settings');
    if (btnSave) {
      btnSave.addEventListener('click', () => this.saveSettings());
    }

    // Reset Settings Button
    const btnReset = document.getElementById('btn-reset-settings');
    if (btnReset) {
      btnReset.addEventListener('click', () => this.resetSettings());
    }
  },

  async saveSettings() {
    const theme = document.getElementById('setting-theme').value;
    const activeSwatch = document.querySelector('.swatch-btn.active');
    const accent_color = activeSwatch ? activeSwatch.getAttribute('data-accent') : 'purple';
    const custom_accent = document.getElementById('setting-custom-accent').value;
    const animation_intensity = document.getElementById('setting-anim-intensity').value;
    const effect_lightning = document.getElementById('setting-toggle-lightning').checked ? 1 : 0;
    const effect_sharingan = document.getElementById('setting-toggle-sharingan').checked ? 1 : 0;
    const enable_intro = document.getElementById('setting-toggle-intro').checked ? 1 : 0;
    const enable_sound = document.getElementById('setting-toggle-sound').checked ? 1 : 0;
    const sidebar_size = document.getElementById('setting-sidebar-size').value;

    const payload = {
      theme,
      accent_color,
      custom_accent,
      animation_intensity,
      effect_lightning,
      effect_sharingan,
      enable_intro,
      enable_sound,
      sidebar_size
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playSuccess();
        App.showToast('success', 'Tersimpan', data.message);
        App.applySettings(data.settings);
        // Sync local storage skip intro preference
        if (enable_intro === 0) {
          localStorage.setItem('sasuke_skip_intro', 'true');
        } else {
          localStorage.removeItem('sasuke_skip_intro');
        }
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal menyimpan pengaturan ke database.');
    }
  },

  async resetSettings() {
    if (!confirm('Kembalikan semua pengaturan visual dan audio ke bawaan asli Sasuke Uchiha?')) return;
    try {
      const res = await fetch('/api/settings/reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playClick();
        App.showToast('info', 'Direset', data.message);
        App.applySettings(data.settings);
        this.populateSettingsForm(data.settings);
        localStorage.removeItem('sasuke_skip_intro');
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal mereset pengaturan.');
    }
  },

  // ------------------------------------------------------
  // PROFILE CONTROLS
  // ------------------------------------------------------
  bindProfileControls() {
    const formProfile = document.getElementById('form-edit-profile');
    if (formProfile) {
      formProfile.addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name = document.getElementById('profile-edit-name').value;
        const bio = document.getElementById('profile-edit-bio').value;
        const ninja_rank = document.getElementById('profile-edit-rank').value;

        try {
          const res = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, bio, ninja_rank })
          });
          const data = await res.json();
          if (data.success) {
            window.ninjaSound && window.ninjaSound.playSuccess();
            App.showToast('success', 'Profil Diperbarui', data.message);
            App.user = data.user;
            App.updateUserUI(data.user);
          } else {
            App.showToast('error', 'Gagal', data.message);
          }
        } catch (err) {
          App.showToast('error', 'Error', 'Gagal memperbarui profil.');
        }
      });
    }

    // Avatar upload form
    const avatarInput = document.getElementById('profile-avatar-file');
    if (avatarInput) {
      avatarInput.addEventListener('change', async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const formData = new FormData();
        formData.append('avatar', e.target.files[0]);

        try {
          const res = await fetch('/api/auth/avatar', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.success) {
            window.ninjaSound && window.ninjaSound.playSuccess();
            App.showToast('success', 'Foto Terganti', data.message);
            App.user = data.user;
            App.updateUserUI(data.user);
          } else {
            App.showToast('error', 'Gagal', data.message);
          }
        } catch (err) {
          App.showToast('error', 'Error', 'Gagal mengupload avatar.');
        }
      });
    }
  },

  // ------------------------------------------------------
  // PASSWORD CHANGE
  // ------------------------------------------------------
  bindPasswordControls() {
    const formPassword = document.getElementById('form-change-password');
    if (formPassword) {
      formPassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        const current_password = document.getElementById('pwd-current').value;
        const new_password = document.getElementById('pwd-new').value;
        const confirm_password = document.getElementById('pwd-confirm').value;

        if (new_password !== confirm_password) {
          return App.showToast('error', 'Gagal', 'Konfirmasi password baru tidak cocok.');
        }

        try {
          const res = await fetch('/api/auth/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password, new_password, confirm_password })
          });
          const data = await res.json();
          if (data.success) {
            window.ninjaSound && window.ninjaSound.playSuccess();
            App.showToast('success', 'Password Terupdate', data.message);
            formPassword.reset();
          } else {
            App.showToast('error', 'Gagal', data.message);
          }
        } catch (err) {
          App.showToast('error', 'Error', 'Gagal memperbarui password.');
        }
      });
    }
  }
};

window.SettingsView = SettingsView;
document.addEventListener('DOMContentLoaded', () => SettingsView.init());
