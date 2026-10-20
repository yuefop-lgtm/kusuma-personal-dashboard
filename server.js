const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { db, run, get, all, initDatabase } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directories exist
const uploadDirs = ['materials', 'sports', 'documents', 'photos', 'avatars'];
uploadDirs.forEach((dir) => {
  const dirPath = path.join(__dirname, 'uploads', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'sasuke_uchiha_chidori_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true if running behind HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
  })
);

// Authentication Guard Middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Akses ditolak. Silakan login terlebih dahulu.' });
}

// Multer Storage Configuration
function createStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'uploads', subfolder));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
      cb(null, safeName);
    }
  });
}

// Multer Filters
const documentFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung! Format yang diizinkan: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, PNG, WEBP.'));
  }
};

const photoFilter = (req, file, cb) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format foto tidak didukung! Hanya JPG, JPEG, PNG, dan WEBP yang diizinkan.'));
  }
};

const uploadMaterials = multer({
  storage: createStorage('materials'),
  fileFilter: documentFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const uploadSports = multer({
  storage: createStorage('sports'),
  fileFilter: documentFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

const uploadDocuments = multer({
  storage: createStorage('documents'),
  fileFilter: documentFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const uploadPhotos = multer({
  storage: createStorage('photos'),
  fileFilter: photoFilter,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

const uploadAvatars = multer({
  storage: createStorage('avatars'),
  fileFilter: photoFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Helper to safely delete file
function deleteFileIfExists(subfolder, filename) {
  if (!filename) return;
  const filePath = path.join(__dirname, 'uploads', subfolder, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Error deleting file:', e);
    }
  }
}

// -------------------------------------------------------------
// AUTHENTICATION ROUTES
// -------------------------------------------------------------

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username dan password wajib diisi.' });
    }

    const user = await get('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Username atau password tidak cocok.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Username atau password tidak cocok.' });
    }

    // Set session
    req.session.userId = user.id;

    // Get settings
    const settings = await get('SELECT * FROM settings WHERE user_id = ?', [user.id]);

    const { password_hash, ...safeUser } = user;
    return res.json({
      success: true,
      message: 'Login berhasil. Selamat datang kembali di Dashboard Sasuke Uchiha!',
      user: safeUser,
      settings
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server saat login.' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Gagal melakukan logout.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logout berhasil.' });
  });
});

// GET /api/auth/me
app.get('/api/auth/me', async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, message: 'Belum login.' });
  }
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan.' });
    }
    const settings = await get('SELECT * FROM settings WHERE user_id = ?', [user.id]);
    const { password_hash, ...safeUser } = user;
    return res.json({ success: true, user: safeUser, settings });
  } catch (err) {
    console.error('Auth me error:', err);
    return res.status(500).json({ success: false, message: 'Kesalahan server.' });
  }
});

