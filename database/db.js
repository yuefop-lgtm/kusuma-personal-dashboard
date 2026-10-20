const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'dashboard.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Helper for promise-based query runs
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Initialize tables and default seed data
async function initDatabase() {
  // Enable foreign keys
  await run('PRAGMA foreign_keys = ON');

  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      bio TEXT DEFAULT 'Sasuke Uchiha Enthusiast & Tech Scholar',
      ninja_rank TEXT DEFAULT 'Special Jonin / Elite Scholar',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Settings table
  await run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      theme TEXT DEFAULT 'dark',
      accent_color TEXT DEFAULT 'purple',
      custom_accent TEXT DEFAULT '#9d4edd',
      animation_intensity TEXT DEFAULT 'high',
      effect_lightning INTEGER DEFAULT 1,
      effect_sharingan INTEGER DEFAULT 1,
      enable_intro INTEGER DEFAULT 1,
      enable_sound INTEGER DEFAULT 1,
      sidebar_size TEXT DEFAULT 'default',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Subjects table (Mata Pelajaran)
  await run(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      teacher TEXT,
      day_schedule TEXT,
      time_schedule TEXT,
      room_link TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Materials table (Materi Pelajaran)
  await run(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'Materi',
      description TEXT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Sports Schedules table (Jadwal Olahraga)
  await run(`
    CREATE TABLE IF NOT EXISTS sports_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sport_name TEXT NOT NULL,
      date TEXT NOT NULL,
      day TEXT NOT NULL,
      time_start TEXT NOT NULL,
      time_end TEXT,
      location TEXT,
      notes TEXT,
      status TEXT DEFAULT 'Terjadwal',
      attachment_filename TEXT,
      attachment_original_name TEXT,
      attachment_mime TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Documents table (Dokumen Pribadi)
  await run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Photos table (Galeri Foto)
  await run(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Check if default user 'agung' exists
  const existingUser = await get('SELECT * FROM users WHERE username = ?', ['agung']);
  if (!existingUser) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('kusuma', salt);
    const userRes = await run(
      `INSERT INTO users (username, password_hash, full_name, bio, ninja_rank)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'agung',
        passwordHash,
        'Agung Kusuma Tri Atmaja',
        'Uchiha Clan Successor — Master of Code & Chidori',
        'S-Rank Specialist'
      ]
    );

    await run(
      `INSERT INTO settings (user_id, theme, accent_color, custom_accent, animation_intensity, effect_lightning, effect_sharingan, enable_intro, enable_sound, sidebar_size)
       VALUES (?, 'dark', 'purple', '#9d4edd', 'high', 1, 1, 1, 1, 'default')`,
      [userRes.id]
    );

    // Add some initial sample data so the dashboard is immediately vibrant and functional
    const sub1 = await run(
      `INSERT INTO subjects (user_id, name, code, teacher, day_schedule, time_schedule, room_link, description)
       VALUES (?, 'Algoritma & Pemrograman', 'IF-101', 'Kakashi Hatake, M.Kom', 'Senin', '08:00 - 10:30', 'Lab Komputer 03', 'Dasar logika pemrograman, struktur data, dan optimasi algoritma.')`,
      [userRes.id]
    );
    const sub2 = await run(
      `INSERT INTO subjects (user_id, name, code, teacher, day_schedule, time_schedule, room_link, description)
       VALUES (?, 'Sistem Basis Data (SQLite)', 'IF-104', 'Yamato Sensei, M.T', 'Rabu', '13:00 - 15:30', 'Ruang Teori B-201', 'Perancangan ERD, relasi tabel, SQL query, dan normalisasi database.')`,
      [userRes.id]
    );
    const sub3 = await run(
      `INSERT INTO subjects (user_id, name, code, teacher, day_schedule, time_schedule, room_link, description)
       VALUES (?, 'Pengembangan Web Modern', 'IF-202', 'Jiraiya Ph.D', 'Kamis', '10:00 - 12:30', 'Studio Multimedia', 'Full-stack Node.js, Express, UI/UX Glassmorphism, dan REST APIs.')`,
      [userRes.id]
    );

    // Initial sports schedule
    const today = new Date().toISOString().split('T')[0];
    await run(
      `INSERT INTO sports_schedules (user_id, sport_name, date, day, time_start, time_end, location, notes, status)
       VALUES (?, 'Latihan Calisthenics & Push-up Chidori', ?, 'Senin', '06:00', '07:30', 'Area Gym Terbuka / Taman', 'Pemanasan 15 menit, pull-up 5 set, push-up eksplosif.', 'Terjadwal')`,
      [userRes.id, today]
    );
    await run(
      `INSERT INTO sports_schedules (user_id, sport_name, date, day, time_start, time_end, location, notes, status)
       VALUES (?, 'Futsal Bersama Tim Shinobi', ?, 'Jumat', '16:00', '18:00', 'Konoha Futsal Arena', 'Latihan kecepatan dribble dan akurasi tendangan.', 'Terjadwal')`,
      [userRes.id, today]
    );

    console.log('Default user "agung" seeded with password "kusuma" and sample data.');
  }
}

module.exports = {
  db,
  run,
  get,
  all,
  initDatabase
};
