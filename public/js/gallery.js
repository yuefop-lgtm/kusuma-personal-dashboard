// ========================================================
// GALERI FOTO VIEW CONTROLLER
// ========================================================

const GalleryView = {
  photos: [],
  currentCategory: 'Semua',

  init() {
    const searchInput = document.getElementById('gallery-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterPhotos());
    }

    const btnAdd = document.getElementById('btn-add-photo');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => this.openAddModal());
    }

    const formPhoto = document.getElementById('form-upload-photo');
    if (formPhoto) {
      formPhoto.addEventListener('submit', (e) => {
        e.preventDefault();
        this.uploadPhoto();
      });
    }

    // Category pills
    document.querySelectorAll('.photo-category-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.photo-category-pill').forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentCategory = pill.getAttribute('data-category');
        this.filterPhotos();
      });
    });
  },

  async load() {
    try {
      const res = await apiFetch('/api/photos');
      const data = await res.json();
      if (data.success) {
        this.photos = data.photos || [];
        this.filterPhotos();
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal memuat galeri foto.');
    }
  },

  filterPhotos() {
    const q = (document.getElementById('gallery-search')?.value || '').toLowerCase().trim();
    let filtered = this.photos;

    if (this.currentCategory && this.currentCategory !== 'Semua') {
      filtered = filtered.filter((p) => p.category === this.currentCategory);
    }

    if (q) {
      filtered = filtered.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.original_name && p.original_name.toLowerCase().includes(q))
      );
    }

    this.renderPhotos(filtered);
  },

  renderPhotos(list) {
    const container = document.getElementById('gallery-grid');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <svg style="width: 44px; height: 44px; margin-bottom: 0.8rem; color: var(--accent-primary);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          <p style="font-size: 1rem; font-weight: 600; color: #fff;">Belum Ada Foto di Galeri</p>
          <p style="font-size: 0.85rem; margin-top: 0.3rem;">Upload foto favorit, kenangan shinobi, atau aktivitas olahraga kamu.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list
      .map((item) => {
        const fileUrl = apiUrl(`/api/files/photos/${item.filename}`);
        return `
        <div class="photo-card" onclick="GalleryView.openLightbox(${item.id})">
          <img src="${fileUrl}" alt="${item.title}" loading="lazy" />
          <div class="photo-card-overlay">
            <span class="photo-card-category">${item.category || 'Pribadi'}</span>
            <div class="photo-card-title">${item.title}</div>
            <div style="font-size: 0.72rem; color: #cbd5e1; margin-top: 0.2rem; opacity: 0.8;">Klik untuk memperbesar</div>
          </div>
        </div>
      `;
      })
      .join('');
  },

  openLightbox(id) {
    const item = this.photos.find((p) => p.id === id);
    if (!item) return;

    const fileUrl = apiUrl(`/api/files/photos/${item.filename}`);
    const downloadUrl = apiUrl(`/api/files/photos/${item.filename}?download=1&name=${encodeURIComponent(item.original_name)}`);

    document.getElementById('lightbox-img').src = fileUrl;
    document.getElementById('lightbox-title').textContent = item.title;
    document.getElementById('lightbox-category').textContent = item.category || 'Pribadi';
    document.getElementById('lightbox-desc').textContent = item.description || 'Tidak ada deskripsi.';
    document.getElementById('lightbox-download-btn').href = downloadUrl;

    const deleteBtn = document.getElementById('lightbox-delete-btn');
    deleteBtn.onclick = () => {
      this.deletePhoto(item.id);
      App.closeModal('modal-lightbox');
    };

    window.ninjaSound && window.ninjaSound.playSharingan();
    App.openModal('modal-lightbox');
  },

  openAddModal() {
    document.getElementById('photo-title').value = '';
    document.getElementById('photo-category').value = 'Pribadi';
    document.getElementById('photo-desc').value = '';
    document.getElementById('photo-file').value = '';
    App.openModal('modal-photo');
  },

  async uploadPhoto() {
    const title = document.getElementById('photo-title').value.trim();
    const category = document.getElementById('photo-category').value;
    const description = document.getElementById('photo-desc').value.trim();
    const fileInput = document.getElementById('photo-file');

    if (!fileInput.files || fileInput.files.length === 0) {
      return App.showToast('error', 'Validasi Gagal', 'Pilih file foto JPG, PNG, atau WEBP terlebih dahulu.');
    }
    if (!title) {
      return App.showToast('error', 'Validasi Gagal', 'Judul foto wajib diisi.');
    }

    const formData = new FormData();
    formData.append('photo', fileInput.files[0]);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('description', description);

    try {
      const btn = document.getElementById('btn-submit-photo');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Mengupload...';
      }

      const res = await apiFetch('/api/photos', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playSuccess();
        App.showToast('success', 'Berhasil', data.message);
        App.closeModal('modal-photo');
        this.load();
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal mengupload foto.');
    } finally {
      const btn = document.getElementById('btn-submit-photo');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Upload Foto';
      }
    }
  },

  async deletePhoto(id) {
    if (!confirm('Hapus foto ini dari galeri?')) return;
    try {
      const res = await apiFetch(`/api/photos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        window.ninjaSound && window.ninjaSound.playClick();
        App.showToast('info', 'Dihapus', data.message);
        this.load();
      } else {
        App.showToast('error', 'Gagal', data.message);
      }
    } catch (e) {
      App.showToast('error', 'Error', 'Gagal menghapus foto.');
    }
  }
};

window.GalleryView = GalleryView;
document.addEventListener('DOMContentLoaded', () => GalleryView.init());
