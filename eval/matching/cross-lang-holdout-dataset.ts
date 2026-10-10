import type { CrossLangPairSpec } from "./cross-lang-dataset";

/**
 * Frozen holdout — 15 logical pairs authored without consulting alias tables.
 * Do not tune ROLE/SKILL/LOCATION aliases to improve this set.
 */
export const CROSS_LANG_HOLDOUT_PAIRS: CrossLangPairSpec[] = [
  {
    id: "h01-fullstack-typo",
    en: {
      candidate: {
        desiredRole: "Full Stack Engineer",
        field: "Software",
        location: "Ramat Gan",
        skills: ["JavaScript", "Node", "React"],
        languages: ["English"],
        salaryExpectation: "28-32K NIS/month",
      },
      job: {
        title: "Full Stack Developer",
        field: "Software",
        location: "Ramat Gan",
        mustHaves: ["React", "Node.js"],
        requiredLanguages: ["English"],
        salaryRange: "26K-34K monthly",
      },
    },
    he: {
      candidate: {
        desiredRole: "מפתח פולסטאק",
        field: "תוכנה",
        location: 'ר"ג',
        skills: ["ג׳avascript", "Node", "ריאקט"],
        languages: ["אנגלית"],
        salaryExpectation: "28-32 אלף ברוטו",
      },
      job: {
        title: "מפתח Fullstack",
        field: "תוכנה",
        location: "רמת גן",
        mustHaves: ["ריאקט", "Node"],
        requiredLanguages: ["אנגלית"],
        salaryRange: "26-34 אלף לחודש",
      },
    },
  },
  {
    id: "h02-devops-slang",
    en: {
      candidate: {
        desiredRole: "DevOps Engineer",
        field: "Technology",
        location: "Tel Aviv",
        skills: ["Kubernetes", "Terraform", "CI/CD"],
        languages: ["English", "Hebrew"],
      },
      job: {
        title: "Platform Engineer",
        field: "Tech",
        location: "Tel Aviv",
        mustHaves: ["Kubernetes", "AWS"],
        requiredLanguages: ["English"],
      },
    },
    he: {
      candidate: {
        desiredRole: "דבאופס",
        field: "הייטק",
        location: "ת״א",
        skills: ["קוברנטיס", "Terraform", "CI/CD"],
        languages: ["אנגלית", "עברית"],
      },
      job: {
        title: "מהנדס פלטפורמה",
        field: "הייטק",
        location: "תל אביב",
        mustHaves: ["Kubernetes", "AWS"],
        requiredLanguages: ["אנגלית"],
      },
    },
  },
  {
    id: "h03-qa-manual",
    en: {
      candidate: {
        desiredRole: "Manual QA Tester",
        field: "Quality",
        location: "Petah Tikva",
        skills: ["test cases", "Jira"],
        languages: ["Hebrew"],
      },
      job: {
        title: "QA Analyst",
        field: "Software QA",
        location: "Petah Tikva",
        mustHaves: ["manual testing"],
        requiredLanguages: ["Hebrew"],
      },
    },
    he: {
      candidate: {
        desiredRole: "בודק/ת ידני",
        field: "איכות",
        location: "פתח תקווה",
        skills: ["תסריטי בדיקה", "Jira"],
        languages: ["עברית"],
      },
      job: {
        title: "אנליסט QA",
        field: "בדיקות תוכנה",
        location: "פת״ת",
        mustHaves: ["בדיקות ידניות"],
        requiredLanguages: ["עברית"],
      },
    },
  },
  {
    id: "h04-data-analyst",
    en: {
      candidate: {
        desiredRole: "Data Analyst",
        field: "Analytics",
        location: "Herzliya",
        skills: ["SQL", "Excel", "Power BI"],
        languages: ["English"],
        salaryMin: "18K",
        salaryMax: "22K",
      },
      job: {
        title: "BI Analyst",
        field: "Data",
        location: "Herzliya",
        mustHaves: ["SQL"],
        requiredLanguages: ["English"],
        salaryMin: "17000",
        salaryMax: "23000",
      },
    },
    he: {
      candidate: {
        desiredRole: "אנליסט נתונים",
        field: "אנליטיקה",
        location: "הרצליה",
        skills: ["SQL", "אקסל", "Power BI"],
        languages: ["אנגלית"],
        salaryMin: "18 אלף",
        salaryMax: "22K",
      },
      job: {
        title: "אנליסט BI",
        field: "דאטה",
        location: "הרצליה",
        mustHaves: ["SQL"],
        requiredLanguages: ["אנגלית"],
        salaryMin: "17,000",
        salaryMax: "23 אלף",
      },
    },
  },
  {
    id: "h05-cyber-soc",
    en: {
      candidate: {
        desiredRole: "SOC Analyst",
        field: "Cyber",
        location: "Beersheba",
        skills: ["SIEM", "incident response"],
        languages: ["Hebrew", "English"],
      },
      job: {
        title: "Security Operations Analyst",
        field: "Cybersecurity",
        location: "Be'er Sheva",
        mustHaves: ["SIEM"],
        requiredLanguages: ["Hebrew"],
      },
    },
    he: {
      candidate: {
        desiredRole: "אnalist SOC",
        field: "סייבר",
        location: "באר שבע",
        skills: ["SIEM", "תגובה לאירועים"],
        languages: ["עברית", "אנגלית"],
      },
      job: {
        title: "אnalist תפעול אבטחה",
        field: "אבטחת מידע",
        location: "ב״ש",
        mustHaves: ["SIEM"],
        requiredLanguages: ["עברית"],
      },
    },
  },
  {
    id: "h06-android-kotlin",
    en: {
      candidate: {
        desiredRole: "Android Developer",
        field: "Mobile",
        location: "Holon",
        skills: ["Kotlin", "Jetpack"],
        languages: ["Russian", "Hebrew"],
      },
      job: {
        title: "Mobile Developer (Android)",
        field: "Mobile",
        location: "Holon",
        mustHaves: ["Kotlin"],
        requiredLanguages: ["Hebrew"],
      },
    },
    he: {
      candidate: {
        desiredRole: "מפתח אנדרואיד",
        field: "מובייל",
        location: "חולון",
        skills: ["קotlin", "Jetpack"],
        languages: ["רוסית", "עברית"],
      },
      job: {
        title: "מפתח מובייל אנדרואיד",
        field: "מובייל",
        location: "חולון",
        mustHaves: ["Kotlin"],
        requiredLanguages: ["עברית"],
      },
    },
  },
  {
    id: "h07-product-owner",
    en: {
      candidate: {
        desiredRole: "Product Owner",
        field: "Product",
        location: "Ra'anana",
        skills: ["Agile", "backlog"],
        languages: ["English"],
        personality: "collaborative, direct communicator",
      },
      job: {
        title: "Product Manager",
        field: "Product",
        location: "Raanana",
        mustHaves: ["Agile"],
        requiredLanguages: ["English"],
        personalityFit: "team player, fast-paced",
        teamCulture: "startup vibe",
      },
    },
    he: {
      candidate: {
        desiredRole: "Product Owner",
        field: "מוצר",
        location: "רענana",
        skills: ["אgile", "באקלוג"],
        languages: ["אנגלית"],
        personality: "שיתופי, תקשורת ישירה",
        workStyle: "עצמאי",
      },
      job: {
        title: "מנהל/ת מוצר",
        field: "מוצר",
        location: "רעננה",
        mustHaves: ["Agile"],
        requiredLanguages: ["אנגלית"],
        personalityFit: "עובד/ת צוות, קצב מהיר",
        teamCulture: "אווירת סטארטאפ",
      },
    },
  },
  {
    id: "h08-accountant-yearly",
    en: {
      candidate: {
        desiredRole: "Bookkeeper",
        field: "Finance",
        location: "Netanya",
        skills: ["Priority", "Excel"],
        languages: ["Hebrew"],
        salaryExpectation: "180,000 NIS per year",
      },
      job: {
        title: "Junior Accountant",
        field: "Accounting",
        location: "Netanya",
        mustHaves: ["Priority"],
        requiredLanguages: ["Hebrew"],
        salaryRange: "14-16K gross/month",
      },
    },
    he: {
      candidate: {
        desiredRole: "מנהל/ת חשבונות",
        field: "כספים",
        location: "נתניה",
        skills: ["פריוריטי", "אקסל"],
        languages: ["עברית"],
        salaryExpectation: "180 אלף לשנה ברוטו",
      },
      job: {
        title: "רואה חשבון זוטר",
        field: "הנהלת חשבונות",
        location: "נתניה",
        mustHaves: ["פריוריטי"],
        requiredLanguages: ["עברית"],
        salaryRange: "14-16 אלף לחודש",
      },
    },
  },
  {
    id: "h09-nurse-clinic",
    en: {
      candidate: {
        desiredRole: "Registered Nurse",
        field: "Healthcare",
        location: "Ashdod",
        skills: ["patient care", "triage"],
        languages: ["Hebrew", "Arabic"],
      },
      job: {
        title: "Clinic Nurse",
        field: "Medical",
        location: "Ashdod",
        mustHaves: ["nursing license"],
        requiredLanguages: ["Hebrew"],
      },
    },
    he: {
      candidate: {
        desiredRole: "אח/ות מוסמך/ת",
        field: "בריאות",
        location: "אשדod",
        skills: ["טיפול בחולים", "מיון"],
        languages: ["עברית", "ערבית"],
      },
      job: {
        title: "אח/ות במרפאה",
        field: "רפואה",
        location: "אשדוד",
        mustHaves: ["רישיון סיעוד"],
        requiredLanguages: ["עברית"],
      },
    },
  },
  {
    id: "h10-sales-b2b",
    en: {
      candidate: {
        desiredRole: "B2B Sales Rep",
        field: "Sales",
        location: "Kfar Saba",
        skills: ["CRM", "cold calling"],
        languages: ["Hebrew", "English"],
      },
      job: {
        title: "Account Executive",
        field: "Sales",
        location: "Kfar Saba",
        mustHaves: ["B2B sales"],
        requiredLanguages: ["Hebrew"],
      },
    },
    he: {
      candidate: {
        desiredRole: "נציג מכירות B2B",
        field: "מכירות",
        location: "כפר סבא",
        skills: ["CRM", "cold calls"],
        languages: ["עברית", "אנגלית"],
      },
      job: {
        title: "Account Executive",
        field: "מכירות",
        location: "כ״ס",
        mustHaves: ["מכירות B2B"],
        requiredLanguages: ["עברית"],
      },
    },
  },
  {
    id: "h11-graphic-ui",
    en: {
      candidate: {
        desiredRole: "Graphic Designer",
        field: "Design",
        location: "Tel Aviv",
        skills: ["Figma", "Adobe CC"],
        languages: ["Hebrew"],
      },
      job: {
        title: "UI Designer",
        field: "Creative",
        location: "Tel Aviv",
        mustHaves: ["Figma"],
        requiredLanguages: ["Hebrew"],
      },
    },
    he: {
      candidate: {
        desiredRole: "מעצב/ת גרפי",
        field: "עיצוב",
        location: "TLV",
        skills: ["פigma", "Adobe"],
        languages: ["עברית"],
      },
      job: {
        title: "מעצב/ת UI",
        field: "קריאייטיב",
        location: "תל אביב",
        mustHaves: ["Figma"],
        requiredLanguages: ["עברית"],
      },
    },
  },
  {
    id: "h12-electrician",
    en: {
      candidate: {
        desiredRole: "Electrician",
        field: "Trades",
        location: "Haifa",
        skills: ["low voltage", "safety"],
        languages: ["Hebrew"],
      },
      job: {
        title: "Maintenance Electrician",
        field: "Facilities",
        location: "Haifa",
        mustHaves: ["electrician license"],
        requiredLanguages: ["Hebrew"],
      },
    },
    he: {
      candidate: {
        desiredRole: "חשמלאי",
        field: "מקצועות",
        location: "חיפה",
        skills: ["מתח נמוך", "בטיחות"],
        languages: ["עברית"],
      },
      job: {
        title: "חשמלאי אחזקה",
        field: "מתקנים",
        location: "חיפה",
        mustHaves: ["רישיון חשמלאי"],
        requiredLanguages: ["עברית"],
      },
    },
  },
  {
    id: "h13-content-seo",
    en: {
      candidate: {
        desiredRole: "Content Writer",
        field: "Marketing",
        location: "Jerusalem",
        skills: ["SEO", "Hebrew copy"],
        languages: ["Hebrew", "English"],
      },
      job: {
        title: "Marketing Content Specialist",
        field: "Marketing",
        location: "Jerusalem",
        mustHaves: ["SEO"],
        requiredLanguages: ["Hebrew"],
      },
    },
    he: {
      candidate: {
        desiredRole: "כותב/ת תוכן",
        field: "שיווק",
        location: "ירושלים",
        skills: ["SEO", "קופי בעברית"],
        languages: ["עברית", "אנגלית"],
      },
      job: {
        title: "מומחה/ית תוכן שיווקי",
        field: "שיווק",
        location: "JLM",
        mustHaves: ["SEO"],
        requiredLanguages: ["עברית"],
      },
    },
  },
  {
    id: "h14-warehouse-logistics",
    en: {
      candidate: {
        desiredRole: "Warehouse Worker",
        field: "Logistics",
        location: "Lod",
        skills: ["forklift", "WMS"],
        languages: ["Hebrew"],
      },
      job: {
        title: "Logistics Associate",
        field: "Supply Chain",
        location: "Lod",
        mustHaves: ["forklift license"],
        requiredLanguages: ["Hebrew"],
      },
    },
    he: {
      candidate: {
        desiredRole: "עובד/ת מחסן",
        field: "לוגיסטיקה",
        location: "לod",
        skills: ["מלגזה", "WMS"],
        languages: ["עברית"],
      },
      job: {
        title: "עובד/ת לוגיסטיקה",
        field: "שרשרת אספקה",
        location: "לוד",
        mustHaves: ["רישיון מלגזה"],
        requiredLanguages: ["עברית"],
      },
    },
  },
  {
    id: "h15-barista-shift",
    en: {
      candidate: {
        desiredRole: "Barista",
        field: "Coffee",
        location: "Eilat",
        skills: ["espresso", "cash register"],
        languages: ["Hebrew", "English"],
        salaryExpectation: "45 NIS/hour",
      },
      job: {
        title: "Cafe Barista",
        field: "Hospitality",
        location: "Eilat",
        mustHaves: ["espresso"],
        requiredLanguages: ["Hebrew"],
        salaryRange: "7000-8500 monthly",
      },
    },
    he: {
      candidate: {
        desiredRole: "ברista",
        field: "קפה",
        location: "אילת",
        skills: ["אספרesso", "קופה"],
        languages: ["עברית", "אנגלית"],
        salaryExpectation: "45 ש״ח לשעה",
      },
      job: {
        title: "ברista בבית קפה",
        field: "אירוח",
        location: "אילת",
        mustHaves: ["אספרesso"],
        requiredLanguages: ["עברית"],
        salaryRange: "7-8.5 אלף לחודש",
      },
    },
  },
];
