// Jay CVS redesign: job data shared by jobs.html, job.html and check.html.
// Built from ../js/jobs-data.js and ../js/inbox-data.js (scam advert left out), with dates moved to Nov 2026
// so deadlines read live against the mock TODAY below. In the real build this comes from the database.
window.TODAY = new Date("2026-11-18T00:00:00");
window.JOBS = [
 {
  "id": "kilimall-it-specialist",
  "title": "I.T Specialist",
  "company": "Kilimall",
  "location": "Nairobi (Mombasa Road)",
  "workMode": "On-site",
  "type": "Full-time",
  "category": "IT & Tech",
  "posted": "2026-11-17",
  "deadline": "2026-11-29",
  "salary": null,
  "summary": "Kilimall is looking for an experienced I.T Specialist to run end-to-end IT operations across its offices and warehouse, from networks and CCTV to user support and team training.",
  "responsibilities": [
   "End-to-end website operations: keep power, network and internet connectivity reliable across all locations; manage LAN/WAN, routers, switches, firewalls, UPS and backup systems",
   "Warehouse IT support: maintain WMS, scanners, printers and other warehouse IT systems during peak operations",
   "Office equipment & devices: set up, configure and troubleshoot computers, printers and network devices",
   "CCTV & security systems: ensure proper recording, storage and retrieval of footage",
   "IT security & access control: manage user accounts, access rights, onboarding and offboarding",
   "IT support & service delivery: resolve support requests within agreed SLA timelines",
   "Team coordination & training: supervise IT staff and train employees on internal systems"
  ],
  "requirements": [
   "Bachelor's degree in Information Technology, Computer Science or a related field",
   "At least 5 years of experience in IT operations, infrastructure or support roles",
   "Experience with multi-site IT environments; warehouse or operational experience highly preferred",
   "Hands-on troubleshooting of networks and hardware, power backup systems and CCTV",
   "Basic knowledge of IT security and access control; able to supervise a small team"
  ],
  "apply": {
   "method": "email",
   "email": "recruitment@kilimall.com",
   "subject": "I.T SPECIALIST",
   "attach": [
    "CV",
    "Cover letter"
   ],
   "notes": "State your current and expected remuneration in your CV. Only shortlisted candidates will be contacted."
  },
  "poster": "../img/jobs/kilimall-it-specialist.jpeg",
  "source": "Kilimall hiring poster, shared on the Jay CVS Job Vacancies channel",
  "towns": [
   "Nairobi"
  ]
 },
 {
  "id": "cosmos-ehs-specialist",
  "title": "Environmental Health and Safety (EHS) Specialist",
  "company": "Cosmos",
  "location": "Location on the advert",
  "workMode": "On-site",
  "type": "Full-time",
  "category": "Engineering & Safety",
  "posted": "2026-11-11",
  "deadline": null,
  "salary": null,
  "summary": "Cosmos is seeking a proactive and experienced EHS Specialist to lead the implementation and continuous improvement of the company's Environmental Management System (EMS) and workplace safety programme.",
  "responsibilities": [
   "[Lead implementation of the Environmental Management System (EMS)]",
   "[Run workplace safety inspections, audits and risk assessments]",
   "[Train staff on health, safety and environmental procedures]"
  ],
  "requirements": [
   "[Degree in Environmental Science, Occupational Health & Safety or related field]",
   "[NEMA / DOSHS registration an added advantage]",
   "[3+ years of EHS experience]"
  ],
  "apply": {
   "method": "email",
   "email": "[careers@company.com]",
   "subject": "EHS Specialist",
   "attach": [
    "CV",
    "Cover letter"
   ],
   "notes": ""
  },
  "poster": null,
  "source": "Cosmos hiring poster, shared on the Jay CVS Job Vacancies channel",
  "towns": []
 },
 {
  "id": "ngo-project-officer-livelihoods",
  "title": "Project Officer: Livelihoods",
  "company": "International NGO",
  "location": "Kisumu",
  "workMode": "On-site",
  "type": "Contract",
  "category": "NGO & Development",
  "posted": "2026-11-16",
  "deadline": "2026-11-27",
  "salary": null,
  "summary": "[An international NGO is recruiting a Project Officer to coordinate youth livelihood and skills programmes across Kisumu and Siaya counties.]",
  "responsibilities": [
   "[Coordinate day-to-day project activities with field teams]",
   "[Prepare monthly donor reports]",
   "[Engage county governments and community groups]"
  ],
  "requirements": [
   "[Bachelor's degree in Social Sciences, Development Studies or related]",
   "[3 years of NGO project experience]",
   "[Fluency in English and Kiswahili; Dholuo an added advantage]"
  ],
  "apply": {
   "method": "link",
   "link": "[https://careers.example.org]",
   "notes": "Applications only through the online portal."
  },
  "poster": null,
  "source": "[Organisation careers page]",
  "towns": [
   "Kisumu"
  ]
 },
 {
  "id": "fmcg-sales-representatives",
  "title": "Sales Representatives (10 positions)",
  "company": "Leading FMCG company",
  "location": "Nakuru & Eldoret",
  "workMode": "Field",
  "type": "Full-time",
  "category": "Sales & Marketing",
  "posted": "2026-11-16",
  "deadline": "2026-11-21",
  "salary": "Basic + commission",
  "summary": "[A leading FMCG distributor is hiring energetic sales representatives to grow retail coverage in the Rift Valley region.]",
  "responsibilities": [
   "[Visit and serve retail outlets on assigned routes]",
   "[Meet weekly sales and distribution targets]",
   "[Collect market and competitor information]"
  ],
  "requirements": [
   "[Diploma in Sales, Marketing or Business]",
   "[1 year of field sales experience]",
   "[Valid motorcycle rider's licence an added advantage]"
  ],
  "apply": {
   "method": "whatsapp",
   "phone": "[07XX XXX XXX]",
   "notes": "Send your CV on WhatsApp with \"Sales Rep: Nakuru\" or \"Sales Rep: Eldoret\"."
  },
  "poster": null,
  "source": "[Facebook job group]",
  "towns": [
   "Nakuru",
   "Eldoret"
  ]
 },
 {
  "id": "hospital-registered-nurses",
  "title": "Registered Nurses",
  "company": "Private hospital, Nairobi",
  "location": "Nairobi",
  "workMode": "On-site",
  "type": "Full-time",
  "category": "Healthcare",
  "posted": "2026-11-15",
  "deadline": "2026-11-20",
  "salary": null,
  "summary": "[A growing private hospital is recruiting registered nurses for its medical, surgical and maternity units.]",
  "responsibilities": [
   "[Provide safe, high-quality patient care]",
   "[Administer medication and maintain patient records]",
   "[Work rotating shifts, including nights]"
  ],
  "requirements": [
   "[Diploma or BSc in Nursing]",
   "[Valid NCK licence]",
   "[At least 2 years of hospital experience]"
  ],
  "apply": {
   "method": "email",
   "email": "[hr@hospital.co.ke]",
   "subject": "Registered Nurse Application",
   "attach": [
    "CV",
    "Copies of certificates",
    "NCK licence"
   ],
   "notes": ""
  },
  "poster": null,
  "source": "[LinkedIn post]",
  "towns": [
   "Nairobi"
  ]
 },
 {
  "id": "diani-hotel-waiters",
  "title": "Waiters and Waitresses",
  "company": "Beach resort, Diani",
  "location": "Diani, Kwale",
  "workMode": "On-site",
  "type": "Contract",
  "category": "Hospitality",
  "posted": "2026-11-15",
  "deadline": "2026-11-23",
  "salary": null,
  "summary": "[A beach resort in Diani is holding walk-in interviews for experienced waiting staff ahead of the high season.]",
  "responsibilities": [
   "[Serve guests in the restaurant and pool bar]",
   "[Take orders and recommend menu items]",
   "[Keep service areas clean and well set up]"
  ],
  "requirements": [
   "[Certificate in Food & Beverage Service]",
   "[1 year of hotel experience]",
   "[Good communication skills]"
  ],
  "apply": {
   "method": "in-person",
   "address": "[Resort main gate, Diani Beach Road]",
   "when": "Monday 6 October, 9:00am–1:00pm",
   "attach": [
    "CV",
    "Certificates",
    "ID"
   ],
   "notes": ""
  },
  "poster": null,
  "source": "[Instagram post]",
  "towns": [
   "Diani"
  ]
 },
 {
  "id": "microfinance-graduate-trainee",
  "title": "Graduate Trainee: Finance",
  "company": "Microfinance institution",
  "location": "Nairobi",
  "workMode": "On-site",
  "type": "Graduate / Internship",
  "category": "Finance & Accounting",
  "posted": "2026-11-14",
  "deadline": "2026-12-05",
  "salary": "KES 30,000 stipend",
  "summary": "[A 12-month graduate programme rotating through finance, credit and operations.]",
  "responsibilities": [
   "[Support month-end reporting and reconciliations]",
   "[Assist the credit team with loan analysis]",
   "[Take part in structured training sessions]"
  ],
  "requirements": [
   "[Bachelor of Commerce or Economics, graduated 2025 or 2026]",
   "[Second Class Upper or above]",
   "[CPA Part I an added advantage]"
  ],
  "apply": {
   "method": "link",
   "link": "[https://careers.example.co.ke]",
   "notes": ""
  },
  "poster": null,
  "source": "[Company website]",
  "towns": [
   "Nairobi"
  ]
 },
 {
  "id": "startup-junior-developer",
  "title": "Junior Software Developer",
  "company": "Fintech startup, Westlands",
  "location": "Nairobi (Westlands)",
  "workMode": "Hybrid",
  "type": "Full-time",
  "category": "IT & Tech",
  "posted": "2026-11-13",
  "deadline": "2026-11-24",
  "salary": "KES 80,000–120,000",
  "summary": "[A fast-growing fintech is hiring a junior developer to build features for its mobile lending platform.]",
  "responsibilities": [
   "[Build and test React and Node.js features]",
   "[Integrate M-Pesa (Daraja) APIs]",
   "[Take part in code reviews]"
  ],
  "requirements": [
   "[Degree or diploma in Computer Science or equivalent experience]",
   "[A portfolio or GitHub with real projects]",
   "[Knowledge of JavaScript and SQL]"
  ],
  "apply": {
   "method": "email",
   "email": "[jobs@startup.co.ke]",
   "subject": "Junior Developer: [Your Name]",
   "attach": [
    "CV",
    "Link to GitHub or portfolio"
   ],
   "notes": ""
  },
  "poster": null,
  "source": "[X (Twitter) post]",
  "towns": [
   "Nairobi"
  ]
 },
 {
  "id": "logistics-accountant",
  "title": "Accountant",
  "company": "Logistics company",
  "location": "Mombasa",
  "workMode": "On-site",
  "type": "Full-time",
  "category": "Finance & Accounting",
  "posted": "2026-11-12",
  "deadline": null,
  "salary": null,
  "summary": "[A clearing and forwarding company in Mombasa is looking for an accountant to manage day-to-day finance operations.]",
  "responsibilities": [
   "[Prepare invoices and follow up on payments]",
   "[Handle KRA filings and statutory deductions]",
   "[Prepare monthly management accounts]"
  ],
  "requirements": [
   "[CPA (K) finalist or qualified]",
   "[3 years of accounting experience]",
   "[Experience with QuickBooks or Sage]"
  ],
  "apply": {
   "method": "email",
   "email": "[accounts@company.co.ke]",
   "subject": "Accountant Position",
   "attach": [
    "CV",
    "Cover letter"
   ],
   "notes": ""
  },
  "poster": null,
  "source": "[Facebook post]",
  "towns": [
   "Mombasa"
  ]
 },
 {
  "id": "county-driver",
  "title": "Driver",
  "company": "County government",
  "location": "Machakos",
  "workMode": "On-site",
  "type": "Contract",
  "category": "Transport & Logistics",
  "posted": "2026-11-01",
  "deadline": "2026-11-10",
  "salary": null,
  "summary": "[Expired sample.]",
  "responsibilities": [],
  "requirements": [],
  "apply": {
   "method": "other",
   "notes": "[Expired]"
  },
  "poster": null,
  "source": "[County website]",
  "towns": [
   "Machakos"
  ]
 },
 {
  "id": "savanna-accounts-assistant",
  "title": "Accounts Assistant",
  "company": "Savanna Fresh Foods Ltd",
  "location": "Nairobi (Industrial Area)",
  "workMode": "On-site",
  "type": "Full-time",
  "category": "Finance & Accounting",
  "deadline": "2026-11-26",
  "salary": null,
  "summary": "Savanna Fresh Foods is hiring an Accounts Assistant to handle reconciliations, invoices and petty cash at its Industrial Area office.",
  "responsibilities": [
   "Supplier and bank reconciliations",
   "Invoice processing and petty cash"
  ],
  "requirements": [
   "Diploma or degree in Accounting or Finance",
   "CPA Part II and above",
   "1–2 years' experience; QuickBooks an added advantage"
  ],
  "apply": {
   "method": "email",
   "email": "careers@savannafresh.co.ke",
   "subject": "Accounts Assistant",
   "attach": [
    "CV",
    "Cover letter"
   ]
  },
  "poster": "../img/jobs/inbox/savanna-accounts-assistant.png",
  "source": "WhatsApp forward",
  "posted": "2026-11-18",
  "towns": [
   "Nairobi"
  ]
 },
 {
  "id": "mavuno-warehouse-supervisor",
  "title": "Warehouse Supervisor (3 posts)",
  "company": "Mavuno Logistics",
  "location": "Athi River",
  "workMode": "On-site",
  "type": "Full-time",
  "category": "Transport & Logistics",
  "deadline": "2026-11-30",
  "salary": null,
  "summary": "Mavuno Logistics needs three Warehouse Supervisors to run receiving, picking and dispatch on day and night shifts in Athi River.",
  "responsibilities": [
   "Supervise receiving, picking and dispatch",
   "Lead teams of 15–25 casual workers",
   "Keep stock records accurate on the WMS"
  ],
  "requirements": [
   "Diploma in Logistics or Supply Chain",
   "3+ years of warehouse experience, 1 as a supervisor",
   "Forklift certificate is a plus"
  ],
  "apply": {
   "method": "link",
   "link": "https://mavunologistics.co.ke/careers"
  },
  "poster": "../img/jobs/inbox/mavuno-warehouse-supervisor.png",
  "source": "Facebook group",
  "posted": "2026-11-18",
  "towns": [
   "Athi River"
  ]
 },
 {
  "id": "kazi-social-media-manager",
  "title": "Social Media Manager",
  "company": "Kazi Digital",
  "location": "Nairobi (Westlands)",
  "workMode": "Hybrid",
  "type": "Full-time",
  "category": "Sales & Marketing",
  "deadline": "2026-12-02",
  "salary": null,
  "summary": "Kazi Digital is looking for a Social Media Manager to own the brand's voice across Instagram, TikTok, X and LinkedIn.",
  "responsibilities": [
   "Run the brand accounts on Instagram, TikTok, X and LinkedIn",
   "Plan and lead campaigns",
   "Run Meta Ads and report monthly"
  ],
  "requirements": [
   "3+ years running brand social media accounts",
   "Strong copywriting; basic Canva / CapCut",
   "Comfortable with Meta Ads and monthly reporting",
   "Portfolio of campaigns you have led"
  ],
  "apply": {
   "method": "email",
   "email": "jobs@kazidigital.co.ke",
   "subject": "SMM",
   "attach": [
    "CV",
    "Portfolio / GitHub"
   ]
  },
  "poster": "../img/jobs/inbox/kazi-social-media-manager.png",
  "source": "LinkedIn screenshot",
  "posted": "2026-11-17",
  "towns": [
   "Nairobi"
  ]
 },
 {
  "id": "imani-clinical-officers",
  "title": "Clinical Officer (2 posts)",
  "company": "Imani Medical Centre",
  "location": "Kisumu",
  "workMode": "On-site",
  "type": "Full-time",
  "category": "Healthcare",
  "deadline": "2026-11-22",
  "salary": null,
  "summary": "Imani Medical Centre in Kisumu is hiring two Clinical Officers for its outpatient and casualty departments.",
  "responsibilities": [
   "Outpatient and casualty consultations",
   "Night shifts on rotation"
  ],
  "requirements": [
   "Diploma in Clinical Medicine & Surgery",
   "Registered with the Clinical Officers Council, with a valid practising licence",
   "At least 2 years in outpatient / casualty"
  ],
  "apply": {
   "method": "email",
   "email": "hr@imanimedical.co.ke",
   "subject": "CO-2026",
   "attach": [
    "CV",
    "Cover letter",
    "Certificates"
   ]
  },
  "poster": "../img/jobs/inbox/imani-clinical-officers.png",
  "source": "Instagram",
  "posted": "2026-11-17",
  "towns": [
   "Kisumu"
  ]
 },
 {
  "id": "tumaini-teacher",
  "title": "Teacher: Mathematics and Physics",
  "company": "Tumaini Academy",
  "location": "Nakuru",
  "workMode": "On-site",
  "type": "Full-time",
  "category": "Education",
  "deadline": "2026-12-01",
  "salary": null,
  "summary": "Tumaini Academy, Nakuru, is hiring a Mathematics and Physics teacher to start in January 2027.",
  "responsibilities": [
   "Teach Mathematics and Physics"
  ],
  "requirements": [
   "B.Ed (Science), Mathematics/Physics",
   "Registered with TSC",
   "Experience with CBC is an added advantage"
  ],
  "apply": {
   "method": "in-person",
   "address": "Tumaini Academy school office, Nakuru",
   "when": "Mon–Fri, 8am–4pm"
  },
  "poster": "../img/jobs/inbox/tumaini-teacher.png",
  "source": "Phone photo",
  "posted": "2026-11-16",
  "towns": [
   "Nakuru"
  ]
 },
 {
  "id": "bahari-customer-service-interns",
  "title": "Customer Service Intern (10 posts)",
  "company": "Bahari Microfinance Bank",
  "location": "Mombasa, Malindi, Kilifi",
  "workMode": "On-site",
  "type": "Graduate / Internship",
  "category": "Finance & Accounting",
  "deadline": "2026-11-25",
  "salary": "Monthly stipend",
  "summary": "A six-month graduate internship in customer service across Bahari Microfinance Bank branches on the coast.",
  "responsibilities": [
   "Serve customers at the branch",
   "Support account opening and enquiries"
  ],
  "requirements": [
   "Graduated 2024–2026 with a Business or related degree",
   "Excellent spoken English and Kiswahili",
   "Computer literate and customer-focused"
  ],
  "apply": {
   "method": "link",
   "link": "https://baharibank.co.ke/internships"
  },
  "poster": "../img/jobs/inbox/bahari-customer-service-interns.png",
  "source": "Company website",
  "posted": "2026-11-17",
  "towns": [
   "Mombasa",
   "Malindi",
   "Kilifi"
  ]
 }
];
