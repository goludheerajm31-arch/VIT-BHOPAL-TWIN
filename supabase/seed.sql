-- ============================================================================
-- VIT Bhopal Digital Campus Twin: Authoritative Production Seed Data
-- Strict Foreign Key Ordering: Locations & Publishers -> Events, Faculty, Announcements
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Initial Authoritative RBAC User Roles
-- ----------------------------------------------------------------------------
INSERT INTO public.user_roles (id, email, role, status, organization, notes)
VALUES
  ('urole-admin', 'admin@vitbhopal.ac.in', 'ADMIN', 'ACTIVE', 'Office of IT & Campus Governance', 'Permanent Master Administrator'),
  ('urole-fac-demo', 'faculty.demo@vitbhopal.ac.in', 'FACULTY', 'ACTIVE', 'School of Computing Science & Engineering', 'Demo Faculty Account'),
  ('urole-pub-demo', 'publisher.demo@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'Authorized Student Organization', 'Demo Publisher Account'),
  ('urole-stu-demo', 'student.demo@vitbhopal.ac.in', 'STUDENT', 'ACTIVE', 'Student Body', 'Demo Student Account'),
  ('urole-ai-club', 'aiclub@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'AI & ML Club', 'Student Chapter'),
  ('urole-e-cell', 'e-cell@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'Innovation & Entrepreneurship Cell', 'Student Chapter'),
  ('urole-dev-soc', 'devsociety@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'Developer Student Society', 'Student Chapter'),
  ('urole-cultural', 'culturalguild@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'Cultural & Performing Arts Guild', 'Student Chapter'),
  ('urole-sports', 'sports@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'VITB Sports Council', 'Sports Governing Body'),
  ('urole-campus-adm', 'campus@vitbhopal.ac.in', 'PUBLISHER', 'ACTIVE', 'Campus Administration', 'Controller of Examinations')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 2. Campus Locations & Buildings
-- ----------------------------------------------------------------------------
INSERT INTO public.locations (id, name, category, description, latitude, longitude, building, floor, facilities, opening_hours, accessibility, image, zone, contact_phone)
VALUES
('loc-ab-1', 'VITB Academic Block 1', 'Buildings', 'VITB Academic Block 1: Main academic block housing lecture theatres, dean offices, faculty cabins, central auditorium, seminar halls, and high-performance computing labs.', 23.077636, 76.851518, 'VITB Academic Block 1', 'Ground to 4th Floor', '["Smart Classrooms", "Faculty Cabins", "Auditorium Hall", "Seminar Hall", "Advanced Computing Labs", "Elevators", "RO Drinking Water"]'::jsonb, '08:00 AM – 08:30 PM', 'Dual elevators, wheelchair ramps, accessible restrooms on all floors', 'https://images.unsplash.com/photo-1562774053-701939374585?w=1200&auto=format&fit=crop&q=80', 'Academic Precinct', '+91 7560 254510'),
('loc-ab-2', 'VITB Academic Block 2', 'Buildings', 'VITB Academic Block 2: Modern academic facility featuring smart classrooms, robotics and AI laboratories, collaborative work pods, and faculty rooms.', 23.073721, 76.855731, 'VITB Academic Block 2', 'Ground to 5th Floor', '["AI & Robotics Labs", "Interactive Classrooms", "Faculty Cabins", "Discussion Pods", "Elevators", "Digital Notice Boards"]'::jsonb, '08:00 AM – 08:30 PM', 'Ramped entry, elevators, tactile guidance corridors, accessible washrooms', 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=1200&auto=format&fit=crop&q=80', 'Academic Precinct', '+91 7560 254515'),
('loc-mph', 'Multi-purpose Hall', 'Sports', 'Multi-purpose Hall (MPH): Indoor sports complex with badminton courts, basketball arena, table tennis zone, student gymnasium, and event arena.', 23.076212, 76.849646, 'Multi-purpose Hall', 'Ground & Mezzanine', '["Badminton Courts", "Basketball Arena", "Gymnasium", "Table Tennis Arena", "Locker Rooms", "First Aid Station"]'::jsonb, '06:00 AM – 09:30 AM, 04:30 PM – 09:30 PM', 'Ramped entrance, step-free access to indoor courts and spectator gallery', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&auto=format&fit=crop&q=80', 'Sports Precinct', '+91 7560 254570'),
('loc-dr-morepen', 'Dr. Morepen Health Care', 'Medical', 'Dr. Morepen Health Care: 24/7 dedicated campus healthcare dispensary and medical clinic providing outpatient care, resident doctors, pharmacy, triage, and ambulance emergency support.', 23.07755, 76.8507, 'Dr. Morepen Health Care', 'Ground Floor', '["24/7 Emergency Ward", "Resident Doctor & Nurses", "Pharmacy", "Observation Beds", "Ambulance Bay", "Oxygen Facility"]'::jsonb, '24 Hours / 7 Days (Emergency & OPD)', 'Direct ambulance triage dock, zero-barrier ramp entrance, wheelchair availability', 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=1200&auto=format&fit=crop&q=80', 'Health & Wellness', '+91 7560 254599'),
('loc-girls-hostel-1', 'Girls Hostel Block 1', 'Hostel', 'Girls Hostel Block 1: Residential facility for female students with dining mess, study halls, high-speed Wi-Fi, recreation rooms, and round-the-clock security.', 23.075265, 76.852412, 'Girls Hostel Block 1', 'Ground to 6th Floor', '["Dining Mess", "Study Lounges", "Gym Annex", "Laundry Service", "Biometric Access", "24/7 Warden Office"]'::jsonb, 'Resident Access (Curfew 09:30 PM)', 'Elevators, ground-floor accessible rooms, ramped main portico', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&auto=format&fit=crop&q=80', 'Girls Residential Precinct', '+91 7560 254555'),
('loc-girls-hostel-2', 'Girls Hostel Block 2', 'Hostel', 'Girls Hostel Block 2: Modern residential block featuring air-conditioned rooms, quiet study halls, indoor activity room, and student mess facility.', 23.074718, 76.853045, 'Girls Hostel Block 2', 'Ground to 6th Floor', '["Central Air Cooling", "Dining Mess", "Study Hall", "High-speed Wi-Fi", "Medical Desk", "Washing Stations"]'::jsonb, 'Resident Access (Curfew 09:30 PM)', 'Elevators, wheelchair accessible entrance, step-free access', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&auto=format&fit=crop&q=80', 'Girls Residential Precinct', '+91 7560 254556'),
('loc-boys-hostel-1', 'Boys Hostel Block 1', 'Hostel', 'Boys Hostel Block 1: Senior student residence with dining mess, reading room, recreational court, and 24-hour security.', 23.079215, 76.850231, 'Boys Hostel Block 1', 'Ground to 5th Floor', '["Mess Hall", "Badminton Court", "Night Canteen", "Study Room", "Laundry Machines"]'::jsonb, 'Resident Access (Curfew 09:30 PM)', 'Ramped entry, accessible ground-floor living quarters', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&auto=format&fit=crop&q=80', 'Boys Residential Precinct', '+91 7560 254541'),
('loc-boys-hostel-2', 'Boys Hostel Block 2', 'Hostel', 'Boys Hostel Block 2: Modern residential complex for undergraduate students with gym, high-speed campus internet, and indoor game tables.', 23.079541, 76.850982, 'Boys Hostel Block 2', 'Ground to 6th Floor', '["Dining Mess", "Fitness Gym", "Table Tennis", "Wi-Fi Hub", "Warden Desk"]'::jsonb, 'Resident Access (Curfew 09:30 PM)', 'Dual elevators, ramped main portico, accessible restrooms', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&auto=format&fit=crop&q=80', 'Boys Residential Precinct', '+91 7560 254542'),
('loc-boys-hostel-3', 'Boys Hostel Block 3', 'Hostel', 'Boys Hostel Block 3: Undergraduate student hostel with spacious rooms, reading hall, courtyard sports area, and dining cafeteria.', 23.079822, 76.851711, 'Boys Hostel Block 3', 'Ground to 6th Floor', '["Mess Facilities", "Study Hall", "Open Courtyard", "High-speed Internet"]'::jsonb, 'Resident Access (Curfew 09:30 PM)', 'Elevator access, accessible ramps', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=1200&auto=format&fit=crop&q=80', 'Boys Residential Precinct', '+91 7560 254543'),
('loc-central-library', 'Central Library', 'Library', 'Central Campus Library: Multi-storey knowledge center housing print collections, digital databases, IEEE/ACM journals, silent research carrels, and discussion rooms.', 23.0772, 76.8519, 'Central Library', 'Ground to 3rd Floor', '["Digital Catalog (OPAC)", "Silent Study Zones", "Research Carrels", "E-Resource Lab", "Discussion Rooms"]'::jsonb, '08:00 AM – 11:00 PM (Exam extended hours)', 'Full elevator access to all tiers, wheelchair turnstiles', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&auto=format&fit=crop&q=80', 'Academic Precinct', '+91 7560 254520')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  facilities = EXCLUDED.facilities,
  opening_hours = EXCLUDED.opening_hours,
  accessibility = EXCLUDED.accessibility,
  image = EXCLUDED.image,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 3. Publishers / Student Clubs
-- ----------------------------------------------------------------------------
INSERT INTO public.publishers (id, user_id, organization_name, category, description, logo_url, verified, contact_email, department)
VALUES
('pub-ai-club', 'user-publisher', 'AI & ML Club', 'Technical', 'Official student chapter fostering machine learning research, Kaggle hackathons, and industry mentorship.', 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80', true, 'aiclub@vitbhopal.ac.in', 'School of Computing Science'),
('pub-innovation-club', 'user-pub-2', 'Innovation & Entrepreneurship Cell', 'Technical', 'Nurturing student startup ventures, intellectual property filings, and annual university hackathons.', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150&auto=format&fit=crop&q=80', true, 'e-cell@vitbhopal.ac.in', 'School of Computing Science'),
('pub-coding-club', 'user-pub-3', 'Developer Student Society', 'Technical', 'Community for full-stack developers, competitive coders, open-source contributors, and dev conferences.', 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=150&auto=format&fit=crop&q=80', true, 'devsociety@vitbhopal.ac.in', 'School of Computing Science'),
('pub-cultural-club', 'user-pub-4', 'Cultural & Performing Arts Guild', 'Cultural', 'Organizers of university annual fest Advitya, acoustic nights, drama productions, and dance troupes.', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=150&auto=format&fit=crop&q=80', true, 'culturalguild@vitbhopal.ac.in', 'Student Welfare Department'),
('pub-sports-council', 'user-pub-5', 'VITB Sports Council', 'Sports', 'Official governing sports body administering intramural leagues, annual athletic meets, and tournament training.', 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150&auto=format&fit=crop&q=80', true, 'sports@vitbhopal.ac.in', 'Department of Physical Education'),
('pub-campus', 'user-admin', 'Campus Administration', 'Administration', 'Office of the Controller of Examinations and University Campus Operations.', 'https://images.unsplash.com/photo-1562774053-701939374585?w=150&auto=format&fit=crop&q=80', true, 'campus@vitbhopal.ac.in', 'Administration')
ON CONFLICT (id) DO UPDATE SET
  organization_name = EXCLUDED.organization_name,
  description = EXCLUDED.description,
  verified = EXCLUDED.verified,
  contact_email = EXCLUDED.contact_email,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 4. Campus Events (FKs: publisher_id -> publishers.id, location_id -> locations.id)
-- ----------------------------------------------------------------------------
INSERT INTO public.events (id, title, subtitle, description, organizer, publisher_id, location_id, location_name, venue_detail, date, start_time, end_time, category, verified, cover_image, capacity, status, approval_status, tags)
VALUES
('evt-001', 'Advitya Hackathon 2026', 'National 36-Hour Hackathon', 'Annual national-level collegiate hackathon featuring Tracks in Generative AI, Web3, Smart Cities, and Robotics.', 'AI & ML Club', 'pub-ai-club', 'loc-ab-1', 'VITB Academic Block 1', 'Main Auditorium & CS Labs', '2026-09-12', '09:00 AM', '09:00 PM', 'Technical', true, 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80', 500, 'upcoming', 'approved', '["Hackathon", "AI", "Coding", "PrizePool"]'::jsonb),
('evt-002', 'Inter-Hostel Badminton Championship', 'Annual Trophy Series', 'Knockout tournament open to residents of all hostel blocks across men and women divisions.', 'VITB Sports Council', 'pub-sports-council', 'loc-mph', 'Multi-purpose Hall', 'Indoor Badminton Arena', '2026-09-15', '04:00 PM', '08:30 PM', 'Sports', true, 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=1200&auto=format&fit=crop&q=80', 120, 'upcoming', 'approved', '["Badminton", "Sports", "InterHostel"]'::jsonb),
('evt-003', 'AI Club Workshop', 'Hands-on Deep Learning Masterclass', 'Comprehensive workshop covering computer vision, LLM inference, and deployment on campus edge devices.', 'AI & ML Club', 'pub-ai-club', 'loc-ab-1', 'VITB Academic Block 1', 'AB1-204 Computer Lab', '2026-09-25', '10:00 AM', '01:00 PM', 'Workshops', true, 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80', 90, 'upcoming', 'approved', '["Workshop", "AI", "MachineLearning"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  date = EXCLUDED.date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  approval_status = EXCLUDED.approval_status,
  tags = EXCLUDED.tags,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 5. Faculty Directory (FK: building_id -> locations.id)
-- ----------------------------------------------------------------------------
INSERT INTO public.faculty (id, name, prefix, designation, school, department_name, cabin_number, building_id, building_name, floor, wing, room_details, email, phone, consultation_hours, subjects, research_area, directions_guide, status, live_status)
VALUES
('fac-dr-sharma', 'Dr. Rajesh Sharma', 'Dr.', 'Professor & Dean', 'SCSE', 'Computer Science and Engineering', 'AB1-314', 'loc-ab-1', 'VITB Academic Block 1', '3rd Floor', 'Wing A (North Corridor)', 'Cabin 314, Senior Faculty Wing adjacent to Dean Suite', 'rajesh.sharma@vitbhopal.ac.in', '+91 7560 254601', 'Mon, Wed: 03:00 PM – 05:00 PM', '["Advanced Algorithms", "Distributed Systems", "Cloud Computing"]'::jsonb, 'High-Performance Computing and Cloud Architecture', 'Take North Elevator at AB-1 to Floor 3, turn left past HOD Office; Cabin 314 is on the left corridor.', 'ACTIVE', 'available'),
('fac-dr-patel', 'Dr. Neha Patel', 'Dr.', 'Associate Professor', 'SCSE', 'Artificial Intelligence & Data Science', 'AB1-204', 'loc-ab-1', 'VITB Academic Block 1', '2nd Floor', 'Wing B (East Corridor)', 'Cabin 204, AI Lab Corridor', 'neha.patel@vitbhopal.ac.in', '+91 7560 254602', 'Tue, Thu: 02:00 PM – 04:00 PM', '["Deep Learning", "Natural Language Processing", "Machine Learning"]'::jsonb, 'Multimodal Generative Models and Low-Resource NLP', 'Take Central Staircase to Floor 2, enter East Corridor; Cabin 204 is opposite the High-Performance AI Lab.', 'ACTIVE', 'available'),
('fac-dr-verma', 'Dr. Amit Verma', 'Dr.', 'Professor & HOD', 'SEEE', 'Electrical & Electronics Engineering', 'AB1-105', 'loc-ab-1', 'VITB Academic Block 1', '1st Floor', 'Wing C (South Corridor)', 'Cabin 105, HOD Chamber SEEE', 'amit.verma@vitbhopal.ac.in', '+91 7560 254603', 'Daily: 11:00 AM – 12:30 PM', '["VLSI Design", "Embedded Systems", "IoT Architecture"]'::jsonb, 'Ultra-Low Power VLSI circuits and Edge Computing', 'Enter main portico of AB-1, proceed through South Corridor on Ground/1st Floor, Cabin 105 is the second door on right.', 'ACTIVE', 'available'),
('fac-dr-iyer', 'Dr. Priya Iyer', 'Dr.', 'Assistant Professor (Sr.)', 'SASL', 'Mathematics & Computing', 'AB1-412', 'loc-ab-1', 'VITB Academic Block 1', '4th Floor', 'Wing A (West Corridor)', 'Cabin 412, Mathematics Faculty Cluster', 'priya.iyer@vitbhopal.ac.in', '+91 7560 254604', 'Mon, Fri: 10:00 AM – 12:00 PM', '["Linear Algebra", "Optimization Techniques", "Graph Theory"]'::jsonb, 'Combinatorial Optimization and Algorithmic Graph Theory', 'Take South Elevator to Floor 4, turn right into West Corridor, Cabin 412 is midway along the quiet study bay.', 'ACTIVE', 'available'),
('fac-dr-khan', 'Dr. Tariq Khan', 'Dr.', 'Associate Professor', 'SMEC', 'Mechanical Engineering', 'AB2-218', 'loc-ab-2', 'VITB Academic Block 2', '2nd Floor', 'Wing B', 'Cabin 218, Mechatronics Wing', 'tariq.khan@vitbhopal.ac.in', '+91 7560 254605', 'Wed, Thu: 02:30 PM – 04:30 PM', '["Thermodynamics", "Robotics & Automation", "Fluid Dynamics"]'::jsonb, 'Autonomous Mobile Robotics and Swarm Intelligence', 'Enter AB-2 through main foyer, take elevator to 2nd Floor, follow Mechatronics signs to Cabin 218.', 'ACTIVE', 'available')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  designation = EXCLUDED.designation,
  status = EXCLUDED.status,
  live_status = EXCLUDED.live_status,
  consultation_hours = EXCLUDED.consultation_hours,
  directions_guide = EXCLUDED.directions_guide,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 6. Campus Announcements (FKs: publisher_id -> publishers.id, location_id -> locations.id)
-- ----------------------------------------------------------------------------
INSERT INTO public.announcements (id, title, description, publisher_id, publisher_name, location_id, location_name, category, priority, action_url, verified, status)
VALUES
('ann-001', 'Mid-Term Examination Hall Allocations Released', 'Students of all schools (SCSE, SEEE, SMEC, SASL) can now verify their designated examination halls and seat numbers in the portal.', 'pub-campus', 'Office of the Controller of Examinations', 'loc-ab-1', 'VITB Academic Block 1', 'Academics', 'urgent', '/events', true, 'approved'),
('ann-002', 'Annual Sports Fest Registration Open', 'Badminton, basketball, football, and athletics team registrations are now accepting entries at the Multi-Purpose Hall sports desk.', 'pub-sports-council', 'VITB Sports Council', 'loc-mph', 'Multi-purpose Hall', 'Sports', 'high', '/events/evt-002', true, 'approved'),
('ann-003', 'Advitya Hackathon 2026 Tracks & Mentors Announced', 'Problem statements for Generative AI and Autonomous Robotics tracks have been published. Join the orientation session in Seminar Hall.', 'pub-ai-club', 'AI & ML Club', 'loc-ab-1', 'VITB Academic Block 1', 'Technical', 'medium', '/events/evt-001', true, 'approved')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  priority = EXCLUDED.priority,
  action_url = EXCLUDED.action_url,
  verified = EXCLUDED.verified,
  status = EXCLUDED.status,
  updated_at = NOW();
