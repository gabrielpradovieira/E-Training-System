PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  emirates_id TEXT,
  role TEXT NOT NULL DEFAULT 'Competitor',
  total_hours REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competence_units (
  id INTEGER PRIMARY KEY,
  core_id INTEGER NOT NULL,
  level TEXT NOT NULL,
  title TEXT NOT NULL,
  estimated_hours INTEGER NOT NULL,
  training_weeks TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_competence_progress (
  student_id INTEGER NOT NULL,
  competence_unit_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, competence_unit_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (competence_unit_id) REFERENCES competence_units(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS training_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competence_unit_id INTEGER,
  title TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  file_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (competence_unit_id) REFERENCES competence_units(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  weekday TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Training',
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO students (id, full_name, email, phone, emirates_id, role, total_hours)
VALUES (1, 'Ahmed Al Mansoori', 'ahmed.almansoori@example.ae', '+971 50 000 0000', '784-0000-0000000-0', 'Competitor', 186.5);

INSERT OR IGNORE INTO competence_units (id, core_id, level, title, estimated_hours, training_weeks) VALUES
(1, 1, 'Foundation', 'Understand fundamentals of drawing and sketching using Adobe Photoshop tools and brushes', 30, 'Weeks 1 to 5'),
(2, 1, 'Foundation', 'Design a final render composition with colors, lighting, and mood', 60, 'Weeks 6 to 10'),
(3, 1, 'Foundation', 'Model 3D assets and props using Autodesk Maya tools', 90, 'Weeks 11 to 15'),
(4, 1, 'Foundation', 'Optimize and clean-up meshes to ensure efficient topology and performance', 120, 'Weeks 16 to 20'),
(5, 1, 'Foundation', 'Design a variety of hard-surface models such as props, vehicles, and mechanical assets', 150, 'Weeks 21 to 25'),
(6, 2, 'Intermediate', 'Sculpt organic characters and environment assets using Maxon ZBrush sculpting tools', 180, 'Weeks 26 to 30'),
(7, 2, 'Intermediate', 'Learn retopology techniques for both hard-surface and organic 3D assets', 210, 'Weeks 31 to 35'),
(8, 2, 'Intermediate', 'Unwrap and organize UV maps efficiently using Autodesk Maya tools', 240, 'Weeks 36 to 40'),
(9, 2, 'Intermediate', 'Create physically based rendering (PBR) textures using Substance Painter', 270, 'Weeks 41 to 45'),
(10, 2, 'Intermediate', 'Bake high-poly details and normal maps for game-ready assets', 300, 'Weeks 46 to 50'),
(11, 3, 'Advanced', 'Optimize the use of UV space and apply mirroring for efficiency', 330, 'Weeks 51 to 52'),
(12, 3, 'Advanced', 'Use smart masks and anchor points to add realistic texture details', 360, 'Weeks 53 to 54'),
(13, 3, 'Advanced', 'Set up FK and IK systems for character and asset rigging in Maya', 390, 'Weeks 55 to 56'),
(14, 3, 'Advanced', 'Apply skin weights and deformers for advanced character rigging', 420, 'Weeks 57 to 58'),
(15, 3, 'Advanced', 'Create keyframes to build animations for characters and objects', 450, 'Weeks 59 to 60'),
(16, 4, 'Advanced', 'Apply the 12 principles of animation to improve motion quality', 480, 'Weeks 61 to 62'),
(17, 4, 'Advanced', 'Create seamless animation loops and repeating motion cycles', 510, 'Weeks 63 to 64'),
(18, 4, 'Advanced', 'Animate organic characters and hard-surface vehicles for gameplay', 540, 'Weeks 65 to 66'),
(19, 4, 'Advanced', 'Import and organize 3D assets inside Unreal Engine 5', 570, 'Weeks 67 to 68'),
(20, 4, 'Advanced', 'Produce beauty shots using lighting, cameras, and rendering tools', 600, 'Weeks 69 to 70'),
(21, 5, 'Advanced', 'Apply basic UI and UX principles to simulate interactive gameplay', 630, 'Weeks 71 to 72'),
(22, 5, 'Advanced', 'Run stress tests to identify model, UV, and deformation errors', 660, 'Weeks 73 to 74'),
(23, 5, 'Advanced', 'Program gameplay logic and interactions using Unreal Engine Blueprints', 690, 'Weeks 75 to 76'),
(24, 5, 'Advanced', 'Develop a playable demo scene using Unreal Engine 5', 720, 'Weeks 77 to 78'),
(25, 5, 'Advanced', 'Plan strategic solutions for ad-hoc requests and unexpected challenges', 750, 'Weeks 79 to 80'),
(26, 6, 'Advanced', 'Develop strong creativity and originality for concept development', 780, 'Weeks 81 to 82'),
(27, 6, 'Advanced', 'Master the topology flow across different types of surfaces', 810, 'Weeks 83 to 84'),
(28, 6, 'Advanced', 'Develop efficient shortcuts and workflows for faster 3D modelling', 840, 'Weeks 85 to 86'),
(29, 6, 'Advanced', 'Apply advanced concept art and digital painting techniques', 870, 'Weeks 87 to 88'),
(30, 6, 'Advanced', 'Execute advanced animation workflows for complex sequences', 900, 'Weeks 89 to 90'),
(31, 7, 'Advanced', 'Perform advanced rigging tasks with speed and accuracy', 930, 'Weeks 91 to 92'),
(32, 7, 'Advanced', 'Apply advanced modelling and texturing workflows for production assets', 960, 'Weeks 93 to 94'),
(33, 7, 'Advanced', 'Develop solid workflow across softwares for accurate execution of multiple tasks', 1000, 'Weeks 95 to 96');

INSERT OR IGNORE INTO training_resources (id, competence_unit_id, title, resource_type, file_path) VALUES
(1, 1, 'Modeling_TASK.ma', 'maya_scene', 'assets/resources/Modeling_TASK.ma'),
(2, 1, 'Maya_Shortcut_Guide.pdf', 'pdf', 'assets/resources/Maya_Shortcut_Guide.pdf');
