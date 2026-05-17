-- SmartMoodle - Phase 1 schema
-- Engine: InnoDB, charset: utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email           VARCHAR(190) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  role            ENUM('student','teacher','admin') NOT NULL DEFAULT 'student',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. courses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title           VARCHAR(255) NOT NULL,
  description     TEXT NULL,
  teacher_id      INT UNSIGNED NOT NULL,
  cover_image_url VARCHAR(500) NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_courses_teacher (teacher_id),
  CONSTRAINT fk_courses_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. enrollments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id      INT UNSIGNED NOT NULL,
  course_id       INT UNSIGNED NOT NULL,
  enrolled_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_enrollments_student_course (student_id, course_id),
  KEY idx_enrollments_course (course_id),
  CONSTRAINT fk_enrollments_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. course_materials
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_materials (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id       INT UNSIGNED NOT NULL,
  title           VARCHAR(255) NOT NULL,
  file_type       ENUM('pdf','video','link','text') NOT NULL,
  drive_file_id   VARCHAR(255) NULL,
  drive_url       VARCHAR(500) NULL,
  uploaded_by     INT UNSIGNED NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_materials_course (course_id),
  KEY idx_materials_uploader (uploaded_by),
  CONSTRAINT fk_materials_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_materials_uploader
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. quizzes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  course_id       INT UNSIGNED NOT NULL,
  material_id     INT UNSIGNED NULL,
  title           VARCHAR(255) NOT NULL,
  generated_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
  mode            ENUM('training','evaluation') NOT NULL DEFAULT 'training',
  max_attempts    INT UNSIGNED DEFAULT NULL,
  show_answers    BOOLEAN NOT NULL DEFAULT TRUE,
  difficulty      ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_quizzes_course (course_id),
  KEY idx_quizzes_material (material_id),
  CONSTRAINT fk_quizzes_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_quizzes_material
    FOREIGN KEY (material_id) REFERENCES course_materials(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. questions (MCQ only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quiz_id         INT UNSIGNED NOT NULL,
  question_text   TEXT NOT NULL,
  difficulty      ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_questions_quiz (quiz_id),
  CONSTRAINT fk_questions_quiz
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7. answers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS answers (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id     INT UNSIGNED NOT NULL,
  answer_text     VARCHAR(1000) NOT NULL,
  is_correct      BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  KEY idx_answers_question (question_id),
  CONSTRAINT fk_answers_question
    FOREIGN KEY (question_id) REFERENCES questions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8. quiz_attempts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id         INT UNSIGNED NOT NULL,
  quiz_id            INT UNSIGNED NOT NULL,
  score              DECIMAL(5,2) NULL,
  total_questions    INT UNSIGNED NOT NULL DEFAULT 0,
  correct_answers    INT UNSIGNED NOT NULL DEFAULT 0,
  started_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at       TIMESTAMP NULL DEFAULT NULL,
  current_difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  PRIMARY KEY (id),
  KEY idx_attempts_student (student_id),
  KEY idx_attempts_quiz (quiz_id),
  CONSTRAINT fk_attempts_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_attempts_quiz
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 9. attempt_answers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attempt_answers (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  attempt_id          INT UNSIGNED NOT NULL,
  question_id         INT UNSIGNED NOT NULL,
  selected_answer_id  INT UNSIGNED NULL,
  is_correct          BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_attempt_answers_attempt (attempt_id),
  KEY idx_attempt_answers_question (question_id),
  KEY idx_attempt_answers_selected (selected_answer_id),
  CONSTRAINT fk_attempt_answers_attempt
    FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_attempt_answers_question
    FOREIGN KEY (question_id) REFERENCES questions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_attempt_answers_selected
    FOREIGN KEY (selected_answer_id) REFERENCES answers(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 10. vark_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vark_profiles (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id         INT UNSIGNED NOT NULL,
  visual_score       INT NOT NULL DEFAULT 0,
  auditory_score     INT NOT NULL DEFAULT 0,
  reading_score      INT NOT NULL DEFAULT 0,
  kinesthetic_score  INT NOT NULL DEFAULT 0,
  dominant_style     VARCHAR(20) NULL,
  last_updated       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vark_profiles_student (student_id),
  CONSTRAINT fk_vark_profiles_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 11. vark_responses (raw VARK questionnaire answers)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vark_responses (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id      INT UNSIGNED NOT NULL,
  question_index  INT NOT NULL,
  selected_styles JSON NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vark_responses_student (student_id),
  CONSTRAINT fk_vark_responses_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 12. learning_paths
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_paths (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id               INT UNSIGNED NOT NULL,
  course_id                INT UNSIGNED NOT NULL,
  recommended_materials    JSON NULL,
  recommended_difficulty   ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  generated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_learning_paths_student_course (student_id, course_id),
  KEY idx_learning_paths_course (course_id),
  CONSTRAINT fk_learning_paths_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_learning_paths_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 13. chat_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id       INT UNSIGNED NOT NULL,
  course_id        INT UNSIGNED NULL,
  started_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_message_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_sessions_student (student_id),
  KEY idx_chat_sessions_course (course_id),
  CONSTRAINT fk_chat_sessions_student
    FOREIGN KEY (student_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_chat_sessions_course
    FOREIGN KEY (course_id) REFERENCES courses(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 14. chat_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  session_id  INT UNSIGNED NOT NULL,
  sender      ENUM('student','bot') NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_messages_session (session_id),
  CONSTRAINT fk_chat_messages_session
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
