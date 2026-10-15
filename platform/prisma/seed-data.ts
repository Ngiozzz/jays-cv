// Starting content for Jay CVS, copied from the design preview (wireframe-research/js/content-store.js).
// [Bracketed] text is placeholder copy Jay replaces in Admin → Website content.
// Prices are EXAMPLES until Jay confirms the real ones.

export const TENANT = { slug: "jaycvs", name: "Jay CVS", orderPrefix: "JC", nextOrderNumber: 1041 };

export const SETTINGS = {
  whatsapp: "0725 912 186",
  email: "info@jaycvs.co.ke",
  address: "[Office address], Nairobi, Kenya",
  paybill: "4027127",
};

export const HOMEPAGE = {
  headline: "CVs that get you",
  highlight: "shortlisted.",
  lead: "Professionally written CVs, cover letters and LinkedIn profiles, crafted by HR experts who know what Kenyan and international recruiters look for.",
  stats: [
    { value: "2,000+", label: "CVs written" },
    { value: "8", label: "Years in HR" },
    { value: "48 hrs", label: "Average turnaround" },
    { value: "4.9/5", label: "Average client rating" },
  ],
  announcementText: "December offer: 20% off LinkedIn revamps",
  announcementLink: "/pricing#individual",
};

export const PACKAGES = [
  {
    shortName: "Basic",
    name: "Basic CV",
    price: 1500,
    bestFor: "Graduates & entry-level roles",
    firstDraftHours: 48,
    revisionRounds: 1,
    revisionWindowDays: null,
    popular: false,
    features: [
      "Professionally written CV",
      "ATS-friendly format",
      "Draft in 48 hours",
      "1 round of revisions",
      "Word & PDF formats",
    ],
  },
  {
    shortName: "Professional",
    name: "Professional",
    price: 3000,
    bestFor: "Mid-level professionals",
    firstDraftHours: 24,
    revisionRounds: 2,
    revisionWindowDays: null,
    popular: true,
    features: [
      "Everything in Basic",
      "Tailored cover letter",
      "Achievement-focused rewrite",
      "2 rounds of revisions",
      "Priority 24-hour delivery",
    ],
  },
  {
    shortName: "Executive",
    name: "Executive Pack",
    price: 6000,
    bestFor: "Senior leaders & career changers",
    firstDraftHours: 24,
    revisionRounds: null,
    revisionWindowDays: 14,
    popular: false,
    features: [
      "Everything in Professional",
      "LinkedIn profile revamp",
      "1-hour career coaching call",
      "Unlimited revisions for 14 days",
      "Written personally by Jay",
    ],
  },
];

export const SERVICES = [
  { name: "Cover letter", note: "Written for one specific role", price: 800, firstDraftHours: 24 },
  {
    name: "Motivation letter / personal statement",
    note: "Scholarships, universities, programmes",
    price: 1000,
    firstDraftHours: 48,
  },
  { name: "LinkedIn profile revamp", note: "Headline, About, experience & skills", price: 2000, firstDraftHours: 72 },
  { name: "Career coaching session", note: "60 minutes, in person or online", price: 2500, firstDraftHours: 48 },
  { name: "Mock interview", note: "With written feedback", price: 2000, firstDraftHours: 48 },
  { name: "Job application support", note: "Per application / portal", price: 1000, firstDraftHours: 48 },
  { name: "CV update", note: "For CVs we wrote in the last 12 months", price: 700, firstDraftHours: 48 },
  { name: "International CV format", note: "UK, Canada, US, Europe, Gulf", price: 2500, firstDraftHours: 48 },
  // Ordered from a job page's "Get my CV tailored for this job", or with the advert pasted in
  {
    name: "CV tailored to a job",
    note: "Your CV rewritten for one specific job advert",
    price: 1000,
    firstDraftHours: 48,
    needsJobAdvert: true,
  },
];

export const REVIEWS = [
  {
    name: "[Full Name]",
    role: "[Job Title, Company]",
    photo: "/img/photos/avatar-1.jpg",
    rating: 5,
    text: "I had applied for months with no response. Two weeks after getting my new CV from Jay CVS I had three interview invitations.",
    status: "APPROVED",
    featured: true,
    consent: true,
    source: "Placeholder",
  },
  {
    name: "[Full Name]",
    role: "[Job Title, Company]",
    photo: "/img/photos/avatar-2.jpg",
    rating: 5,
    text: "The LinkedIn revamp was worth every shilling. Recruiters started reaching out to me directly within a month.",
    status: "APPROVED",
    featured: true,
    consent: true,
    source: "Placeholder",
  },
  {
    name: "[Full Name]",
    role: "[Job Title, Company]",
    photo: "/img/photos/avatar-3.jpg",
    rating: 5,
    text: "Professional, fast and very responsive on WhatsApp. They understood exactly what the international role needed.",
    status: "APPROVED",
    featured: true,
    consent: true,
    source: "Placeholder",
  },
] as const;

