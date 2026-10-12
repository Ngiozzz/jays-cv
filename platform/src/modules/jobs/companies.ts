// Pure rules for remembering hiring companies and their logos

// "  Kilimall   Kenya " and "kilimall kenya" are the same company
export function companyKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type LogoType = (typeof LOGO_TYPES)[number];

// Logos are shrunk to 200px in the browser, so real files are a few KB
export const LOGO_MAX_BYTES = 1024 * 1024;

export function logoProblem(file: { type: string; size: number }): string | null {
  if (!LOGO_TYPES.includes(file.type as LogoType)) return "Please choose a PNG, JPG or WebP image for the logo.";
  if (file.size > LOGO_MAX_BYTES) return "That logo is too large. Please use one under 1 MB.";
  if (file.size === 0) return "That logo image is empty. Please choose it again.";
  return null;
}

export const isLogoType = (type: string): type is LogoType => LOGO_TYPES.includes(type as LogoType);

const EXTENSION: Record<LogoType, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function logoPath(tenantId: string, companyId: string, type: LogoType, randomPart: string): string {
  return `${tenantId}/${companyId}/${randomPart}.${EXTENSION[type]}`;
}

// "Logos for 48 of 500 companies, covering 63% of jobs": the companies that post most matter most
export function logoCoverage(companies: { hasLogo: boolean; jobCount: number }[]) {
  const withLogo = companies.filter((company) => company.hasLogo);
  const totalJobs = companies.reduce((sum, company) => sum + company.jobCount, 0);
  const coveredJobs = withLogo.reduce((sum, company) => sum + company.jobCount, 0);
  return {
    companies: companies.length,
    withLogo: withLogo.length,
    jobsCoveredPct: totalJobs ? Math.round((coveredJobs / totalJobs) * 100) : 0,
  };
}