// PUT /api/auth/profile
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { full_name, bio, ninja_rank } = req.body;
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ success: false, message: 'Nama lengkap tidak boleh kosong.' });
    }

    await run(
      `UPDATE users 
       SET full_name = ?, bio = ?, ninja_rank = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [full_name.trim(), bio ? bio.trim() : '', ninja_rank ? ninja_rank.trim() : 'Genin', req.session.userId]
    );

    const updatedUser = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    const { password_hash, ...safeUser } = updatedUser;
    return res.json({ success: true, message: 'Profil berhasil diperbarui.', user: safeUser });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui profil.' });
  }
});

// POST /api/auth/avatar
app.post('/api/auth/avatar', requireAuth, uploadAvatars.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Pilih file foto avatar terlebih dahulu.' });
    }

    const currentUser = await get('SELECT avatar FROM users WHERE id = ?', [req.session.userId]);
    if (currentUser && currentUser.avatar) {
      deleteFileIfExists('avatars', currentUser.avatar);
    }

    await run('UPDATE users SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      req.file.filename,
      req.session.userId
    ]);

    const updatedUser = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    const { password_hash, ...safeUser } = updatedUser;
    return res.json({ success: true, message: 'Foto profil berhasil diupload.', user: safeUser });
  } catch (err) {
    console.error('Avatar upload error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal mengupload avatar.' });
  }
});

// PUT /api/auth/password
app.put('/api/auth/password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'Semua kolom password wajib diisi.' });
    }

    if (new_password.length < 5) {
      return res.status(400).json({ success: false, message: 'Password baru minimal 5 karakter.' });
    }

    if (confirm_password && new_password !== confirm_password) {
      return res.status(400).json({ success: false, message: 'Konfirmasi password tidak cocok dengan password baru.' });
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    const isMatch = bcrypt.compareSync(current_password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password saat ini (lama) tidak benar!' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    await run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      newHash,
      req.session.userId
    ]);

    return res.json({ success: true, message: 'Password berhasil diganti! Gunakan password baru saat login berikutnya.' });
  } catch (err) {
    console.error('Password change error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengganti password.' });
  }
});

// -------------------------------------------------------------
// SETTINGS ROUTES
// -------------------------------------------------------------

// GET /api/settings
app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    let settings = await get('SELECT * FROM settings WHERE user_id = ?', [req.session.userId]);
    if (!settings) {
      await run('INSERT INTO settings (user_id) VALUES (?)', [req.session.userId]);
      settings = await get('SELECT * FROM settings WHERE user_id = ?', [req.session.userId]);
    }
    return res.json({ success: true, settings });
  } catch (err) {
    console.error('Settings fetch error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mengambil pengaturan.' });
  }
});

// PUT /api/settings
app.put('/api/settings', requireAuth, async (req, res) => {
  try {
    const {
      theme = 'dark',
      accent_color = 'purple',
      custom_accent = '#9d4edd',
      animation_intensity = 'high',
      effect_lightning = 1,
      effect_sharingan = 1,
      enable_intro = 1,
      enable_sound = 1,
      sidebar_size = 'default'
    } = req.body;

    await run(
      `UPDATE settings 
       SET theme = ?, accent_color = ?, custom_accent = ?, animation_intensity = ?,
           effect_lightning = ?, effect_sharingan = ?, enable_intro = ?, enable_sound = ?,
           sidebar_size = ?, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        theme,
        accent_color,
        custom_accent,
        animation_intensity,
        effect_lightning ? 1 : 0,
        effect_sharingan ? 1 : 0,
        enable_intro ? 1 : 0,
        enable_sound ? 1 : 0,
        sidebar_size,
        req.session.userId
      ]
    );

    const updated = await get('SELECT * FROM settings WHERE user_id = ?', [req.session.userId]);
    return res.json({ success: true, message: 'Pengaturan berhasil disimpan.', settings: updated });
  } catch (err) {
    console.error('Settings update error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menyimpan pengaturan.' });
  }
});