export const SAMPLES = [
  {
    slug: "accountant",
    role: "Accountant",
    tag: "Finance",
    caption: "Entry level → Shortlisted in 2 weeks",
    published: true,
  },
  {
    slug: "project-manager",
    role: "Project Manager",
    tag: "NGO & development",
    caption: "Mid-level → NGO role",
    published: true,
  },
  {
    slug: "nurse",
    role: "Registered Nurse",
    tag: "International",
    caption: "Kenya → UK NHS application",
    published: true,
  },
  {
    slug: "software-developer",
    role: "Software Developer",
    tag: "Tech & engineering",
    caption: "Junior → Mid-level",
    published: true,
  },
  {
    slug: "business-graduate",
    role: "Business Graduate",
    tag: "Graduates",
    caption: "First job → Graduate trainee",
    published: true,
  },
  {
    slug: "clinical-officer",
    role: "Clinical Officer",
    tag: "Healthcare",
    caption: "County hospital → Private practice",
    published: true,
  },
  {
    slug: "finance-manager",
    role: "Finance Manager",
    tag: "Finance",
    caption: "Senior → Head of Finance",
    published: true,
  },
  {
    slug: "civil-engineer",
    role: "Civil Engineer",
    tag: "Tech & engineering",
    caption: "Contractor → Consultancy firm",
    published: true,
  },
  {
    slug: "hospitality-supervisor",
    role: "Hospitality Supervisor",
    tag: "International",
    caption: "Nairobi → Dubai",
    published: false,
  },
];

export const FAQS = [
  {
    question: "How long does it take to get my CV?",
    answer:
      "You'll receive your first draft within 48 hours of payment. Professional and Executive packages get priority delivery.",
  },
  {
    question: "How do I pay?",
    answer:
      "After uploading your CV you'll see a Pay button. Tap it and an M-Pesa prompt pops up on your phone: enter your PIN. Payment is confirmed automatically and your writer starts right away.",
  },
  {
    question: "What if I don't like the draft?",
    answer:
      "Every package includes revisions. Tell us what to change and your writer will update it until you're happy.",
  },
  {
    question: "Do you write CVs for jobs abroad?",
    answer:
      "Yes. We write CVs for international roles, including the UK, Canada, the Gulf and Europe, following each region's format.",
  },
  {
    question: "I don't have a CV at all. Can you still help?",
    answer: "Absolutely. We'll send you a short questionnaire and build your CV from scratch.",
  },
];

const CV_MISTAKES_BODY = `[Placeholder article text. Replace this with the real article. The headings, lists and quote below show how each type of content will look.]

## [1. Listing duties instead of achievements]

[Recruiters already know what an accountant or a sales executive does. What they want to know is how well you did it. Replace "Responsible for sales in Nairobi region" with "Grew Nairobi region sales by 35% in 12 months".]

## [2. Using a format software can't read]

[Many employers use Applicant Tracking Systems (ATS) to filter CVs. Tables, text boxes, images and unusual fonts can make your CV unreadable to them.]

- [Use clear section headings such as "Experience", "Education" and "Skills"]
- [Save as .docx or a text-based PDF]
- [Avoid putting key information in headers, footers or images]

## [3. One CV for every job]

[Sending the same CV to every advert is the fastest way to be overlooked. Adjust your profile summary and key skills to match the words used in each job description.]

> "[The best CVs don't list everything you've done. They show what you can do for this employer.]"

## [4. Too long, or too short]

[For most professionals in Kenya, two pages is ideal. Graduates can use one page. Senior executives may need three, but only if every line earns its place.]

### [A quick checklist]

- [Contact details up to date, with a professional email address]
- [No photo, ID number, marital status or religion unless the advert asks for them]
- [Consistent dates, fonts and spacing]
- [Spell-checked, then read aloud by someone else]

## [Final thoughts]

[Summarise the key points and encourage readers to act, for example by updating one section of their CV today.]`;

const placeholderBody = (excerpt: string) =>
  `${excerpt}\n\n[Full article to be written in Admin → Website content → Career tips.]`;

type SeedPost = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  cover: string;
  coverAlt: string;
  publishedAt: string;
  readMinutes: number;
  body?: string;
};

