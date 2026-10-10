import { emptyCandidateCard, emptyJobCard, type CandidateCard, type JobCard } from "../../src/domain/types";

export type LangVariantId = "en" | "he" | "mixed";

export type CrossLangPairSpec = {
  id: string;
  /** mixed: Hebrew job + English candidate when even index, else opposite */
  en: { candidate: Partial<CandidateCard>; job: Partial<JobCard> };
  he: { candidate: Partial<CandidateCard>; job: Partial<JobCard> };
};

function cardCandidate(p: Partial<CandidateCard>): CandidateCard {
  return { ...emptyCandidateCard(), flexibility: 5, ...p };
}

function cardJob(p: Partial<JobCard>): JobCard {
  return { ...emptyJobCard(), flexibility: 5, ...p };
}

/** 20 logical pairs with Hebrew + English field variants (mixed composed at eval time). */
export const CROSS_LANG_PAIRS: CrossLangPairSpec[] = [
  {
    id: "p01-waiter-tlv",
    en: {
      candidate: { desiredRole: "Waiter", field: "Hospitality", location: "Tel Aviv", skills: ["customer service"], languages: ["Hebrew", "English"] },
      job: { title: "Waiter", field: "Hospitality", location: "Tel Aviv", mustHaves: ["customer service"], requiredLanguages: ["Hebrew"] },
    },
    he: {
      candidate: { desiredRole: "מלצר", field: "מסעדנות", location: "תל אביב", skills: ["שירות לקוחות"], languages: ["עברית", "אנגלית"] },
      job: { title: "מלצר/ית", field: "מסעדנות", location: "תל אביב", mustHaves: ["שירות לקוחות"], requiredLanguages: ["עברית"] },
    },
  },
  {
    id: "p02-bartender-ramat-gan",
    en: {
      candidate: { desiredRole: "Bartender", field: "Hospitality", location: "Ramat Gan", skills: ["cocktails"], languages: ["English"] },
      job: { title: "Bartender", field: "Restaurants", location: "Ramat Gan", mustHaves: ["English"], requiredLanguages: ["English"] },
    },
    he: {
      candidate: { desiredRole: "ברמן", field: "מסעדנות", location: "רמת גן", skills: ["קוקטיילים"], languages: ["אנגלית"] },
      job: { title: "ברמן/ית", field: "מסעדות", location: "רמת גן", mustHaves: ["אנגלית"], requiredLanguages: ["אנגלית"] },
    },
  },
  {
    id: "p03-dev-react",
    en: {
      candidate: { desiredRole: "Full Stack Developer", field: "Technology", location: "Herzliya", skills: ["React", "TypeScript"], languages: ["English"], experienceLevel: "mid", seniority: "mid" },
      job: { title: "Full Stack Developer", field: "Technology", location: "Herzliya", mustHaves: ["React", "TypeScript"], requiredLanguages: ["English"], seniorityLevel: "mid" },
    },
    he: {
      candidate: { desiredRole: "מפתח Full Stack", field: "הייטק", location: "הרצליה", skills: ["ריאקט", "טייפסקריפט"], languages: ["אנגלית"], experienceLevel: "ביניים", seniority: "ביניים" },
      job: { title: "מפתח Full Stack", field: "הייטק", location: "הרצליה", mustHaves: ["ריאקט", "טייפסקריפט"], requiredLanguages: ["אנגלית"], seniorityLevel: "ביניים" },
    },
  },
  {
    id: "p04-support-haifa",
    en: {
      candidate: { desiredRole: "Customer Support", field: "Service", location: "Haifa", skills: ["CRM"], languages: ["Hebrew", "Russian"] },
      job: { title: "Customer Service Representative", field: "Service", location: "Haifa", mustHaves: ["customer service"], requiredLanguages: ["Hebrew"] },
    },
    he: {
      candidate: { desiredRole: "נציג שירות", field: "שירות", location: "חיפה", skills: ["CRM"], languages: ["עברית", "רוסית"] },
      job: { title: "נציג שירות לקוחות", field: "שירות", location: "חיפה", mustHaves: ["שירות לקוחות"], requiredLanguages: ["עברית"] },
    },
  },
  {
    id: "p05-chef-jlm",
    en: {
      candidate: { desiredRole: "Chef", field: "Hospitality", location: "Jerusalem", skills: ["kitchen management"], languages: ["Hebrew"] },
      job: { title: "Chef", field: "Hospitality", location: "Jerusalem", mustHaves: ["kitchen management"], requiredLanguages: ["Hebrew"] },
    },
    he: {
      candidate: { desiredRole: "טבח", field: "מסעדנות", location: "ירושלים", skills: ["ניהול מטבח"], languages: ["עברית"] },
      job: { title: "טבח/ית", field: "מסעדנות", location: "ירושלים", mustHaves: ["ניהול מטבח"], requiredLanguages: ["עברית"] },
    },
  },
  {
    id: "p06-node-backend",
    en: {
      candidate: { desiredRole: "Backend Developer", field: "Technology", location: "Tel Aviv", skills: ["Node.js", "PostgreSQL"], languages: ["English"], experienceLevel: "senior" },
      job: { title: "Backend Engineer", field: "Technology", location: "Tel Aviv", mustHaves: ["Node.js", "SQL"], requiredLanguages: ["English"], seniorityLevel: "senior" },
    },
    he: {
      candidate: { desiredRole: "מפתח Backend", field: "הייטק", location: "תל אביב", skills: ["Node.js", "PostgreSQL"], languages: ["אנגלית"], experienceLevel: "בכיר" },
      job: { title: "מהנדס Backend", field: "טכנולוגיה", location: "תל אביב", mustHaves: ["Node.js", "SQL"], requiredLanguages: ["אנגלית"], seniorityLevel: "בכיר" },
    },
  },
  {
    id: "p07-junior-qa",
    en: {
      candidate: { desiredRole: "QA Engineer", field: "Technology", location: "Ramat Gan", skills: ["manual testing", "Jira"], languages: ["Hebrew"], experienceLevel: "junior" },
      job: { title: "QA Engineer", field: "Technology", location: "Ramat Gan", mustHaves: ["Jira"], requiredLanguages: ["Hebrew"], seniorityLevel: "junior" },
    },
    he: {
      candidate: { desiredRole: "בודק/ת תוכנה", field: "הייטק", location: "רמת גן", skills: ["בדיקות ידניות", "Jira"], languages: ["עברית"], experienceLevel: "ג'וניור" },
      job: { title: "בודק/ת תוכנה", field: "הייטק", location: "רמת גן", mustHaves: ["Jira"], requiredLanguages: ["עברית"], seniorityLevel: "ג'וניור" },
    },
  },
  {
    id: "p08-retail-tlv",
    en: {
      candidate: { desiredRole: "Sales Associate", field: "Retail", location: "Tel Aviv", skills: ["sales"], languages: ["Hebrew"] },
      job: { title: "Sales Associate", field: "Retail", location: "Tel Aviv", mustHaves: ["sales"], requiredLanguages: ["Hebrew"] },
    },
    he: {
      candidate: { desiredRole: "מוכר/ת", field: "קמעונאות", location: "תל אביב", skills: ["מכירות"], languages: ["עברית"] },
      job: { title: "מוכר/ת", field: "קמעונאות", location: "תל אביב", mustHaves: ["מכירות"], requiredLanguages: ["עברית"] },
    },
  },
  {
    id: "p09-devops",
    en: {
      candidate: { desiredRole: "DevOps Engineer", field: "Technology", location: "Herzliya", skills: ["Docker", "Kubernetes", "AWS"], languages: ["English"] },
      job: { title: "DevOps", field: "Technology", location: "Herzliya", mustHaves: ["Docker", "AWS"], requiredLanguages: ["English"] },
    },
    he: {
      candidate: { desiredRole: "DevOps", field: "הייטק", location: "הרצליה", skills: ["Docker", "Kubernetes", "AWS"], languages: ["אנגלית"] },
      job: { title: "DevOps Engineer", field: "טכנולוגיה", location: "הרצליה", mustHaves: ["Docker", "AWS"], requiredLanguages: ["אנגלית"] },
    },
  },
  {
    id: "p10-hotel-front",
    en: {
      candidate: { desiredRole: "Front Desk Agent", field: "Hospitality", location: "Tel Aviv", skills: ["customer service"], languages: ["English", "Hebrew"] },
      job: { title: "Front Desk Agent", field: "Hospitality", location: "Tel Aviv", mustHaves: ["customer service"], requiredLanguages: ["English"] },
    },
    he: {
      candidate: { desiredRole: "פקיד/ת קבלה", field: "מלונאות", location: "תל אביב", skills: ["שירות לקוחות"], languages: ["אנגלית", "עברית"] },
      job: { title: "פקיד/ת קבלה", field: "מלונאות", location: "תל אביב", mustHaves: ["שירות לקוחות"], requiredLanguages: ["אנגלית"] },
    },
  },
  {
    id: "p11-python-data",
    en: {
      candidate: { desiredRole: "Data Analyst", field: "Technology", location: "Tel Aviv", skills: ["Python", "SQL"], languages: ["English"], education: "BSc" },
      job: { title: "Data Analyst", field: "Technology", location: "Tel Aviv", mustHaves: ["Python"], requiredLanguages: ["English"] },
    },
    he: {
      candidate: { desiredRole: "Data Analyst", field: "הייטק", location: "תל אביב", skills: ["Python", "SQL"], languages: ["אנגלית"], education: "תואר ראשון" },
      job: { title: "Data Analyst", field: "טכנולוגיה", location: "תל אביב", mustHaves: ["Python"], requiredLanguages: ["אנגלית"] },
    },
  },
  {
    id: "p12-mobile",
    en: {
      candidate: { desiredRole: "Mobile Developer", field: "Technology", location: "Tel Aviv", skills: ["iOS", "Swift"], languages: ["English"] },
      job: { title: "iOS Developer", field: "Software", location: "Tel Aviv", mustHaves: ["Swift"], requiredLanguages: ["English"] },
    },
    he: {
      candidate: { desiredRole: "מפתח/ת iOS", field: "הייטק", location: "תל אביב", skills: ["iOS", "Swift"], languages: ["אנגלית"] },
      job: { title: "מפתח iOS", field: "פיתוח תוכנה", location: "תל אביב", mustHaves: ["Swift"], requiredLanguages: ["אנגלית"] },
    },
  },
  {
    id: "p13-waiter-part",
    en: {
      candidate: { desiredRole: "Waiter", field: "Hospitality", location: "Tel Aviv", skills: ["customer service", "English"], languages: ["English"], employmentType: "part-time" },
      job: { title: "Waiter", field: "Hospitality", location: "Tel Aviv", mustHaves: ["customer service"], requiredLanguages: ["English"] },
    },
    he: {
      candidate: { desiredRole: "מלצר", field: "מסעדנות", location: "תל אביב", skills: ["שירות לקוחות", "אנגלית"], languages: ["אנגלית"], employmentType: "משרה חלקית" },
      job: { title: "מלצר", field: "מסעדנות", location: "תל אביב", mustHaves: ["שירות לקוחות"], requiredLanguages: ["אנגלית"] },
    },
  },
  {
    id: "p14-lead-fullstack",
    en: {
      candidate: { desiredRole: "Full Stack Developer", field: "Technology", location: "Tel Aviv", skills: ["React", "Node.js"], experienceLevel: "lead", seniority: "lead" },
      job: { title: "Tech Lead", field: "Technology", location: "Tel Aviv", mustHaves: ["React"], seniorityLevel: "lead", requiredLanguages: ["English"] },
    },
    he: {
      candidate: { desiredRole: "Full Stack", field: "הייטק", location: "תל אביב", skills: ["React", "Node.js"], experienceLevel: "ראש צוות", seniority: "lead" },
      job: { title: "Tech Lead", field: "טכנולוגיה", location: "תל אביב", mustHaves: ["React"], seniorityLevel: "ראש צוות", requiredLanguages: ["אנגלית"] },
    },
  },
  {
    id: "p15-security",
    en: {
      candidate: { desiredRole: "Security Officer", field: "Security", location: "Haifa", skills: ["shift work"], languages: ["Hebrew"] },
      job: { title: "Security Officer", field: "Security", location: "Haifa", mustHaves: ["shift work"], requiredLanguages: ["Hebrew"] },
    },
    he: {
      candidate: { desiredRole: "מאבטח/ת", field: "אבטחה", location: "חיפה", skills: ["משמרות"], languages: ["עברית"] },
      job: { title: "מאבטח/ת", field: "אבטחה", location: "חיפה", mustHaves: ["משמרות"], requiredLanguages: ["עברית"] },
    },
  },
  {
    id: "p16-marketing",
    en: {
      candidate: { desiredRole: "Marketing Manager", field: "Marketing", location: "Tel Aviv", skills: ["digital marketing"], languages: ["Hebrew", "English"] },
      job: { title: "Marketing Manager", field: "Marketing", location: "Tel Aviv", mustHaves: ["digital marketing"], requiredLanguages: ["Hebrew"] },
    },
    he: {
      candidate: { desiredRole: "מנהל/ת שיווק", field: "שיווק", location: "תל אביב", skills: ["שיווק דיגיטלי"], languages: ["עברית", "אנגלית"] },
      job: { title: "מנהל/ת שיווק", field: "שיווק", location: "תל אביב", mustHaves: ["שיווק דיגיטלי"], requiredLanguages: ["עברית"] },
    },
  },
  {
    id: "p17-accountant",
    en: {
      candidate: { desiredRole: "Bookkeeper", field: "Finance", location: "Ramat Gan", skills: ["Excel"], languages: ["Hebrew"] },
      job: { title: "Bookkeeper", field: "Finance", location: "Ramat Gan", mustHaves: ["Excel"], requiredLanguages: ["Hebrew"] },
    },
    he: {
      candidate: { desiredRole: "מנהל/ת חשבונות", field: "כספים", location: "רמת גן", skills: ["Excel"], languages: ["עברית"] },
      job: { title: "מנהל/ת חשבונות", field: "כספים", location: "רמת גן", mustHaves: ["Excel"], requiredLanguages: ["עברית"] },
    },
  },
  {
    id: "p18-nurse",
    en: {
      candidate: { desiredRole: "Caregiver", field: "Healthcare", location: "Jerusalem", skills: ["patient care"], languages: ["Hebrew", "Arabic"] },
      job: { title: "Caregiver", field: "Healthcare", location: "Jerusalem", mustHaves: ["Hebrew"], requiredLanguages: ["Hebrew"] },
    },
    he: {
      candidate: { desiredRole: "מטפל/ת", field: "בריאות", location: "ירושלים", skills: ["טיפול בחולים"], languages: ["עברית", "ערבית"] },
      job: { title: "מטפל/ת", field: "בריאות", location: "ירושלים", mustHaves: ["עברית"], requiredLanguages: ["עברית"] },
    },
  },
  {
    id: "p19-driver",
    en: {
      candidate: { desiredRole: "Delivery Driver", field: "Logistics", location: "Tel Aviv", skills: ["driving license"], languages: ["Hebrew"] },
      job: { title: "Courier", field: "Logistics", location: "Tel Aviv", mustHaves: ["driving license"], requiredLanguages: ["Hebrew"] },
    },
    he: {
      candidate: { desiredRole: "שליח/ה", field: "לוגיסטיקה", location: "תל אביב", skills: ["רישיון נהיגה"], languages: ["עברית"] },
      job: { title: "שליח", field: "לוגיסטיקה", location: "תל אביב", mustHaves: ["רישיון נהיגה"], requiredLanguages: ["עברית"] },
    },
  },
  {
    id: "p20-hr",
    en: {
      candidate: { desiredRole: "HR Coordinator", field: "Human Resources", location: "Herzliya", skills: ["recruitment"], languages: ["Hebrew", "English"] },
      job: { title: "HR Generalist", field: "Human Resources", location: "Herzliya", mustHaves: ["recruitment"], requiredLanguages: ["English"] },
    },
    he: {
      candidate: { desiredRole: "רכז/ת HR", field: "משאבי אנוש", location: "הרצליה", skills: ["גיוס"], languages: ["עברית", "אנגלית"] },
      job: { title: "HR Generalist", field: "משאבי אנוש", location: "הרצליה", mustHaves: ["גיוס"], requiredLanguages: ["אנגלית"] },
    },
  },
];

export function buildVariantCards(
  spec: CrossLangPairSpec,
  variant: LangVariantId,
): { candidate: CandidateCard; job: JobCard } {
  if (variant === "en") {
    return { candidate: cardCandidate(spec.en.candidate), job: cardJob(spec.en.job) };
  }
  if (variant === "he") {
    return { candidate: cardCandidate(spec.he.candidate), job: cardJob(spec.he.job) };
  }
  const idx = Number.parseInt(spec.id.match(/(?:p|h)(\d+)/)?.[1] ?? "0", 10);
  const heJob = idx % 2 === 0;
  if (heJob) {
    return { candidate: cardCandidate(spec.en.candidate), job: cardJob(spec.he.job) };
  }
  return { candidate: cardCandidate(spec.he.candidate), job: cardJob(spec.en.job) };
}