// POST /api/settings/reset
app.post('/api/settings/reset', requireAuth, async (req, res) => {
  try {
    await run(
      `UPDATE settings 
       SET theme = 'dark', accent_color = 'purple', custom_accent = '#9d4edd',
           animation_intensity = 'high', effect_lightning = 1, effect_sharingan = 1,
           enable_intro = 1, enable_sound = 1, sidebar_size = 'default',
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [req.session.userId]
    );
    const updated = await get('SELECT * FROM settings WHERE user_id = ?', [req.session.userId]);
    return res.json({ success: true, message: 'Pengaturan berhasil direset ke standar Sasuke Uchiha.', settings: updated });
  } catch (err) {
    console.error('Settings reset error:', err);
    return res.status(500).json({ success: false, message: 'Gagal mereset pengaturan.' });
  }
});

// -------------------------------------------------------------
// DASHBOARD OVERVIEW ROUTE
// -------------------------------------------------------------
app.get('/api/dashboard/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const subjectsCount = await get('SELECT COUNT(*) as count FROM subjects WHERE user_id = ?', [userId]);
    const materialsCount = await get('SELECT COUNT(*) as count FROM materials WHERE user_id = ?', [userId]);
    const sportsTotal = await get('SELECT COUNT(*) as count FROM sports_schedules WHERE user_id = ?', [userId]);
    const sportsScheduled = await get(
      `SELECT COUNT(*) as count FROM sports_schedules WHERE user_id = ? AND status = 'Terjadwal'`,
      [userId]
    );
    const documentsCount = await get('SELECT COUNT(*) as count FROM documents WHERE user_id = ?', [userId]);
    const photosCount = await get('SELECT COUNT(*) as count FROM photos WHERE user_id = ?', [userId]);

    const upcomingSports = await all(
      `SELECT * FROM sports_schedules WHERE user_id = ? AND status = 'Terjadwal' ORDER BY date ASC, time_start ASC LIMIT 5`,
      [userId]
    );

    const recentSubjects = await all(
      `SELECT s.*, (SELECT COUNT(*) FROM materials m WHERE m.subject_id = s.id) as materials_count 
       FROM subjects s WHERE s.user_id = ? ORDER BY s.id DESC LIMIT 4`,
      [userId]
    );

    const recentDocuments = await all(
      `SELECT * FROM documents WHERE user_id = ? ORDER BY id DESC LIMIT 4`,
      [userId]
    );

    const recentPhotos = await all(
      `SELECT * FROM photos WHERE user_id = ? ORDER BY id DESC LIMIT 6`,
      [userId]
    );

    return res.json({
      success: true,
      stats: {
        totalSubjects: subjectsCount ? subjectsCount.count : 0,
        totalMaterials: materialsCount ? materialsCount.count : 0,
        totalSports: sportsTotal ? sportsTotal.count : 0,
        scheduledSports: sportsScheduled ? sportsScheduled.count : 0,
        totalDocuments: documentsCount ? documentsCount.count : 0,
        totalPhotos: photosCount ? photosCount.count : 0
      },
      upcomingSports,
      recentSubjects,
      recentDocuments,
      recentPhotos
    });
  } catch (err) {
    console.error('Dashboard overview error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat ringkasan dashboard.' });
  }
});

// -------------------------------------------------------------
// MATA PELAJARAN (SUBJECTS) & MATERIALS ROUTES
// -------------------------------------------------------------

// GET /api/subjects
app.get('/api/subjects', requireAuth, async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q.trim()}%` : '%';
    const subjects = await all(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM materials m WHERE m.subject_id = s.id) as materials_count
       FROM subjects s
       WHERE s.user_id = ? AND (s.name LIKE ? OR s.code LIKE ? OR s.teacher LIKE ?)
       ORDER BY s.id DESC`,
      [req.session.userId, q, q, q]
    );
    return res.json({ success: true, subjects });
  } catch (err) {
    console.error('Subjects list error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat mata pelajaran.' });
  }
});

// POST /api/subjects
app.post('/api/subjects', requireAuth, async (req, res) => {
  try {
    const { name, code, teacher, day_schedule, time_schedule, room_link, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Nama mata pelajaran wajib diisi.' });
    }

    const result = await run(
      `INSERT INTO subjects (user_id, name, code, teacher, day_schedule, time_schedule, room_link, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        name.trim(),
        code ? code.trim() : '',
        teacher ? teacher.trim() : '',
        day_schedule ? day_schedule.trim() : '',
        time_schedule ? time_schedule.trim() : '',
        room_link ? room_link.trim() : '',
        description ? description.trim() : ''
      ]
    );

    const newSubject = await get('SELECT * FROM subjects WHERE id = ?', [result.id]);
    return res.json({ success: true, message: 'Mata pelajaran berhasil ditambahkan.', subject: newSubject });
  } catch (err) {
    console.error('Create subject error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan mata pelajaran.' });
  }
});

// GET /api/subjects/:id
app.get('/api/subjects/:id', requireAuth, async (req, res) => {
  try {
    const subject = await get('SELECT * FROM subjects WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.session.userId
    ]);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Mata pelajaran tidak ditemukan.' });
    }

    const materials = await all(
      'SELECT * FROM materials WHERE subject_id = ? AND user_id = ? ORDER BY id DESC',
      [subject.id, req.session.userId]
    );

    return res.json({ success: true, subject, materials });
  } catch (err) {
    console.error('Get subject detail error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat detail mata pelajaran.' });
  }
});

