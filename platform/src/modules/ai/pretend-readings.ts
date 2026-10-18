import { PRETEND_READING, type PosterReading } from "./poster-reading";

// "Pretend" mode (no Claude key yet): readings for the design preview's sample posters
// (public/samples/inbox). All companies, emails and numbers are FICTIONAL, except Kilimall.
// Deadlines are counted from today, so the samples always show a realistic mix of flags.

type Sample = Omit<PosterReading, "deadline"> & { deadlineInDays: number | null };

const blank: Pick<
  Sample,
  | "isJobAdvert"
  | "unsureFields"
  | "salary"
  | "responsibilities"
  | "tags"
  | "scamRisk"
  | "scamReason"
  | "applyEmail"
  | "applySubject"
  | "applyUrl"
  | "applyPhone"
  | "applyAddress"
  | "applyWhen"
  | "attach"
  | "notes"
> = {
  isJobAdvert: true,
  unsureFields: [],
  salary: "",
  responsibilities: [],
  tags: [],
  scamRisk: "low",
  scamReason: "",
  applyEmail: "",
  applySubject: "",
  applyUrl: "",
  applyPhone: "",
  applyAddress: "",
  applyWhen: "",
  attach: [],
  notes: "",
};

const SAMPLES: Record<string, Sample> = {
  "savanna-accounts-assistant": {
    ...blank,
    rawText:
      "Savanna Fresh Foods Ltd. WE'RE HIRING! Accounts Assistant. Industrial Area, Nairobi. Full-time. Diploma/Degree in Accounting or Finance. CPA Part II and above. Send your CV & cover letter to careers@savannafresh.co.ke",
    title: "Accounts Assistant",
    company: "Savanna Fresh Foods Ltd",
    counties: ["Nairobi"],
    town: "Industrial Area",
    country: "",
    category: "Finance & Accounting",
    type: "Full-time",
    workMode: "On-site",
    summary:
      "Savanna Fresh Foods is hiring an Accounts Assistant to handle reconciliations, invoices and petty cash at its Industrial Area office.",
    responsibilities: ["Supplier and bank reconciliations", "Invoice processing and petty cash"],
    requirements: ["Diploma or degree in Accounting or Finance", "CPA Part II and above"],
    deadlineInDays: 12,
    applyMethod: "email",
    applyEmail: "careers@savannafresh.co.ke",
    applySubject: "Accounts Assistant",
    attach: ["CV", "Cover letter"],
  },
  "mavuno-warehouse-supervisor": {
    ...blank,
    rawText:
      "MAVUNO LOGISTICS. WAREHOUSE SUPERVISORS (3). Location: Athi River. Shifts: Day & Night. Apply online: mavunologistics.co.ke/careers.",
    title: "Warehouse Supervisor (3 posts)",
    company: "Mavuno Logistics",
    counties: ["Machakos"],
    town: "Athi River",
    country: "",
    category: "Transport & Logistics",
    type: "Full-time",
    workMode: "On-site",
    summary:
      "Mavuno Logistics needs three Warehouse Supervisors to run receiving, picking and dispatch on day and night shifts in Athi River.",
    requirements: ["Diploma in Logistics or Supply Chain", "3+ years of warehouse experience, 1 as a supervisor"],
    deadlineInDays: 2,
    applyMethod: "link",
    applyUrl: "https://mavunologistics.co.ke/careers",
  },
  "scam-airport-jobs": {
    ...blank,
    rawText:
      "URGENT!!! AIRPORT JOBS 2026. Cleaners, Drivers, Loaders, Cashiers. SALARY KES 85,000. NO EXPERIENCE NEEDED!! 300 SLOTS ONLY. Pay registration fee of KES 1,500 via M-Pesa to 0700 000 000 (Mr. James) then send your name & ID on WhatsApp. Hurry!",
    unsureFields: ["company"],
    scamRisk: "high",
    scamReason:
      "It asks applicants to pay a KES 1,500 registration fee and offers KES 85,000 with no experience needed.",
    title: "Airport jobs: cleaners, drivers, loaders, cashiers",
    company: "Not stated",
    counties: ["Nairobi"],
    town: "",
    country: "",
    category: "Other",
    type: "Full-time",
    workMode: "On-site",
    salary: "KES 85,000",
    summary: "Multiple airport positions, no experience needed.",
    requirements: ["No experience needed"],
    deadlineInDays: null,
    applyMethod: "whatsapp",
    applyPhone: "0700 000 000",
  },
  "kazi-social-media-manager": {
    ...blank,
    rawText:
      'Kazi Digital is hiring a Social Media Manager. Westlands, Nairobi (hybrid). 3+ years running brand social accounts. Send your CV + portfolio link to jobs@kazidigital.co.ke with the subject "SMM".',
    title: "Social Media Manager",
    company: "Kazi Digital",
    counties: ["Nairobi"],
    town: "Westlands",
    country: "",
    category: "Sales & Marketing",
    type: "Full-time",
    workMode: "Hybrid",
    summary: "Kazi Digital is looking for a Social Media Manager to own the brand's voice across its social channels.",
    requirements: ["3+ years running brand social media accounts", "Portfolio of campaigns you have led"],
    deadlineInDays: null,
    applyMethod: "email",
    applyEmail: "jobs@kazidigital.co.ke",
    applySubject: "SMM",
    attach: ["CV", "Portfolio / GitHub"],
  },
  "imani-clinical-officers": {
    ...blank,
    rawText:
      'Imani Medical Centre. VACANCY. Clinical Officers (2). Email your application, CV and certificates to hr@imanimedical.co.ke quoting "CO-2026".',
    title: "Clinical Officer (2 posts)",
    company: "Imani Medical Centre",
    counties: ["Kisumu"],
    town: "",
    country: "",
    category: "Healthcare",
    type: "Full-time",
    workMode: "On-site",
    summary:
      "Imani Medical Centre in Kisumu is hiring two Clinical Officers for its outpatient and casualty departments.",
    requirements: ["Diploma in Clinical Medicine & Surgery", "Valid practising licence"],
    deadlineInDays: -3,
    applyMethod: "email",
    applyEmail: "hr@imanimedical.co.ke",
    applySubject: "CO-2026",
    attach: ["CV", "Certificates"],
  },
  "tumaini-teacher": {
    ...blank,
    rawText:
      "TUMAINI ACADEMY, NAKURU. TEACHING VACANCY. Teacher - Mathematics/Physics (1 post). Hand-deliver your application to the school office (Mon-Fri, 8am-4pm) on or before 1?th Oct.",
    unsureFields: ["deadline"],
    title: "Teacher: Mathematics & Physics",
    company: "Tumaini Academy",
    counties: ["Nakuru"],
    town: "",
    country: "",
    category: "Education",
    type: "Full-time",
    workMode: "On-site",
    summary: "Tumaini Academy, Nakuru, is hiring a Mathematics and Physics teacher.",
    requirements: ["B.Ed (Science), Mathematics/Physics", "Registered with TSC"],
    deadlineInDays: 5,
    applyMethod: "in-person",
    applyAddress: "Tumaini Academy school office, Nakuru",
    applyWhen: "Mon–Fri, 8am–4pm",
  },
  "bahari-customer-service-interns": {
    ...blank,
    rawText:
      "Bahari Microfinance Bank. Graduate Internship Programme. Customer Service Interns (10). Mombasa, Malindi, Kilifi. Apply at baharibank.co.ke/internships.",
    title: "Customer Service Intern (10 posts)",
    company: "Bahari Microfinance Bank",
    counties: ["Mombasa", "Kilifi"],
    town: "Malindi",
    country: "",
    category: "Finance & Accounting",
    type: "Graduate / Internship",
    workMode: "On-site",
    salary: "Monthly stipend",
    summary:
      "A six-month graduate internship in customer service across Bahari Microfinance Bank branches on the coast.",
    requirements: ["Graduated 2024–2026 with a Business or related degree"],
    deadlineInDays: 20,
    applyMethod: "link",
    applyUrl: "https://baharibank.co.ke/internships",
  },
};

export const SAMPLE_POSTER_FILES = [...Object.keys(SAMPLES).map((key) => `${key}.png`), "kilimall-it-specialist.jpeg"];

const addDays = (today: string, days: number) => {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

// Picks the sample whose name is in the uploaded file's name; any other image gets the Kilimall sample
export function pretendReadingFor(fileName: string, today: string): PosterReading {
  const key = Object.keys(SAMPLES).find((sample) => fileName.toLowerCase().includes(sample));
  if (!key) return PRETEND_READING;
  const { deadlineInDays, ...reading } = SAMPLES[key];
  return { ...reading, deadline: deadlineInDays === null ? "" : addDays(today, deadlineInDays) };
}