const POSTS_RAW: SeedPost[] = [
  {
    slug: "cv-mistakes-that-get-you-rejected",
    title: "7 CV mistakes that get you rejected in Kenya",
    category: "CV tips",
    excerpt:
      'Recruiters spend about six seconds on a first look at your CV. Here\'s what they notice, and the common mistakes that send good candidates to the "no" pile.',
    cover: "/img/photos/blog-cv-mistakes.jpg",
    coverAlt: "Recruiter reviewing a CV on a clipboard",
    publishedAt: "2026-09-28",
    readMinutes: 6,
    body: CV_MISTAKES_BODY,
  },
  {
    slug: "get-recruiters-to-message-you-on-linkedin",
    title: "How to get recruiters to message you on LinkedIn",
    category: "LinkedIn",
    excerpt: "Simple profile changes that make you easier to find.",
    cover: "/img/photos/blog-linkedin.jpg",
    coverAlt: "Smiling professional using a laptop",
    publishedAt: "2026-09-20",
    readMinutes: 5,
  },
  {
    slug: "tell-me-about-yourself",
    title: 'Answering "Tell me about yourself" with confidence',
    category: "Interviews",
    excerpt: "A simple formula you can use in any interview.",
    cover: "/img/photos/blog-tell-me-about-yourself.jpg",
    coverAlt: "Candidate shaking hands at a job interview",
    publishedAt: "2026-08-24",
    readMinutes: 4,
  },
  {
    slug: "ngo-and-un-jobs-in-kenya",
    title: "Where to find NGO and UN jobs in Kenya",
    category: "Job search",
    excerpt: "The job boards and application tips that actually work.",
    cover: "/img/photos/blog-ngo-jobs.jpg",
    coverAlt: "Job seeker taking notes while searching for jobs",
    publishedAt: "2026-08-12",
    readMinutes: 7,
  },
  {
    slug: "what-is-an-ats",
    title: "What is an ATS, and how do you beat it?",
    category: "CV tips",
    excerpt: "Why good CVs get filtered out by software, and how to fix it.",
    cover: "/img/photos/blog-ats.jpg",
    coverAlt: "Professional reviewing an application on a laptop",
    publishedAt: "2026-07-22",
    readMinutes: 5,
  },
  {
    slug: "negotiate-your-salary-in-kenya",
    title: "How to negotiate your salary in Kenya",
    category: "Career growth",
    excerpt: "What to say, and when to say it, to get the offer you deserve.",
    cover: "/img/photos/blog-salary.jpg",
    coverAlt: "Two professionals shaking hands after a negotiation",
    publishedAt: "2026-07-08",
    readMinutes: 6,
  },
  {
    slug: "cv-for-jobs-in-the-uk-and-canada",
    title: "How to write a CV for jobs in the UK and Canada",
    category: "CV tips",
    excerpt: "The format differences that matter when applying abroad.",
    cover: "/img/photos/blog-uk-canada-cv.jpg",
    coverAlt: "Professional smiling during a video call",
    publishedAt: "2026-06-20",
    readMinutes: 8,
  },
  {
    slug: "interview-questions-kenyan-employers-ask",
    title: "10 interview questions Kenyan employers always ask",
    category: "Interviews",
    excerpt: "With example answers you can adapt.",
    cover: "/img/photos/blog-interview-questions.jpg",
    coverAlt: "Interviewer welcoming a candidate into an office",
    publishedAt: "2026-06-06",
    readMinutes: 9,
  },
  {
    slug: "spot-a-fake-job-advert",
    title: "How to spot a fake job advert",
    category: "Job search",
    excerpt: "Warning signs that protect you from recruitment scams.",
    cover: "/img/photos/blog-fake-jobs.jpg",
    coverAlt: "Close-up of a business handshake",
    publishedAt: "2026-05-18",
    readMinutes: 4,
  },
  {
    slug: "changing-careers-after-30",
    title: "Changing careers after 30: a practical guide",
    category: "Career growth",
    excerpt: "How to reposition your experience for a new industry.",
    cover: "/img/photos/blog-career-change.jpg",
    coverAlt: "Confident professional in a suit",
    publishedAt: "2026-05-04",
    readMinutes: 7,
  },
];

export const POSTS = POSTS_RAW.map((post) => ({
  ...post,
  authorName: "Jay CVS Team",
  body: post.body ?? placeholderBody(post.excerpt),
  publishedAt: new Date(`${post.publishedAt}T08:00:00Z`),
}));

// Jay starts with 1,000,000 AI tokens from the developer
export const STARTER_TOKENS = 1_000_000;
