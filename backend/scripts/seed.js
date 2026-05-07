/* eslint-disable no-console */
require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const BCRYPT_ROUNDS = 12;

const ADMIN = {
  email: 'admin@smartmoodle.local',
  password: 'Admin123!',
  first_name: 'Super',
  last_name: 'Admin',
  role: 'admin',
};

const TEACHERS = [
  {
    email: 'teacher1@smartmoodle.local',
    password: 'Teacher123!',
    first_name: 'Marie',
    last_name: 'Dupont',
    role: 'teacher',
  },
  {
    email: 'teacher2@smartmoodle.local',
    password: 'Teacher123!',
    first_name: 'Jean',
    last_name: 'Martin',
    role: 'teacher',
  },
];

const STUDENTS = [
  { email: 'student1@smartmoodle.local', first_name: 'Alice', last_name: 'Bernard' },
  { email: 'student2@smartmoodle.local', first_name: 'Lucas', last_name: 'Petit' },
  { email: 'student3@smartmoodle.local', first_name: 'Chloé', last_name: 'Robert' },
  { email: 'student4@smartmoodle.local', first_name: 'Hugo', last_name: 'Richard' },
  { email: 'student5@smartmoodle.local', first_name: 'Léa', last_name: 'Durand' },
].map((s) => ({ ...s, password: 'Student123!', role: 'student' }));

async function upsertUser(user) {
  const [rows] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [
    user.email,
  ]);
  if (rows.length > 0) {
    return { id: rows[0].id, created: false };
  }
  const passwordHash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES (?, ?, ?, ?, ?)`,
    [user.email, passwordHash, user.first_name, user.last_name, user.role],
  );
  return { id: result.insertId, created: true };
}

async function upsertCourse({ title, description, teacherId }) {
  const [rows] = await pool.query(
    'SELECT id FROM courses WHERE title = ? AND teacher_id = ? LIMIT 1',
    [title, teacherId],
  );
  if (rows.length > 0) {
    return { id: rows[0].id, created: false };
  }
  const [result] = await pool.query(
    `INSERT INTO courses (title, description, teacher_id) VALUES (?, ?, ?)`,
    [title, description, teacherId],
  );
  return { id: result.insertId, created: true };
}

async function enroll(studentId, courseId) {
  const [result] = await pool.query(
    'INSERT IGNORE INTO enrollments (student_id, course_id) VALUES (?, ?)',
    [studentId, courseId],
  );
  return result.affectedRows > 0;
}

async function run() {
  console.log('Seeding SmartMoodle database...');

  const admin = await upsertUser(ADMIN);
  console.log(`  admin: id=${admin.id} ${admin.created ? '(created)' : '(exists)'}`);

  const teacherIds = [];
  for (const t of TEACHERS) {
    const r = await upsertUser(t);
    teacherIds.push(r.id);
    console.log(`  teacher ${t.email}: id=${r.id} ${r.created ? '(created)' : '(exists)'}`);
  }

  const studentIds = [];
  for (const s of STUDENTS) {
    const r = await upsertUser(s);
    studentIds.push(r.id);
    console.log(`  student ${s.email}: id=${r.id} ${r.created ? '(created)' : '(exists)'}`);
  }

  const courseDefs = [
    {
      title: 'Introduction à l\'algorithmique',
      description: 'Les bases des algorithmes et de la pensée computationnelle.',
      teacherId: teacherIds[0],
    },
    {
      title: 'Bases de données relationnelles',
      description: 'Modélisation, SQL, normalisation et optimisation.',
      teacherId: teacherIds[0],
    },
    {
      title: 'Développement web moderne',
      description: 'HTML, CSS, JavaScript, React et bonnes pratiques.',
      teacherId: teacherIds[1],
    },
  ];

  const courseIds = [];
  for (const c of courseDefs) {
    const r = await upsertCourse(c);
    courseIds.push(r.id);
    console.log(`  course "${c.title}": id=${r.id} ${r.created ? '(created)' : '(exists)'}`);
  }

  // Enroll students into courses (mix of overlap so we have data to query):
  //   course 0: students 0, 1, 2
  //   course 1: students 1, 3
  //   course 2: students 0, 2, 3, 4
  const matrix = [
    [courseIds[0], [studentIds[0], studentIds[1], studentIds[2]]],
    [courseIds[1], [studentIds[1], studentIds[3]]],
    [courseIds[2], [studentIds[0], studentIds[2], studentIds[3], studentIds[4]]],
  ];

  for (const [courseId, ids] of matrix) {
    for (const sid of ids) {
      const created = await enroll(sid, courseId);
      console.log(
        `  enrollment student=${sid} course=${courseId} ${created ? '(created)' : '(exists)'}`,
      );
    }
  }

  console.log('Seed complete.');
}

run()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