// PUT /api/subjects/:id
app.put('/api/subjects/:id', requireAuth, async (req, res) => {
  try {
    const { name, code, teacher, day_schedule, time_schedule, room_link, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Nama mata pelajaran wajib diisi.' });
    }

    const existing = await get('SELECT * FROM subjects WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.session.userId
    ]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Mata pelajaran tidak ditemukan.' });
    }

    await run(
      `UPDATE subjects 
       SET name = ?, code = ?, teacher = ?, day_schedule = ?, time_schedule = ?, room_link = ?, description = ?
       WHERE id = ? AND user_id = ?`,
      [
        name.trim(),
        code ? code.trim() : '',
        teacher ? teacher.trim() : '',
        day_schedule ? day_schedule.trim() : '',
        time_schedule ? time_schedule.trim() : '',
        room_link ? room_link.trim() : '',
        description ? description.trim() : '',
        req.params.id,
        req.session.userId
      ]
    );

    const updated = await get('SELECT * FROM subjects WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Mata pelajaran berhasil diperbarui.', subject: updated });
  } catch (err) {
    console.error('Update subject error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui mata pelajaran.' });
  }
});

// DELETE /api/subjects/:id
app.delete('/api/subjects/:id', requireAuth, async (req, res) => {
  try {
    const subject = await get('SELECT * FROM subjects WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.session.userId
    ]);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Mata pelajaran tidak ditemukan.' });
    }

    // Delete associated files
    const materials = await all('SELECT filename FROM materials WHERE subject_id = ?', [subject.id]);
    materials.forEach((m) => deleteFileIfExists('materials', m.filename));

    await run('DELETE FROM materials WHERE subject_id = ?', [subject.id]);
    await run('DELETE FROM subjects WHERE id = ?', [subject.id]);

    return res.json({ success: true, message: 'Mata pelajaran beserta materinya berhasil dihapus.' });
  } catch (err) {
    console.error('Delete subject error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus mata pelajaran.' });
  }
});

