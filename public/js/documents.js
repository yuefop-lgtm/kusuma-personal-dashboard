// ========================================================
// DOKUMEN PRIBADI VIEW CONTROLLER
// ========================================================

const DocumentsView = {
  documents: [],
  currentCategory: 'Semua',

  init() {
    const searchInput = document.getElementById('documents-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterDocuments());
    }

    const btnAdd = document.getElementById('btn-add-doc');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.openAddModal());
    }

    const formDoc = document.getElementById('form-upload-doc');
    if (formDoc) {
      formDoc.addEventListener('submit', (e) => {
        e.preventDefault();
        this.uploadDocument();
      });
    }

    // Category filter pills
    document.querySelectorAll('.doc-category-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.doc-category-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentCategory = pill.getAttribute('data-category');
        this.filterDocuments();
      });
    });
  },

  async load() {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.success) {
        this.documents = data.documents || [];
        this.filterDocuments();
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal memuat dokumen.');
    }
  },

  filterDocuments() {
    const q = (document.getElementById('documents-search')?.value || '').toLowerCase().trim();
    let filtered = this.documents;

    if (this.currentCategory && this.currentCategory !== 'Semua') {
      filtered = filtered.filter((d) => d.category === this.currentCategory);
    }

    if (q) {
      filtered = filtered.filter(
        (d) =>
          (d.title && d.title.toLowerCase().includes(q)) ||
          (d.description && d.description.toLowerCase().includes(q)) ||
          (d.original_name && d.original_name.toLowerCase().includes(q))
      );
    }

    this.renderDocuments(filtered);
  },

  renderDocuments(list) {
    const container = document.getElementById('documents-grid');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <svg style="width: 44px; height: 44px; margin-bottom: 0.8rem; color: var(--accent-primary);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          <p style="font-size: 1rem; font-weight: 600; color: #fff;">Tidak Ada Dokumen Tersimpan</p>
          <p style="font-size: 0.85rem; margin-top: 0.3rem;">Upload file PDF, sertifikat, atau dokumen pendukung dengan tombol di atas.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list
      .map((doc) => {
        const ext = doc.original_name ? doc.original_name.split('.').pop().toUpperCase() : 'DOC';
        const sizeMb = doc.file_size ? (doc.file_size / (1024 * 1024)).toFixed(2) + ' MB' : '-';
        const fileUrl = `/api/files/documents/${doc.filename}`;
        const downloadUrl = `/api/files/documents/${doc.filename}?download=1&name=${encodeURIComponent(doc.original_name)}`;

        return `
        <div class="doc-item-card">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.8rem; margin-bottom: 1rem;">
            <div class="doc-file-type-icon">${ext}</div>
            <span style="font-size: 0.72rem; font-weight: 700; color: var(--accent-primary); background: rgba(var(--accent-primary-rgb), 0.15); padding: 0.2rem 0.6rem; border-radius: 999px;">
              ${doc.category || 'Umum'}
            </span>
          </div>

          <h3 style="font-size: 1.05rem; font-weight: 800; color: #fff; margin-bottom: 0.35rem; line-height: 1.4;">${doc.title}</h3>
          <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 0.8rem; flex: 1;">${doc.description || 'Tidak ada catatan dokumen.'}</p>

          <div style="font-size: 0.74rem; color: var(--text-muted); margin-bottom: 1rem; display: flex; align-items: center; justify-content: space-between;">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 170px;">📄 ${doc.original_name}</span>
            <span>${sizeMb}</span>
          </div>

          <div style="display: flex; gap: 0.4rem; border-top: 1px solid var(--border-subtle); padding-top: 0.8rem;">
            <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="SubjectsView.previewMaterial('${fileUrl}', '${doc.original_name}', '${doc.mime_type}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Lihat
            </button>
            <a href="${downloadUrl}" class="btn btn-secondary btn-sm" download title="Unduh">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </a>
            <button class="btn btn-danger btn-sm btn-icon-only" onclick="DocumentsView.deleteDocument(${doc.id})" title="Hapus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
      })
      .join('');
  },

  openAddModal() {
    document.getElementById('doc-title').value = '';
    document.getElementById('doc-category').value = 'Akademik';
    document.getElementById('doc-desc').value = '';
    document.getElementById('doc-file').value = '';
    App.openModal('modal-document');
  },

  async uploadDocument() {
    const title = document.getElementById('doc-title').value.trim();
    const category = document.getElementById('doc-category').value;
    const description = document.getElementById('doc-desc').value.trim();
    const fileInput = document.getElementById('doc-file');

    if (!fileInput.files || fileInput.files.length === 0) {
      return App.showToast('error', 'Validasi Gagal', 'Silakan pilih file dokumen terlebih dahulu.');
    }
    if (!title) {
      return App.showToast('error', 'Validasi Gagal', 'Judul dokumen wajib diisi.');
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('description', description);

    try {
      const btn = document.getElementById('btn-submit-doc');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Mengupload...';
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playSuccess();
        App.showToast('success', 'Berhasil', data.message);
        App.closeModal('modal-document');
        this.load();
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal mengupload dokumen.');
    } finally {
      const btn = document.getElementById('btn-submit-doc');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Upload Dokumen';
      }
    }
  },

  async deleteDocument(id) {
    if (!confirm('Hapus dokumen ini secara permanen?')) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playClick();
        App.showToast('info', 'Dihapus', data.message);
        this.load();
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal menghapus dokumen.');
    }
  }
};

window.DocumentsView = DocumentsView;
document.addEventListener('DOMContentLoaded', () => DocumentsView.init());
