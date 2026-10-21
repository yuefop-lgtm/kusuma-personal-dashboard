// ========================================================
// MATA PELAJARAN (SUBJECTS) & MATERI VIEW CONTROLLER
// ========================================================

const SubjectsView = {
  subjects: [],
  currentSubject: null,

  init() {
    const searchInput = document.getElementById('subjects-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterSubjects(e.target.value);
      });
    }

    const btnAdd = document.getElementById('btn-add-subject');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.openAddModal());
    }

    const formSubject = document.getElementById('form-subject');
    if (formSubject) {
      formSubject.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSubject();
      });
    }

    const formMaterial = document.getElementById('form-upload-material');
    if (formMaterial) {
      formMaterial.addEventListener('submit', (e) => {
        e.preventDefault();
        this.uploadMaterial();
      });
    }
  },

  async load() {
    try {
      const res = await apiFetch('/api/subjects');
      const data = await res.json();
      if (data.success) {
        this.subjects = data.subjects || [];
        this.renderSubjects(this.subjects);
      }
    } catch (err) {
      App.showToast('error', 'Error', 'Gagal memuat mata pelajaran.');
    }
  },

  filterSubjects(query) {
    if (!query || !query.trim()) {
      return this.renderSubjects(this.subjects);
    }
    const q = query.toLowerCase().trim();
    const filtered = this.subjects.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.teacher && s.teacher.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
    this.renderSubjects(filtered);
  },

  renderSubjects(list) {
    const container = document.getElementById('subjects-grid');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <svg style="width: 48px; height: 48px; margin-bottom: 0.8rem; color: var(--accent-primary);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            <path d="M6 6h10M6 10h10M6 14h6"/>
          </svg>
          <p style="font-size: 1rem; font-weight: 600; color: #fff;">Tidak Ada Mata Pelajaran</p>
          <p style="font-size: 0.85rem; margin-top: 0.3rem;">Mulai dengan menambahkan mata pelajaran baru menggunakan tombol Tambah di atas.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list
      .map(
        (sub) => `
        <div class="subject-card">
          <div class="subject-header">
            <span class="subject-code-badge">${sub.code || 'IF-CODE'}</span>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-secondary btn-sm btn-icon-only" onclick="SubjectsView.openEditModal(${sub.id})" title="Edit Pelajaran">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-danger btn-sm btn-icon-only" onclick="SubjectsView.deleteSubject(${sub.id})" title="Hapus Pelajaran">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          
          <h3 class="subject-name">${sub.name}</h3>
          <p style="font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.6rem;">${sub.description || 'Tidak ada deskripsi.'}</p>

          <div class="subject-meta-list">
            <div class="subject-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>Dosen: <strong>${sub.teacher || '-'}</strong></span>
            </div>
            <div class="subject-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>Jadwal: <strong>${sub.day_schedule || '-'} (${sub.time_schedule || '-'})</strong></span>
            </div>
            <div class="subject-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Ruangan/Link: <strong>${sub.room_link || '-'}</strong></span>
            </div>
          </div>

          <div class="subject-footer">
            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;">
              📂 ${sub.materials_count || 0} File Materi
            </span>
            <button class="btn btn-primary btn-sm" onclick="SubjectsView.openMaterialsModal(${sub.id})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Kelola Materi
            </button>
          </div>
        </div>
      `
      )
      .join('');
  },

  openAddModal() {
    document.getElementById('modal-subject-title').textContent = 'Tambah Mata Pelajaran';
    document.getElementById('subject-id').value = '';
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-code').value = '';
    document.getElementById('subject-teacher').value = '';
    document.getElementById('subject-day').value = 'Senin';
    document.getElementById('subject-time').value = '';
    document.getElementById('subject-room').value = '';
    document.getElementById('subject-desc').value = '';
    App.openModal('modal-subject');
  },

  openEditModal(id) {
    const sub = this.subjects.find((s) => s.id === id);
    if (!sub) return;

    document.getElementById('modal-subject-title').textContent = 'Edit Mata Pelajaran';
    document.getElementById('subject-id').value = sub.id;
    document.getElementById('subject-name').value = sub.name || '';
    document.getElementById('subject-code').value = sub.code || '';
    document.getElementById('subject-teacher').value = sub.teacher || '';
    document.getElementById('subject-day').value = sub.day_schedule || 'Senin';
    document.getElementById('subject-time').value = sub.time_schedule || '';
    document.getElementById('subject-room').value = sub.room_link || '';
    document.getElementById('subject-desc').value = sub.description || '';
    App.openModal('modal-subject');
  },

  async saveSubject() {
    const id = document.getElementById('subject-id').value;
    const payload = {
      name: document.getElementById('subject-name').value,
      code: document.getElementById('subject-code').value,
      teacher: document.getElementById('subject-teacher').value,
      day_schedule: document.getElementById('subject-day').value,
      time_schedule: document.getElementById('subject-time').value,
      room_link: document.getElementById('subject-room').value,
      description: document.getElementById('subject-desc').value
    };

    if (!payload.name) {
      return App.showToast('error', 'Validasi Gagal', 'Nama mata pelajaran wajib diisi.');
    }

    try {
      const url = id ? `/api/subjects/${id}` : '/api/subjects';
      const method = id ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playSuccess();
        App.showToast('success', 'Berhasil', data.message);
        App.closeModal('modal-subject');
        this.load();
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (err) {
      App.showToast('error', 'Error', 'Gagal menyimpan mata pelajaran.');
    }
  },

  async deleteSubject(id) {
    if (!confirm('Hapus mata pelajaran ini beserta semua file materinya? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      const res = await apiFetch(`/api/subjects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playClick();
        App.showToast('info', 'Dihapus', data.message);
        this.load();
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal menghapus mata pelajaran.');
    }
  },

  // ------------------------------------------------------
  // MATERIALS MODAL & UPLOAD
  // ------------------------------------------------------
  async openMaterialsModal(subjectId) {
    try {
      const res = await apiFetch(`/api/subjects/${subjectId}`);
      const data = await res.json();
      if (!data.success) return App.showToast('error', 'Gagal', data.message);

      this.currentSubject = data.subject;
      document.getElementById('materials-subject-name').textContent = data.subject.name;
      document.getElementById('materials-subject-id').value = data.subject.id;

      this.renderMaterialsList(data.materials || []);
      App.openModal('modal-materials');
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal memuat materi pelajaran.');
    }
  },

  renderMaterialsList(materials) {
    const listEl = document.getElementById('materials-list-container');
    if (!listEl) return;

    if (!materials || materials.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted); font-size: 0.86rem;">
          Belum ada file materi untuk mata pelajaran ini. Upload file di bawah!
        </div>
      `;
      return;
    }

    listEl.innerHTML = materials
      .map((mat) => {
        const ext = mat.original_name ? mat.original_name.split('.').pop().toUpperCase() : 'FILE';
        const sizeMb = mat.file_size ? (mat.file_size / (1024 * 1024)).toFixed(2) + ' MB' : '-';
        const fileUrl = apiUrl(`/api/files/materials/${mat.filename}`);
        const downloadUrl = apiUrl(`/api/files/materials/${mat.filename}?download=1&name=${encodeURIComponent(mat.original_name)}`);

        return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 1rem; margin-bottom: 0.6rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.85rem; overflow: hidden;">
            <div style="width: 38px; height: 38px; border-radius: var(--radius-sm); background: rgba(var(--accent-primary-rgb), 0.2); color: var(--accent-secondary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.72rem; flex-shrink: 0; border: 1px solid var(--border-subtle);">
              ${ext}
            </div>
            <div style="overflow: hidden;">
              <div style="font-weight: 700; color: #fff; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${mat.title}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 0.6rem; align-items: center;">
                <span style="color: var(--accent-primary); font-weight: 600;">${mat.category || 'Materi'}</span>
                <span>•</span>
                <span>${mat.original_name}</span>
                <span>•</span>
                <span>${sizeMb}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0;">
            <button class="btn btn-secondary btn-sm" onclick="SubjectsView.previewMaterial('${fileUrl}', '${mat.original_name}', '${mat.mime_type}')" title="Preview File">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 15px; height: 15px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Lihat
            </button>
            <a href="${downloadUrl}" class="btn btn-secondary btn-sm" download title="Unduh File">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 15px; height: 15px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Unduh
            </a>
            <button class="btn btn-danger btn-sm btn-icon-only" onclick="SubjectsView.deleteMaterial(${mat.id})" title="Hapus File">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
      })
      .join('');
  },

  async uploadMaterial() {
    const subjectId = document.getElementById('materials-subject-id').value;
    const fileInput = document.getElementById('material-file');
    const titleInput = document.getElementById('material-title');
    const catInput = document.getElementById('material-category');
    const descInput = document.getElementById('material-desc');

    if (!fileInput.files || fileInput.files.length === 0) {
      return App.showToast('error', 'Validasi', 'Silakan pilih file materi terlebih dahulu.');
    }
    if (!titleInput.value.trim()) {
      return App.showToast('error', 'Validasi', 'Judul materi wajib diisi.');
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', titleInput.value.trim());
    formData.append('category', catInput.value);
    formData.append('description', descInput.value.trim());

    try {
      const btn = document.getElementById('btn-submit-material');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Mengunggah...';
      }

      const res = await apiFetch(`/api/subjects/${subjectId}/materials`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playSuccess();
        App.showToast('success', 'Berhasil', data.message);
        fileInput.value = '';
        titleInput.value = '';
        descInput.value = '';
        this.openMaterialsModal(subjectId);
        this.load(); // Refresh counts
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal mengupload materi.');
    } finally {
      const btn = document.getElementById('btn-submit-material');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Upload Materi';
      }
    }
  },

  async deleteMaterial(id) {
    if (!confirm('Hapus file materi ini?')) return;
    try {
      const res = await apiFetch(`/api/materials/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playClick();
        App.showToast('info', 'Dihapus', data.message);
        if (this.currentSubject) {
          this.openMaterialsModal(this.currentSubject.id);
        }
        this.load();
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal menghapus materi.');
    }
  },

  previewMaterial(url, filename, mime) {
    const previewModal = document.getElementById('modal-file-preview');
    const container = document.getElementById('preview-content-box');
    const title = document.getElementById('preview-file-title');
    const btnDownload = document.getElementById('preview-download-btn');

    if (!previewModal || !container) return;

    title.textContent = filename;
    btnDownload.href = `${url}?download=1&name=${encodeURIComponent(filename)}`;

    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) {
      container.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 70vh; border-radius: var(--radius-md); object-fit: contain; margin: 0 auto; display: block;" />`;
    } else if (ext === 'pdf') {
      container.innerHTML = `<iframe src="${url}" style="width: 100%; height: 70vh; border: none; border-radius: var(--radius-md);"></iframe>`;
    } else if (['txt', 'json', 'md', 'csv', 'js', 'html', 'css'].includes(ext)) {
      apiFetch(url)
        .then((r) => r.text())
        .then((txt) => {
          container.innerHTML = `<pre style="background: rgba(0,0,0,0.5); padding: 1rem; border-radius: var(--radius-md); max-height: 70vh; overflow: auto; color: #a5f3fc; font-family: monospace; font-size: 0.85rem;">${escapeHtml(txt)}</pre>`;
        });
    } else {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem;">
          <p style="color: #fff; font-size: 1.1rem; font-weight: 700; margin-bottom: 0.5rem;">File Office / Binary</p>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1.5rem;">Format <strong>.${ext.toUpperCase()}</strong> paling baik dibuka langsung di komputer kamu.</p>
          <a href="${url}?download=1&name=${encodeURIComponent(filename)}" class="btn btn-primary" download>
            Unduh & Buka File Sekarang
          </a>
        </div>
      `;
    }

    App.openModal('modal-file-preview');
  }
};

function escapeHtml(string) {
  const entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(string).replace(/[&<>"']/g, (s) => entityMap[s]);
}

window.SubjectsView = SubjectsView;
document.addEventListener('DOMContentLoaded', () => SubjectsView.init());
