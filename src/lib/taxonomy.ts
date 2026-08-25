export const AVAILABILITY_LEVELS = ["low", "medium", "high"] as const;
export type Availability = (typeof AVAILABILITY_LEVELS)[number];

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  low: "Low — a few hours a week",
  medium: "Medium — steady weekly time",
  high: "High — heavily available",
};

export const PROJECT_CATEGORIES = [
  { value: "hackathon", label: "Hackathon" },
  { value: "research", label: "Research" },
  { value: "startup", label: "Startup" },
  { value: "course", label: "Course project" },
  { value: "competition", label: "Competition" },
] as const;

export const SKILL_OPTIONS: string[] = [
  "Python",
  "Machine Learning",
  "Deep Learning",
  "PyTorch",
  "TensorFlow",
  "NLP",
  "Computer Vision",
  "OpenCV",
  "Data Analysis",
  "Data Engineering",
  "ETL",
  "Apache Airflow",
  "Spark",
  "SQL",
  "PostgreSQL",
  "Statistics",
  "Tableau",
  "React",
  "Next.js",
  "TypeScript",
  "JavaScript",
  "CSS",
  "Node.js",
  "Go",
  "Rust",
  "C++",
  "Java",
  "REST APIs",
  "Flutter",
  "Dart",
  "Mobile Development",
  "Firebase",
  "Docker",
  "Kubernetes",
  "Terraform",
  "AWS",
  "CI/CD",
  "DevOps",
  "Linux",
  "Networking",
  "Cybersecurity",
  "Penetration Testing",
  "Cryptography",
  "UI/UX Design",
  "Figma",
  "User Research",
  "Prototyping",
  "Product Management",
  "Roadmapping",
  "Analytics",
  "Public Speaking",
  "Research",
  "Signal Processing",
  "Robotics",
  "Domain Expertise",
];

export const INTEREST_OPTIONS: string[] = [
  "AI/ML",
  "Data",
  "Design",
  "Developer Tools",
  "Startups",
  "Research",
  "Education",
  "Healthcare",
  "Climate",
  "Fintech",
  "Security",
  "Cloud",
  "Robotics",
  "Hardware",
  "Gaming",
  "Social Impact",
];

/** Deterministic alias map: lowercase input -> canonical skill name. */
const SKILL_ALIASES: Record<string, string> = {
  reactjs: "React",
  "react.js": "React",
  react: "React",
  node: "Node.js",
  nodejs: "Node.js",
  "node js": "Node.js",
  express: "Node.js",
  js: "JavaScript",
  ts: "TypeScript",
  py: "Python",
  ml: "Machine Learning",
  "machine-learning": "Machine Learning",
  ai: "Machine Learning",
  dl: "Deep Learning",
  "deep-learning": "Deep Learning",
  torch: "PyTorch",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  tf: "TensorFlow",
  "natural language processing": "NLP",
  nlp: "NLP",
  cv: "Computer Vision",
  "computer-vision": "Computer Vision",
  opencv: "OpenCV",
  postgres: "PostgreSQL",
  psql: "PostgreSQL",
  postgresql: "PostgreSQL",
  golang: "Go",
  "c++": "C++",
  cpp: "C++",
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  aws: "AWS",
  "amazon web services": "AWS",
  gcp: "Cloud",
  devops: "DevOps",
  "ui/ux": "UI/UX Design",
  ui: "UI/UX Design",
  ux: "UI/UX Design",
  "ux design": "UI/UX Design",
  "ui design": "UI/UX Design",
  design: "UI/UX Design",
  figma: "Figma",
  pm: "Product Management",
  product: "Product Management",
  "product manager": "Product Management",
  security: "Cybersecurity",
  infosec: "Cybersecurity",
  pentesting: "Penetration Testing",
  "pen testing": "Penetration Testing",
  api: "REST APIs",
  apis: "REST APIs",
  "rest api": "REST APIs",
  sql: "SQL",
  "data science": "Data Analysis",
  analytics: "Analytics",
  airflow: "Apache Airflow",
  "next js": "Next.js",
  nextjs: "Next.js",
  flutter: "Flutter",
  docker: "Docker",
  terraform: "Terraform",
  rust: "Rust",
  java: "Java",
  linux: "Linux",
};

const CANONICAL_BY_LOWER: Record<string, string> = Object.fromEntries(
  SKILL_OPTIONS.map((s) => [s.toLowerCase(), s]),
);

/** Normalize a free-text skill into a canonical name. */
export function normalizeSkill(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  if (CANONICAL_BY_LOWER[lower]) return CANONICAL_BY_LOWER[lower]!;
  if (SKILL_ALIASES[lower]) return SKILL_ALIASES[lower]!;
  return trimmed
    .split(" ")
    .map((w) => (w.length > 2 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function normalizeSkills(raw: string[]): string[] {
  const out: string[] = [];
  for (const item of raw) {
    const skill = normalizeSkill(item);
    if (skill && !out.some((s) => s.toLowerCase() === skill.toLowerCase())) out.push(skill);
  }
  return out;
}

export function normalizeInterest(raw: string): string {
  const trimmed = raw.trim();
  const match = INTEREST_OPTIONS.find((i) => i.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed;
}
