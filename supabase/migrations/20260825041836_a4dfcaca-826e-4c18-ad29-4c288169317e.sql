CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  experience text NOT NULL DEFAULT '',
  availability text NOT NULL DEFAULT 'medium' CHECK (availability IN ('low','medium','high')),
  hours_per_week int NOT NULL DEFAULT 10,
  skills text[] NOT NULL DEFAULT '{}',
  interests text[] NOT NULL DEFAULT '{}',
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'hackathon',
  required_skills text[] NOT NULL DEFAULT '{}',
  preferred_interests text[] NOT NULL DEFAULT '{}',
  team_size int NOT NULL DEFAULT 4,
  preferred_availability text NOT NULL DEFAULT 'medium' CHECK (preferred_availability IN ('low','medium','high')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects_select_all" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_owner_write" ON public.projects FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'Member',
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_members TO authenticated;
GRANT ALL ON public.project_members TO service_role;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select_all" ON public.project_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_owner_write" ON public.project_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  explanation text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_owner_all" ON public.matches FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.profiles (full_name, bio, experience, availability, hours_per_week, skills, interests, is_demo) VALUES
('Aditi Sharma','Final-year CS student focused on applied machine learning.','Built a sign-language recognition model in PyTorch; interned on a recommender systems team; published a course paper on transformer fine-tuning.','high',22,ARRAY['Python','Machine Learning','PyTorch','Deep Learning','Data Analysis'],ARRAY['AI/ML','Research','Healthcare'],true),
('Marcus Lee','Backend engineer at heart, loves distributed systems.','Built a ticketing API handling 5k rps with Go and Postgres; maintained a course scheduling backend used by 2000 students.','medium',14,ARRAY['Node.js','Go','PostgreSQL','REST APIs','Docker'],ARRAY['Startups','Developer Tools','Fintech'],true),
('Priya Nair','Frontend developer who cares about accessible interfaces.','Rebuilt a student club site in React; won a hackathon UI prize; freelance React work for two local businesses.','high',20,ARRAY['React','TypeScript','JavaScript','CSS','Next.js'],ARRAY['Design','Education','Startups'],true),
('Tomas Alvarez','Product-minded designer bridging research and UI.','Ran usability studies for a campus app; designed a design system in Figma adopted by 3 student teams.','medium',12,ARRAY['UI/UX Design','Figma','User Research','Prototyping'],ARRAY['Design','Education','Social Impact'],true),
('Hannah Kim','Data engineer building reliable pipelines.','Built an Airflow pipeline ingesting 40GB/day of sensor data; dbt models for a research lab warehouse.','medium',15,ARRAY['Python','SQL','Apache Airflow','Spark','Data Engineering','ETL'],ARRAY['Data','Climate','Research'],true),
('Diego Santos','Security researcher and CTF regular.','Placed top-10 in three national CTFs; ran a web pentest for a student startup; wrote a fuzzing harness in Rust.','low',7,ARRAY['Cybersecurity','Penetration Testing','Rust','Networking','Cryptography'],ARRAY['Security','Fintech','Research'],true),
('Yuki Tanaka','Cloud and DevOps enthusiast.','Migrated a monolith to AWS ECS; wrote Terraform modules for a research cluster; maintains a CI pipeline for 12 repos.','high',24,ARRAY['AWS','Kubernetes','Terraform','Docker','CI/CD','DevOps'],ARRAY['Cloud','Developer Tools','Startups'],true),
('Sofia Rossi','Product manager for student ventures.','Led a 6-person hackathon team to first place; ran discovery interviews for a campus marketplace; managed a roadmap for a research tool.','medium',13,ARRAY['Product Management','Roadmapping','User Research','Analytics','Public Speaking'],ARRAY['Startups','Education','Social Impact'],true),
('Ethan Brown','Full-stack builder, ships fast.','Shipped three side projects with Next.js and Supabase; built a real-time scoreboard used at a 300-person hackathon.','high',25,ARRAY['React','Node.js','TypeScript','PostgreSQL','Next.js','REST APIs'],ARRAY['Startups','Developer Tools','Gaming'],true),
('Ananya Verma','NLP researcher working on low-resource languages.','Co-authored a workshop paper on Hindi NER; built an annotation tool; TA for a natural language processing course.','low',8,ARRAY['Python','NLP','Machine Learning','Research','TensorFlow'],ARRAY['AI/ML','Research','Social Impact'],true),
('Liam O''Connor','Mobile developer with a design eye.','Published two Flutter apps; built an offline-first field survey app for a biology lab.','medium',16,ARRAY['Flutter','Dart','Mobile Development','Firebase','UI/UX Design'],ARRAY['Design','Climate','Healthcare'],true),
('Grace Mwangi','Biomedical engineering student bridging health and tech.','Built an ECG signal classifier; interned at a hospital analytics unit; domain expertise in clinical workflows.','medium',12,ARRAY['Python','Data Analysis','Signal Processing','Machine Learning','Domain Expertise'],ARRAY['Healthcare','AI/ML','Research'],true),
('Noah Weber','Computer vision and robotics tinkerer.','Built an autonomous rover for a university competition; OpenCV lane-detection pipeline; ROS integration work.','high',21,ARRAY['Python','Computer Vision','OpenCV','C++','Robotics'],ARRAY['Robotics','AI/ML','Hardware'],true),
('Mei Chen','Analytics-focused student who loves clean dashboards.','Built a Tableau dashboard for the student union budget; SQL analysis for a campus sustainability audit.','low',9,ARRAY['SQL','Data Analysis','Tableau','Python','Statistics'],ARRAY['Data','Climate','Education'],true),
('Omar Haddad','Systems and infrastructure student, ex-sysadmin.','Ran the CS department Linux lab; wrote monitoring tooling in Go; built a self-hosted Kubernetes cluster.','medium',15,ARRAY['Go','Linux','Kubernetes','Networking','DevOps','Docker'],ARRAY['Cloud','Security','Developer Tools'],true);