// POST /api/subjects/:id/materials (Upload material file)
app.post('/api/subjects/:id/materials', requireAuth, uploadMaterials.single('file'), async (req, res) => {
  try {
    const subjectId = req.params.id;
    const subject = await get('SELECT * FROM subjects WHERE id = ? AND user_id = ?', [
      subjectId,
      req.session.userId
    ]);
    if (!subject) {
      if (req.file) deleteFileIfExists('materials', req.file.filename);
      return res.status(404).json({ success: false, message: 'Mata pelajaran tidak ditemukan.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File materi wajib dipilih.' });
    }

    const { title, category, description } = req.body;
    if (!title || !title.trim()) {
      deleteFileIfExists('materials', req.file.filename);
      return res.status(400).json({ success: false, message: 'Judul materi wajib diisi.' });
    }

    const result = await run(
      `INSERT INTO materials (subject_id, user_id, title, category, description, filename, original_name, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subjectId,
        req.session.userId,
        title.trim(),
        category ? category.trim() : 'Materi',
        description ? description.trim() : '',
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      ]
    );

    const newMaterial = await get('SELECT * FROM materials WHERE id = ?', [result.id]);
    return res.json({ success: true, message: 'Materi berhasil diunggah.', material: newMaterial });
  } catch (err) {
    if (req.file) deleteFileIfExists('materials', req.file.filename);
    console.error('Upload material error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal mengunggah materi.' });
  }
});

// DELETE /api/materials/:id
app.delete('/api/materials/:id', requireAuth, async (req, res) => {
  try {
    const material = await get('SELECT * FROM materials WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.session.userId
    ]);
    if (!material) {
      return res.status(404).json({ success: false, message: 'Materi tidak ditemukan.' });
    }

    deleteFileIfExists('materials', material.filename);
    await run('DELETE FROM materials WHERE id = ?', [material.id]);

    return res.json({ success: true, message: 'Materi berhasil dihapus.' });
  } catch (err) {
    console.error('Delete material error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus materi.' });
  }
});

// -------------------------------------------------------------
// JADWAL OLAHRAGA (SPORTS SCHEDULE) ROUTES
// -------------------------------------------------------------

// GET /api/sports
app.get('/api/sports', requireAuth, async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q.trim()}%` : '%';
    const status = req.query.status;

    let query = `SELECT * FROM sports_schedules WHERE user_id = ? AND (sport_name LIKE ? OR location LIKE ? OR notes LIKE ?)`;
    const params = [req.session.userId, q, q, q];

    if (status && status !== 'Semua') {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY date ASC, time_start ASC`;
    const sports = await all(query, params);
    return res.json({ success: true, sports });
  } catch (err) {
    console.error('Sports list error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat jadwal olahraga.' });
  }
});

// POST /api/sports
app.post('/api/sports', requireAuth, uploadSports.single('attachment'), async (req, res) => {
  try {
    const { sport_name, date, day, time_start, time_end, location, notes, status } = req.body;
    if (!sport_name || !date || !time_start) {
      if (req.file) deleteFileIfExists('sports', req.file.filename);
      return res.status(400).json({ success: false, message: 'Nama olahraga, tanggal, dan waktu mulai wajib diisi.' });
    }

    const calculatedDay = day || new Date(date).toLocaleDateString('id-ID', { weekday: 'long' });

    let attachment_filename = null;
    let attachment_original_name = null;
    let attachment_mime = null;

    if (req.file) {
      attachment_filename = req.file.filename;
      attachment_original_name = req.file.originalname;
      attachment_mime = req.file.mimetype;
    }

    const result = await run(
      `INSERT INTO sports_schedules (user_id, sport_name, date, day, time_start, time_end, location, notes, status, attachment_filename, attachment_original_name, attachment_mime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        sport_name.trim(),
        date,
        calculatedDay,
        time_start,
        time_end || '',
        location ? location.trim() : '',
        notes ? notes.trim() : '',
        status || 'Terjadwal',
        attachment_filename,
        attachment_original_name,
        attachment_mime
      ]
    );

    const newSchedule = await get('SELECT * FROM sports_schedules WHERE id = ?', [result.id]);
    return res.json({ success: true, message: 'Jadwal olahraga berhasil dibuat.', schedule: newSchedule });
  } catch (err) {
    if (req.file) deleteFileIfExists('sports', req.file.filename);
    console.error('Create sport error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal menyimpan jadwal olahraga.' });
  }
});

// GET /api/sports/:id
app.get('/api/sports/:id', requireAuth, async (req, res) => {
  try {
    const item = await get('SELECT * FROM sports_schedules WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.session.userId
    ]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Jadwal olahraga tidak ditemukan.' });
    }
    return res.json({ success: true, schedule: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Gagal memuat jadwal olahraga.' });
  }
});

// PUT /api/sports/:id
app.put('/api/sports/:id', requireAuth, uploadSports.single('attachment'), async (req, res) => {
  try {
    const existing = await get('SELECT * FROM sports_schedules WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.session.userId
    ]);
    if (!existing) {
      if (req.file) deleteFileIfExists('sports', req.file.filename);
      return res.status(404).json({ success: false, message: 'Jadwal olahraga tidak ditemukan.' });
    }

    const { sport_name, date, day, time_start, time_end, location, notes, status, remove_attachment } = req.body;
    if (!sport_name || !date || !time_start) {
      if (req.file) deleteFileIfExists('sports', req.file.filename);
      return res.status(400).json({ success: false, message: 'Nama olahraga, tanggal, dan waktu mulai wajib diisi.' });
    }

    const calculatedDay = day || new Date(date).toLocaleDateString('id-ID', { weekday: 'long' });

    let attachment_filename = existing.attachment_filename;
    let attachment_original_name = existing.attachment_original_name;
    let attachment_mime = existing.attachment_mime;

    if (req.file) {
      // New file uploaded, delete old
      deleteFileIfExists('sports', existing.attachment_filename);
      attachment_filename = req.file.filename;
      attachment_original_name = req.file.originalname;
      attachment_mime = req.file.mimetype;
    } else if (remove_attachment === 'true' || remove_attachment === '1') {
      deleteFileIfExists('sports', existing.attachment_filename);
      attachment_filename = null;
      attachment_original_name = null;
      attachment_mime = null;
    }

    await run(
      `UPDATE sports_schedules
       SET sport_name = ?, date = ?, day = ?, time_start = ?, time_end = ?, location = ?, notes = ?, status = ?,
           attachment_filename = ?, attachment_original_name = ?, attachment_mime = ?
       WHERE id = ? AND user_id = ?`,
      [
        sport_name.trim(),
        date,
        calculatedDay,
        time_start,
        time_end || '',
        location ? location.trim() : '',
        notes ? notes.trim() : '',
        status || 'Terjadwal',
        attachment_filename,
        attachment_original_name,
        attachment_mime,
        req.params.id,
        req.session.userId
      ]
    );

    const updated = await get('SELECT * FROM sports_schedules WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Jadwal olahraga berhasil diperbarui.', schedule: updated });
  } catch (err) {
    if (req.file) deleteFileIfExists('sports', req.file.filename);
    console.error('Update sport error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal memperbarui jadwal olahraga.' });
  }
});

