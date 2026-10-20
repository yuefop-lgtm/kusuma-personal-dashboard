// ========================================================
// DASHBOARD OVERVIEW VIEW CONTROLLER
// ========================================================

const DashboardView = {
  quotes: [
    { text: "Mimpiku bukan berada di masa depan. Mimpiku ada di masa lalu, dan di sanalah tujuanku.", source: "Sasuke Uchiha — Uchiha Clan Successor" },
    { text: "Aku telah lama menutup mataku... Tujuan sejatiku kini hanya dapat ditemukan dalam kegelapan.", source: "Sasuke Uchiha — Eternal Mangekyo" },
    { text: "Rasa sakit, kehilangan, dan tekad baja inilah yang membuat seorang shinobi melampaui batasnya.", source: "Sasuke Uchiha — Chidori Strike" },
    { text: "Kekuatan sejati bukan tentang mengalahkan musuh, melainkan kemampuan untuk melindungi apa yang berharga.", source: "Sasuke Uchiha — Final Valley" },
    { text: "Fokus pada tujuan, kuasai setiap ilmu pengetahuan, dan tempa tubuhmu tanpa henti.", source: "Agung Kusuma Shinobi Creed" }
  ],
  currentQuoteIdx: 0,

  init() {
    const btnQuote = document.getElementById('btn-cycle-quote');
    if (btnQuote) {
      btnQuote.addEventListener('click', () => this.cycleQuote());
    }

    // Quick action buttons
    const btnAddSub = document.getElementById('dash-quick-add-subject');
    if (btnAddSub) {
      btnAddSub.addEventListener('click', () => {
        App.navigate('subjects');
        window.SubjectsView && window.SubjectsView.openAddModal();
      });
    }

    const btnAddSport = document.getElementById('dash-quick-add-sport');
    if (btnAddSport) {
      btnAddSport.addEventListener('click', () => {
        App.navigate('sports');
        window.SportsView && window.SportsView.openAddModal();
      });
    }

    const btnAddDoc = document.getElementById('dash-quick-add-doc');
    if (btnAddDoc) {
      btnAddDoc.addEventListener('click', () => {
        App.navigate('documents');
        window.DocumentsView && window.DocumentsView.openAddModal();
      });
    }

    const btnAddPhoto = document.getElementById('dash-quick-add-photo');
    if (btnAddPhoto) {
      btnAddPhoto.addEventListener('click', () => {
        App.navigate('gallery');
        window.GalleryView && window.GalleryView.openAddModal();
      });
    }
  },

  cycleQuote() {
    this.currentQuoteIdx = (this.currentQuoteIdx + 1) % this.quotes.length;
    const q = this.quotes[this.currentQuoteIdx];
    const textEl = document.getElementById('sasuke-quote-text');
    const authorEl = document.getElementById('sasuke-quote-author');
    if (textEl) textEl.textContent = `"${q.text}"`;
    if (authorEl) authorEl.textContent = q.source;
    window.ninjaSound && window.ninjaSound.playClick();
  },

  async load() {
    try {
      const res = await fetch('/api/dashboard/overview');
      const data = await res.json();
      if (!data.success) return;

      const { stats, upcomingSports, recentSubjects, recentDocuments, recentPhotos } = data;

      // Update stat counters
      document.getElementById('stat-total-subjects').textContent = stats.totalSubjects || 0;
      document.getElementById('stat-total-materials').textContent = stats.totalMaterials || 0;
      document.getElementById('stat-total-sports').textContent = stats.scheduledSports || 0;
      document.getElementById('stat-total-docs').textContent = stats.totalDocuments || 0;
      document.getElementById('stat-total-photos').textContent = stats.totalPhotos || 0;

      // Render upcoming sports list in dashboard
      const sportsListEl = document.getElementById('dash-upcoming-sports');
      if (sportsListEl) {
        if (!upcomingSports || upcomingSports.length === 0) {
          sportsListEl.innerHTML = `
            <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.88rem;">
              Belum ada jadwal olahraga aktif. Klik tombol di atas untuk menambah jadwal!
            </div>
          `;
        } else {
          sportsListEl.innerHTML = upcomingSports
            .map(
              (item) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.9rem; margin-bottom: 0.6rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle);">
                <div>
                  <div style="font-weight: 700; color: #fff; font-size: 0.92rem;">${item.sport_name}</div>
                  <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.2rem;">
                    📅 ${item.day}, ${item.date} • ⏰ ${item.time_start} ${item.time_end ? '- ' + item.time_end : ''} • 📍 ${item.location || 'Konoha Ground'}
                  </div>
                </div>
                <span class="badge-status ${item.status.toLowerCase()}">${item.status}</span>
              </div>
            `
            )
            .join('');
        }
      }

      // Render recent subjects
      const subjectsListEl = document.getElementById('dash-recent-subjects');
      if (subjectsListEl) {
        if (!recentSubjects || recentSubjects.length === 0) {
          subjectsListEl.innerHTML = `
            <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.88rem;">
              Belum ada mata pelajaran. Silakan tambahkan mata pelajaran baru.
            </div>
          `;
        } else {
          subjectsListEl.innerHTML = recentSubjects
            .map(
              (sub) => `
              <div style="padding: 1rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
                    <span style="font-size: 0.7rem; font-weight: 700; color: var(--accent-secondary); background: rgba(var(--accent-primary-rgb), 0.2); padding: 0.2rem 0.5rem; border-radius: 999px;">${sub.code || 'PELAJARAN'}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${sub.materials_count || 0} Materi</span>
                  </div>
                  <h4 style="font-size: 0.96rem; font-weight: 700; color: #fff;">${sub.name}</h4>
                  <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.2rem;">👨‍🏫 ${sub.teacher || '-'}</p>
                </div>
                <div style="margin-top: 0.8rem; font-size: 0.75rem; color: var(--accent-primary); font-weight: 600;">
                  ⏰ ${sub.day_schedule || '-'} (${sub.time_schedule || '-'})
                </div>
              </div>
            `
            )
            .join('');
        }
      }
    } catch (e) {
      console.error('Error loading dashboard overview:', e);
    }
  }
};

window.DashboardView = DashboardView;
document.addEventListener('DOMContentLoaded', () => DashboardView.init());
