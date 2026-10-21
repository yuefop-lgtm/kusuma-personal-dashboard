// ========================================================
// JADWAL OLAHRAGA (SPORTS) VIEW CONTROLLER
// ========================================================

const SportsView = {
  schedules: [],
  currentViewMode: 'list', // 'list' or 'calendar'
  calendarDate: new Date(),
  currentFilterStatus: 'Semua',

  init() {
    const searchInput = document.getElementById('sports-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterSchedules());
    }

    const btnAdd = document.getElementById('btn-add-sport');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.openAddModal());
    }

    const formSport = document.getElementById('form-sport');
    if (formSport) {
      formSport.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSport();
      });
    }

    // Date change auto-calculates day name
    const dateInput = document.getElementById('sport-date');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        if (e.target.value) {
          const d = new Date(e.target.value);
          const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          document.getElementById('sport-day').value = days[d.getDay()];
        }
      });
    }

    // Toggle views (list vs calendar)
    const btnList = document.getElementById('btn-toggle-sport-list');
    const btnCal = document.getElementById('btn-toggle-sport-cal');
    if (btnList && btnCal) {
      btnList.addEventListener('click', () => {
        this.currentViewMode = 'list';
        btnList.classList.add('active');
        btnCal.classList.remove('active');
        document.getElementById('sports-list-container').style.display = 'block';
        document.getElementById('sports-calendar-container').style.display = 'none';
        this.renderList();
      });
      btnCal.addEventListener('click', () => {
        this.currentViewMode = 'calendar';
        btnCal.classList.add('active');
        btnList.classList.remove('active');
        document.getElementById('sports-list-container').style.display = 'none';
        document.getElementById('sports-calendar-container').style.display = 'block';
        this.renderCalendar();
      });
    }

    // Status filter pills
    document.querySelectorAll('.sports-filter-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.sports-filter-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentFilterStatus = pill.getAttribute('data-status');
        this.filterSchedules();
      });
    });

    // Calendar Prev/Next
    const btnPrevMonth = document.getElementById('btn-cal-prev-month');
    const btnNextMonth = document.getElementById('btn-cal-next-month');
    if (btnPrevMonth && btnNextMonth) {
      btnPrevMonth.addEventListener('click', () => {
        this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
        this.renderCalendar();
      });
      btnNextMonth.addEventListener('click', () => {
        this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
        this.renderCalendar();
      });
    }
  },

  async load() {
    try {
      const res = await apiFetch('/api/sports');
      const data = await res.json();
      if (data.success) {
        this.schedules = data.sports || [];
        this.filterSchedules();
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal memuat jadwal olahraga.');
    }
  },

  filterSchedules() {
    const q = (document.getElementById('sports-search')?.value || '').toLowerCase().trim();
    let filtered = this.schedules;

    if (this.currentFilterStatus && this.currentFilterStatus !== 'Semua') {
      filtered = filtered.filter((s) => s.status === this.currentFilterStatus);
    }

    if (q) {
      filtered = filtered.filter(
        (s) =>
          (s.sport_name && s.sport_name.toLowerCase().includes(q)) ||
          (s.location && s.location.toLowerCase().includes(q)) ||
          (s.notes && s.notes.toLowerCase().includes(q))
      );
    }

    if (this.currentViewMode === 'list') {
      this.renderList(filtered);
    } else {
      this.renderCalendar();
    }
  },

  renderList(list = this.schedules) {
    const container = document.getElementById('sports-list-body');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <svg style="width: 44px; height: 44px; margin-bottom: 0.8rem; color: var(--accent-primary);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <p style="font-size: 1rem; font-weight: 600; color: #fff;">Tidak Ada Jadwal Olahraga</p>
          <p style="font-size: 0.85rem; margin-top: 0.3rem;">Gunakan tombol Tambah Jadwal di atas untuk membuat jadwal aktivitas baru.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list
      .map((item) => {
        let attachmentMarkup = '';
        if (item.attachment_filename) {
          const fileUrl = apiUrl(`/api/files/sports/${item.attachment_filename}`);
          const downloadUrl = apiUrl(`/api/files/sports/${item.attachment_filename}?download=1&name=${encodeURIComponent(item.attachment_original_name || 'lampiran')}`);
          attachmentMarkup = `
            <div style="margin-top: 0.8rem; padding: 0.6rem 0.85rem; background: rgba(0,0,0,0.3); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; border: 1px solid var(--border-subtle);">
              <span style="font-size: 0.76rem; color: var(--accent-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                📎 ${item.attachment_original_name || 'Lampiran Pendukung'}
              </span>
              <div style="display: flex; gap: 0.4rem; flex-shrink: 0;">
                <button class="btn btn-secondary btn-sm" onclick="SubjectsView.previewMaterial('${fileUrl}', '${item.attachment_original_name || 'lampiran'}', '${item.attachment_mime || ''}')" type="button">Lihat</button>
                <a href="${downloadUrl}" class="btn btn-secondary btn-sm" download>Unduh</a>
              </div>
            </div>
          `;
        }

        return `
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 1.4rem; margin-bottom: 1.2rem; box-shadow: var(--shadow-card); transition: all 0.25s ease;" onmouseover="this.style.borderColor='var(--border-highlight)'" onmouseout="this.style.borderColor='var(--border-subtle)'">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.3rem;">
                <h3 style="font-size: 1.15rem; font-weight: 800; color: #fff;">${item.sport_name}</h3>
                <span class="badge-status ${item.status.toLowerCase()}">${item.status}</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 1rem; font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.4rem;">
                <span>📅 <strong>${item.day}, ${item.date}</strong></span>
                <span>⏰ <strong>${item.time_start} ${item.time_end ? '- ' + item.time_end : ''}</strong></span>
                <span>📍 <strong>${item.location || 'Lokasi Belum Ditentukan'}</strong></span>
              </div>
            </div>

            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm btn-icon-only" onclick="SportsView.openEditModal(${item.id})" title="Edit Jadwal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-danger btn-sm btn-icon-only" onclick="SportsView.deleteSport(${item.id})" title="Hapus Jadwal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>

          ${item.notes ? `<p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.8rem; line-height: 1.5; border-left: 2px solid var(--accent-primary); padding-left: 0.75rem;">${item.notes}</p>` : ''}
          ${attachmentMarkup}
        </div>
      `;
      })
      .join('');
  },

  renderCalendar() {
    const titleEl = document.getElementById('cal-month-title');
    const gridEl = document.getElementById('cal-days-grid');
    if (!titleEl || !gridEl) return;

    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    titleEl.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    let html = '';
    // Empty cells before start of month
    for (let i = 0; i < firstDayIndex; i++) {
      html += `<div class="calendar-cell" style="opacity: 0.2; pointer-events: none;"></div>`;
    }

    // Days of month
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const dayEvents = this.schedules.filter((s) => s.date === dateStr);

      const eventsHtml = dayEvents
        .map(
          (ev) => `
        <div class="calendar-event-tag" onclick="SportsView.openEditModal(${ev.id})" title="${ev.sport_name} (${ev.time_start})">
          ⚡ ${ev.time_start} ${ev.sport_name}
        </div>
      `
        )
        .join('');

      html += `
        <div class="calendar-cell ${isToday ? 'today' : ''}">
          <div class="calendar-cell-date">${day}</div>
          <div style="display: flex; flex-direction: column; gap: 0.15rem; overflow: hidden;">
            ${eventsHtml}
          </div>
        </div>
      `;
    }

    gridEl.innerHTML = html;
  },

  openAddModal() {
    document.getElementById('modal-sport-title').textContent = 'Tambah Jadwal Olahraga';
    document.getElementById('sport-id').value = '';
    document.getElementById('sport-name').value = '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('sport-date').value = today;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    document.getElementById('sport-day').value = days[new Date().getDay()];
    document.getElementById('sport-time-start').value = '07:00';
    document.getElementById('sport-time-end').value = '08:30';
    document.getElementById('sport-location').value = '';
    document.getElementById('sport-notes').value = '';
    document.getElementById('sport-status').value = 'Terjadwal';
    document.getElementById('sport-attachment').value = '';
    document.getElementById('sport-existing-attachment').style.display = 'none';

    App.openModal('modal-sport');
  },

  openEditModal(id) {
    const item = this.schedules.find((s) => s.id === id);
    if (!item) return;

    document.getElementById('modal-sport-title').textContent = 'Edit Jadwal Olahraga';
    document.getElementById('sport-id').value = item.id;
    document.getElementById('sport-name').value = item.sport_name || '';
    document.getElementById('sport-date').value = item.date || '';
    document.getElementById('sport-day').value = item.day || '';
    document.getElementById('sport-time-start').value = item.time_start || '';
    document.getElementById('sport-time-end').value = item.time_end || '';
    document.getElementById('sport-location').value = item.location || '';
    document.getElementById('sport-notes').value = item.notes || '';
    document.getElementById('sport-status').value = item.status || 'Terjadwal';
    document.getElementById('sport-attachment').value = '';

    const attachBox = document.getElementById('sport-existing-attachment');
    if (item.attachment_filename) {
      attachBox.style.display = 'block';
      document.getElementById('sport-current-attach-name').textContent = item.attachment_original_name || 'Lampiran';
    } else {
      attachBox.style.display = 'none';
    }

    App.openModal('modal-sport');
  },

  async saveSport() {
    const id = document.getElementById('sport-id').value;
    const sport_name = document.getElementById('sport-name').value;
    const date = document.getElementById('sport-date').value;
    const day = document.getElementById('sport-day').value;
    const time_start = document.getElementById('sport-time-start').value;
    const time_end = document.getElementById('sport-time-end').value;
    const location = document.getElementById('sport-location').value;
    const notes = document.getElementById('sport-notes').value;
    const status = document.getElementById('sport-status').value;
    const fileInput = document.getElementById('sport-attachment');

    if (!sport_name || !date || !time_start) {
      return App.showToast('error', 'Validasi Gagal', 'Nama olahraga, tanggal, dan jam mulai wajib diisi.');
    }

    const formData = new FormData();
    formData.append('sport_name', sport_name);
    formData.append('date', date);
    formData.append('day', day);
    formData.append('time_start', time_start);
    formData.append('time_end', time_end);
    formData.append('location', location);
    formData.append('notes', notes);
    formData.append('status', status);

    if (fileInput.files && fileInput.files.length > 0) {
      formData.append('attachment', fileInput.files[0]);
    }

    try {
      const url = id ? `/api/sports/${id}` : '/api/sports';
      const method = id ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playSuccess();
        App.showToast('success', 'Berhasil', data.message);
        App.closeModal('modal-sport');
        this.load();
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal menyimpan jadwal olahraga.');
    }
  },

  async deleteSport(id) {
    if (!confirm('Hapus jadwal olahraga ini?')) return;
    try {
      const res = await apiFetch(`/api/sports/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playClick();
        App.showToast('info', 'Dihapus', data.message);
        this.load();
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal menghapus jadwal.');
    }
  }
};

window.SportsView = SportsView;
document.addEventListener('DOMContentLoaded', () => SportsView.init());