// DELETE /api/sports/:id
app.delete('/api/sports/:id', requireAuth, async (req, res) => {
  try {
    const item = await get('SELECT * FROM sports_schedules WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.session.userId
    ]);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Jadwal tidak ditemukan.' });
    }

    deleteFileIfExists('sports', item.attachment_filename);
    await run('DELETE FROM sports_schedules WHERE id = ?', [item.id]);

    return res.json({ success: true, message: 'Jadwal olahraga berhasil dihapus.' });
  } catch (err) {
    console.error('Delete sport error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus jadwal.' });
  }
});

// -------------------------------------------------------------
// DOKUMEN PRIBADI (DOCUMENTS) ROUTES
// -------------------------------------------------------------

// GET /api/documents
app.get('/api/documents', requireAuth, async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q.trim()}%` : '%';
    const category = req.query.category;

    let query = `SELECT * FROM documents WHERE user_id = ? AND (title LIKE ? OR description LIKE ? OR original_name LIKE ?)`;
    const params = [req.session.userId, q, q, q];

    if (category && category !== 'Semua') {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY id DESC`;
    const documents = await all(query, params);
    return res.json({ success: true, documents });
  } catch (err) {
    console.error('Documents list error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat dokumen.' });
  }
});

// POST /api/documents
app.post('/api/documents', requireAuth, uploadDocuments.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File dokumen wajib dipilih.' });
    }

    const { title, category, description } = req.body;
    if (!title || !title.trim()) {
      deleteFileIfExists('documents', req.file.filename);
      return res.status(400).json({ success: false, message: 'Judul dokumen wajib diisi.' });
    }

    const result = await run(
      `INSERT INTO documents (user_id, title, category, description, filename, original_name, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        title.trim(),
        category ? category.trim() : 'Umum',
        description ? description.trim() : '',
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      ]
    );

    const newDoc = await get('SELECT * FROM documents WHERE id = ?', [result.id]);
    return res.json({ success: true, message: 'Dokumen berhasil diupload.', document: newDoc });
  } catch (err) {
    if (req.file) deleteFileIfExists('documents', req.file.filename);
    console.error('Document upload error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal mengupload dokumen.' });
  }
});

// DELETE /api/documents/:id
app.delete('/api/documents/:id', requireAuth, async (req, res) => {
  try {
    const doc = await get('SELECT * FROM documents WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.session.userId
    ]);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Dokumen tidak ditemukan.' });
    }

    deleteFileIfExists('documents', doc.filename);
    await run('DELETE FROM documents WHERE id = ?', [doc.id]);

    return res.json({ success: true, message: 'Dokumen berhasil dihapus.' });
  } catch (err) {
    console.error('Delete document error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus dokumen.' });
  }
});

// -------------------------------------------------------------
// GALERI FOTO (PHOTOS) ROUTES
// -------------------------------------------------------------

// GET /api/photos
app.get('/api/photos', requireAuth, async (req, res) => {
  try {
    const q = req.query.q ? `%${req.query.q.trim()}%` : '%';
    const category = req.query.category;

    let query = `SELECT * FROM photos WHERE user_id = ? AND (title LIKE ? OR description LIKE ? OR original_name LIKE ?)`;
    const params = [req.session.userId, q, q, q];

    if (category && category !== 'Semua') {
      query += ` AND category = ?`;
      params.push(category);
    }

    query += ` ORDER BY id DESC`;
    const photos = await all(query, params);
    return res.json({ success: true, photos });
  } catch (err) {
    console.error('Photos list error:', err);
    return res.status(500).json({ success: false, message: 'Gagal memuat galeri foto.' });
  }
});

// POST /api/photos
app.post('/api/photos', requireAuth, uploadPhotos.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File foto wajib dipilih.' });
    }

    const { title, category, description } = req.body;
    if (!title || !title.trim()) {
      deleteFileIfExists('photos', req.file.filename);
      return res.status(400).json({ success: false, message: 'Judul foto wajib diisi.' });
    }

    const result = await run(
      `INSERT INTO photos (user_id, title, category, description, filename, original_name, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        title.trim(),
        category ? category.trim() : 'Pribadi',
        description ? description.trim() : '',
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size
      ]
    );

    const newPhoto = await get('SELECT * FROM photos WHERE id = ?', [result.id]);
    return res.json({ success: true, message: 'Foto berhasil ditambahkan ke galeri.', photo: newPhoto });
  } catch (err) {
    if (req.file) deleteFileIfExists('photos', req.file.filename);
    console.error('Upload photo error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Gagal mengupload foto.' });
  }
});

