// Jay CVS admin: Jobs inbox SAMPLE BATCH for the design preview.
// In the real build each poster is sent to the AI model, which returns this same structure:
//   raw   = the text it read off the poster (used for the scam check)
//   job   = the advert broken into the usual parts (same shape as jobs-data.js)
//   unsure = fields the AI could not read confidently (shown in amber: "check the poster")
// All companies, emails and numbers below are FICTIONAL, except the Kilimall advert (already on the board: a duplicate).
window.INBOX_SAMPLES = [
  {
    poster: 'img/jobs/inbox/savanna-accounts-assistant.png', source: 'WhatsApp forward', tokens: [1580, 420],
    raw: "Savanna Fresh Foods Ltd. WE'RE HIRING! Accounts Assistant. Industrial Area, Nairobi. Full-time. Diploma/Degree in Accounting or Finance. CPA Part II and above. Send your CV & cover letter to careers@savannafresh.co.ke by 7th October 2026",
    job: {
      title: 'Accounts Assistant', company: 'Savanna Fresh Foods Ltd', location: 'Nairobi (Industrial Area)', workMode: 'On-site', type: 'Full-time',
      category: 'Finance & Accounting', deadline: '2026-10-07', salary: null,
      summary: 'Savanna Fresh Foods is hiring an Accounts Assistant to handle reconciliations, invoices and petty cash at its Industrial Area office.',
      responsibilities: ['Supplier and bank reconciliations', 'Invoice processing and petty cash'],
      requirements: ['Diploma or degree in Accounting or Finance', 'CPA Part II and above', "1–2 years' experience; QuickBooks an added advantage"],
      apply: { method: 'email', email: 'careers@savannafresh.co.ke', subject: 'Accounts Assistant', attach: ['CV', 'Cover letter'] },
    },
    unsure: [],
  },
  {
    poster: 'img/jobs/kilimall-it-specialist.jpeg', source: 'WhatsApp forward', tokens: [1650, 475], sampleId: 'kilimall-it-specialist',
    raw: 'Kilimall is hiring I.T Specialist. Send CV to recruitment@kilimall.com subject I.T SPECIALIST.',
    job: null, // filled from the live Kilimall job: it is the same advert again
    unsure: [],
  },
  {
    poster: 'img/jobs/inbox/mavuno-warehouse-supervisor.png', source: 'Facebook group', tokens: [1490, 410],
    raw: 'MAVUNO LOGISTICS. WAREHOUSE SUPERVISORS (3). Location: Athi River. Shifts: Day & Night. Apply online: mavunologistics.co.ke/careers. Closing date: 11 October 2026',
    job: {
      title: 'Warehouse Supervisor (3 posts)', company: 'Mavuno Logistics', location: 'Athi River', workMode: 'On-site', type: 'Full-time',
      category: 'Transport & Logistics', deadline: '2026-10-11', salary: null,
      summary: 'Mavuno Logistics needs three Warehouse Supervisors to run receiving, picking and dispatch on day and night shifts in Athi River.',
      responsibilities: ['Supervise receiving, picking and dispatch', 'Lead teams of 15–25 casual workers', 'Keep stock records accurate on the WMS'],
      requirements: ['Diploma in Logistics or Supply Chain', '3+ years of warehouse experience, 1 as a supervisor', 'Forklift certificate is a plus'],
      apply: { method: 'link', link: 'https://mavunologistics.co.ke/careers' },
    },
    unsure: [],
  },
  {
    poster: 'img/jobs/inbox/scam-airport-jobs.png', source: 'WhatsApp forward', tokens: [1380, 360],
    raw: 'URGENT!!! AIRPORT JOBS 2026. Cleaners, Drivers, Loaders, Cashiers, Customer Care, Security. SALARY KES 85,000. NO EXPERIENCE NEEDED!! 300 SLOTS ONLY. Pay registration fee of KES 1,500 via M-Pesa to 0700 000 000 (Mr. James) then send your name & ID on WhatsApp. Interviews this week. Hurry!',
    job: {
      title: 'Airport jobs: cleaners, drivers, loaders, cashiers', company: 'Not stated', location: 'Nairobi', workMode: 'On-site', type: 'Full-time',
      category: 'Other', deadline: null, salary: 'KES 85,000',
      summary: 'Multiple airport positions, no experience needed.',
      responsibilities: [], requirements: ['No experience needed'],
      apply: { method: 'whatsapp', phone: '0700 000 000' },
    },
    unsure: ['company'],
  },
  {
    poster: 'img/jobs/inbox/kazi-social-media-manager.png', source: 'LinkedIn screenshot', tokens: [1720, 450],
    raw: "Kazi Digital is hiring a Social Media Manager. Westlands, Nairobi (hybrid: 3 days in office). 3+ years running brand social accounts. Send your CV + portfolio link to jobs@kazidigital.co.ke with the subject \"SMM\".",
    job: {
      title: 'Social Media Manager', company: 'Kazi Digital', location: 'Nairobi (Westlands)', workMode: 'Hybrid', type: 'Full-time',
      category: 'Sales & Marketing', deadline: null, salary: null,
      summary: "Kazi Digital is looking for a Social Media Manager to own the brand's voice across Instagram, TikTok, X and LinkedIn.",
      responsibilities: ['Run the brand accounts on Instagram, TikTok, X and LinkedIn', 'Plan and lead campaigns', 'Run Meta Ads and report monthly'],
      requirements: ['3+ years running brand social media accounts', 'Strong copywriting; basic Canva / CapCut', 'Comfortable with Meta Ads and monthly reporting', 'Portfolio of campaigns you have led'],
      apply: { method: 'email', email: 'jobs@kazidigital.co.ke', subject: 'SMM', attach: ['CV', 'Portfolio / GitHub'] },
    },
    unsure: [],
  },
  {
    poster: 'img/jobs/inbox/imani-clinical-officers.png', source: 'Instagram', tokens: [1540, 430],
    raw: 'Imani Medical Centre. VACANCY. Clinical Officers (2). Email your application, CV and copies of certificates to hr@imanimedical.co.ke quoting "CO-2026" on the subject line. Deadline: 5/10/2026',
    job: {
      title: 'Clinical Officer (2 posts)', company: 'Imani Medical Centre', location: 'Kisumu', workMode: 'On-site', type: 'Full-time',
      category: 'Healthcare', deadline: '2026-10-05', salary: null,
      summary: 'Imani Medical Centre in Kisumu is hiring two Clinical Officers for its outpatient and casualty departments.',
      responsibilities: ['Outpatient and casualty consultations', 'Night shifts on rotation'],
      requirements: ['Diploma in Clinical Medicine & Surgery', 'Registered with the Clinical Officers Council, with a valid practising licence', 'At least 2 years in outpatient / casualty'],
      apply: { method: 'email', email: 'hr@imanimedical.co.ke', subject: 'CO-2026', attach: ['CV', 'Cover letter', 'Certificates'] },
    },
    unsure: [],
  },
  {
    poster: 'img/jobs/inbox/tumaini-teacher.png', source: 'Phone photo', tokens: [1910, 440],
    raw: 'TUMAINI ACADEMY, NAKURU. TEACHING VACANCY. Teacher - Mathematics/Physics (1 post) to start in January 2027. B.Ed (Science) Mathematics/Physics. Registered with TSC. Hand-deliver your application letter, CV and certificates to the school office (Mon-Fri, 8am-4pm) on or before 1?th Oct 2026.',
    job: {
      title: 'Teacher: Mathematics & Physics', company: 'Tumaini Academy', location: 'Nakuru', workMode: 'On-site', type: 'Full-time',
      category: 'Education', deadline: '2026-10-13', salary: null,
      summary: 'Tumaini Academy, Nakuru, is hiring a Mathematics and Physics teacher to start in January 2027.',
      responsibilities: ['Teach Mathematics and Physics'],
      requirements: ['B.Ed (Science), Mathematics/Physics', 'Registered with TSC', 'Experience with CBC is an added advantage'],
      apply: { method: 'in-person', address: 'Tumaini Academy school office, Nakuru', when: 'Mon–Fri, 8am–4pm' },
    },
    unsure: ['deadline'],
  },
  {
    poster: 'img/jobs/inbox/bahari-customer-service-interns.png', source: 'Company website', tokens: [1600, 440],
    raw: 'Bahari Microfinance Bank. Graduate Internship Programme. Customer Service Interns (10). Mombasa, Malindi, Kilifi. 6 months, monthly stipend. Apply at baharibank.co.ke/internships. Applications close 4 October 2026',
    job: {
      title: 'Customer Service Intern (10 posts)', company: 'Bahari Microfinance Bank', location: 'Mombasa, Malindi, Kilifi', workMode: 'On-site', type: 'Graduate / Internship',
      category: 'Finance & Accounting', deadline: '2026-10-04', salary: 'Monthly stipend',
      summary: 'A six-month graduate internship in customer service across Bahari Microfinance Bank branches on the coast.',
      responsibilities: ['Serve customers at the branch', 'Support account opening and enquiries'],
      requirements: ['Graduated 2024–2026 with a Business or related degree', 'Excellent spoken English and Kiswahili', 'Computer literate and customer-focused'],
      apply: { method: 'link', link: 'https://baharibank.co.ke/internships' },
    },
    unsure: [],
  },
];
