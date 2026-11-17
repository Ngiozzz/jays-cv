// Ready-made job sources: Kenyan vacancies pages checked on 2026-11-16 to open for robots (their
// robots.txt allows it and the page lists its links without needing a browser). The owner ticks the
// ones wanted; each is tested again when added, so a page that has since changed is caught then.

export type StarterGroup = "Government" | "Banks & employers" | "NGOs & research";

export type StarterSource = { id: string; name: string; url: string; group: StarterGroup };

export const STARTER_SOURCES: StarterSource[] = [
  { id: "kra", name: "KRA careers", url: "https://www.kra.go.ke/careers", group: "Government" },
  {
    id: "tsc",
    name: "TSC recruitment",
    url: "https://tsc.go.ke/index.php/services/teacher-management/recruitment-and-selection",
    group: "Government",
  },
  {
    id: "cbk",
    name: "Central Bank of Kenya careers",
    url: "https://www.centralbank.go.ke/cbkcareers/",
    group: "Government",
  },
  { id: "kpc", name: "Kenya Pipeline careers", url: "https://www.kpc.co.ke/career/", group: "Government" },
  { id: "kenha", name: "KeNHA careers", url: "https://kenha.co.ke/careers/", group: "Government" },
  { id: "kura", name: "KURA job opportunities", url: "https://kura.go.ke/job-opportunities/", group: "Government" },
  { id: "kemri", name: "KEMRI careers", url: "https://www.kemri.go.ke/careers/", group: "Government" },
  {
    id: "knh",
    name: "Kenyatta National Hospital careers",
    url: "https://knh.or.ke/index.php/careers/",
    group: "Government",
  },
  { id: "nssf", name: "NSSF careers", url: "https://www.nssf.or.ke/careers", group: "Government" },
  { id: "kcaa", name: "KCAA vacancies", url: "https://kcaa.or.ke/about-us/careers/vacancies", group: "Government" },
  {
    id: "krc",
    name: "Kenya Railways careers",
    url: "https://krc.co.ke/excellent-career-opportunities/",
    group: "Government",
  },
  { id: "cma", name: "Capital Markets Authority careers", url: "https://www.cma.or.ke/careers/", group: "Government" },
  { id: "epra", name: "EPRA vacancies", url: "https://epra.go.ke/vacancies", group: "Government" },
  { id: "kippra", name: "KIPPRA careers", url: "https://kippra.or.ke/careers/", group: "Government" },
  { id: "jsc", name: "Judicial Service Commission jobs", url: "https://jsc.go.ke/jobs-2/", group: "Government" },
  {
    id: "parliament",
    name: "Parliament of Kenya vacancies",
    url: "https://www.parliament.go.ke/vacancies",
    group: "Government",
  },
  { id: "nema", name: "NEMA jobs", url: "https://nema.go.ke/jobs-listings-loop/", group: "Government" },
  { id: "ku", name: "Kenyatta University careers", url: "https://www.ku.ac.ke/careers.php", group: "Government" },

  { id: "kcb", name: "KCB careers", url: "https://kcbgroup.com/careers", group: "Banks & employers" },
  { id: "coop", name: "Co-op Bank careers", url: "https://www.co-opbank.co.ke/careers/", group: "Banks & employers" },
  { id: "ncba", name: "NCBA careers", url: "https://ncbagroup.com/careers/", group: "Banks & employers" },
  {
    id: "family",
    name: "Family Bank careers",
    url: "https://familybank.co.ke/?page_id=2696",
    group: "Banks & employers",
  },
  {
    id: "jubilee",
    name: "Jubilee Insurance careers",
    url: "https://jubileeinsurance.com/group/jubilee-insurance-careers/",
    group: "Banks & employers",
  },
  {
    id: "safaricom",
    name: "Safaricom careers",
    url: "https://www.safaricom.co.ke/careers",
    group: "Banks & employers",
  },
  {
    id: "nmg",
    name: "Nation Media Group careers",
    url: "https://www.nationmedia.com/careers/",
    group: "Banks & employers",
  },
  {
    id: "mpshah",
    name: "M.P. Shah Hospital careers",
    url: "https://mpshahhosp.org/careers/",
    group: "Banks & employers",
  },

  { id: "redcross", name: "Kenya Red Cross careers", url: "https://redcross.or.ke/careers/", group: "NGOs & research" },
  { id: "amref", name: "Amref careers", url: "https://amref.org/careers/", group: "NGOs & research" },
  { id: "ilri", name: "ILRI jobs", url: "https://www.ilri.org/join-us/jobs-careers", group: "NGOs & research" },
  { id: "kwtrp", name: "KEMRI-Wellcome careers", url: "https://kemri-wellcome.org/careers/", group: "NGOs & research" },
];

export const STARTER_GROUPS: StarterGroup[] = ["Government", "Banks & employers", "NGOs & research"];