// DELETE /api/photos/:id
app.delete('/api/photos/:id', requireAuth, async (req, res) => {
  try {
    const photo = await get('SELECT * FROM photos WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.session.userId
    ]);
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Foto tidak ditemukan.' });
    }

    deleteFileIfExists('photos', photo.filename);
    await run('DELETE FROM photos WHERE id = ?', [photo.id]);

    return res.json({ success: true, message: 'Foto berhasil dihapus.' });
  } catch (err) {
    console.error('Delete photo error:', err);
    return res.status(500).json({ success: false, message: 'Gagal menghapus foto.' });
  }
});

// -------------------------------------------------------------
// PROTECTED FILE SERVING (PREVIEW & DOWNLOAD)
// -------------------------------------------------------------
// Accessible only to authenticated user
app.get('/api/files/:folder/:filename', requireAuth, (req, res) => {
  const { folder, filename } = req.params;
  const safeFolders = ['materials', 'sports', 'documents', 'photos', 'avatars'];
  if (!safeFolders.includes(folder)) {
    return res.status(403).json({ success: false, message: 'Akses folder tidak sah.' });
  }

  // Prevent directory traversal
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(__dirname, 'uploads', folder, sanitizedFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File tidak ditemukan.');
  }

  // Check download flag
  if (req.query.download === '1') {
    const originalName = req.query.name ? path.basename(req.query.name) : sanitizedFilename;
    return res.download(filePath, originalName);
  }

  return res.sendFile(filePath);
});

// Public assets
app.use(express.static(path.join(__dirname, 'public')));

// Root route - redirect or serve
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback for SPA routing
app.use((req, res) => {
  // If requesting api that was not matched
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API Endpoint tidak ditemukan.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server after DB Init
initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`⚡ AGUNG PERSONAL DASHBOARD — SASUKE UCHIHA EDITION ⚡`);
      console.log(`🚀 Server aktif di: http://localhost:${PORT}`);
      console.log(`🔑 Login awal: username 'agung' | password 'kusuma'`);
      console.log(`=======================================================`);
    });
  })
  .catch((err) => {
    console.error('Fatal: Failed to initialize database:', err);
  });
