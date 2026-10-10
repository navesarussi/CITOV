import { lbl } from "./card-helpers";

/** Human-style relevance labels with notes for failure analysis. */
export const seedLabels = [
  // j01 מלצר/ית תל אביב
  lbl("j01", "c01", "good"),
  lbl("j01", "c02", "good", "synonym / english-hebrew role: waiter vs מלצר"),
  lbl("j01", "c03", "acceptable", "location mismatch: רמת גן vs תל אביב"),
  lbl("j01", "c04", "acceptable", "related role: bartender vs waiter"),
  lbl("j01", "c46", "acceptable", "salary mismatch: expects 55 vs 35-45"),
  lbl("j01", "c47", "bad", "must-have skill missing: no Hebrew service fluency listed"),
  lbl("j01", "c32", "bad", "related role wrong domain: chef not waiter"),
  lbl("j01", "c05", "bad", "false positive risk: tech role word overlap minimal"),

  // j02 Waiter Tel Aviv (English job)
  lbl("j02", "c02", "good"),
  lbl("j02", "c01", "good", "synonym / english-hebrew role: מלצר vs Waiter"),
  lbl("j02", "c03", "acceptable", "location mismatch: Ramat Gan"),
  lbl("j02", "c04", "acceptable", "related role: bartender"),
  lbl("j02", "c35", "bad", "wrong field: hotel reception"),

  // j03 Full Stack Ramat Gan
  lbl("j03", "c05", "good"),
  lbl("j03", "c06", "acceptable", "synonym / english-hebrew: software engineer vs מפתח"),
  lbl("j03", "c07", "acceptable", "seniority/salary: junior pay vs mid role"),
  lbl("j03", "c10", "bad", "seniority mismatch: senior frontend vs full stack mid"),
  lbl("j03", "c43", "bad", "must-have skill missing: iOS not web stack"),

  // j04 Software Engineer Herzliya
  lbl("j04", "c06", "good"),
  lbl("j04", "c05", "acceptable", "synonym / english-hebrew: מפתח תוכנה vs Software Engineer"),
  lbl("j04", "c44", "acceptable", "partial stack: Django dev not API-first"),
  lbl("j04", "c09", "bad", "must-have skill missing: no Python"),

  // j05 Senior Backend
  lbl("j05", "c08", "good"),
  lbl("j05", "c48", "acceptable", "seniority mismatch: mid backend not 5+ Java"),
  lbl("j05", "c07", "bad", "seniority mismatch: junior full stack"),
  lbl("j05", "c05", "bad", "must-have skill missing: Java/microservices"),

  // j06 Junior Frontend
  lbl("j06", "c09", "good"),
  lbl("j06", "c10", "bad", "seniority mismatch: senior vs junior title"),
  lbl("j06", "c07", "acceptable", "related role: full stack applying to junior frontend"),

  // j07 Bartender
  lbl("j07", "c04", "good"),
  lbl("j07", "c01", "acceptable", "related role: waiter vs bartender"),
  lbl("j07", "c02", "acceptable", "related role: waiter vs bartender"),
  lbl("j07", "c32", "bad", "wrong role: chef"),

  // j08 נציג שירות חיפה
  lbl("j08", "c11", "good"),
  lbl("j08", "c12", "good", "synonym / english-hebrew: customer support"),
  lbl("j08", "c13", "acceptable", "location mismatch: tel aviv vs haifa"),
  lbl("j08", "c23", "bad", "wrong role: sales not support"),

  // j09 Customer Support Haifa
  lbl("j09", "c12", "good"),
  lbl("j09", "c11", "good", "synonym / english-hebrew"),
  lbl("j09", "c13", "bad", "location mismatch: tel aviv"),

  // j10 forklift Ashdod
  lbl("j10", "c14", "good"),
  lbl("j10", "c15", "bad", "must-have skill missing: no forklift license"),
  lbl("j10", "c36", "acceptable", "related role: logistics manager not operator"),

  // j11 nurse Jerusalem
  lbl("j11", "c16", "good", "hebrew title morphology: אחות מוסמכת vs אח/ות מוסמך/ת"),
  lbl("j11", "c17", "acceptable", "experience: 1y vs 2y required"),
  lbl("j11", "c45", "bad", "wrong field entirely"),

  // j12 Data Analyst remote
  lbl("j12", "c18", "good"),
  lbl("j12", "c19", "acceptable", "synonym / mixed language title"),
  lbl("j12", "c40", "bad", "wrong role: accountant"),

  // j13 DevOps
  lbl("j13", "c20", "good"),
  lbl("j13", "c48", "acceptable", "related role: backend not devops"),
  lbl("j13", "c06", "bad", "must-have skill missing: no Terraform/CI"),

  // j14 English teacher PT
  lbl("j14", "c21", "good"),
  lbl("j14", "c22", "acceptable", "location mismatch: Raanana vs PT"),
  lbl("j14", "c45", "bad", "wrong role: kindergarten assistant"),

  // j15 B2B sales Hebrew
  lbl("j15", "c23", "good"),
  lbl("j15", "c24", "acceptable", "synonym / english-hebrew sales rep"),
  lbl("j15", "c13", "bad", "wrong role: call center not B2B"),

  // j16 Sales Representative English
  lbl("j16", "c24", "good"),
  lbl("j16", "c23", "acceptable", "language: Hebrew-first candidate on English job"),
  lbl("j16", "c13", "bad", "wrong role: call center not B2B sales"),

  // j17 Product Manager
  lbl("j17", "c25", "good"),
  lbl("j17", "c26", "acceptable", "seniority mismatch: junior PM skills"),
  lbl("j17", "c49", "bad", "related role: project manager not product"),

  // j18 UX Designer
  lbl("j18", "c27", "good"),
  lbl("j18", "c28", "acceptable", "synonym / hebrew title מעצב UX"),
  lbl("j18", "c42", "bad", "wrong design discipline: graphic not UX"),

  // j19 QA Beer Sheva
  lbl("j19", "c29", "good"),
  lbl("j19", "c30", "good", "synonym / english QA title"),
  lbl("j19", "c09", "bad", "wrong role: developer not QA"),

  // j20 Cyber
  lbl("j20", "c31", "good"),
  lbl("j20", "c20", "bad", "related role overlap false positive: DevOps not SOC"),

  // j21 Chef
  lbl("j21", "c32", "good"),
  lbl("j21", "c33", "good", "synonym / english Chef"),
  lbl("j21", "c01", "bad", "wrong role: waiter"),

  // j22 hotel reception Eilat
  lbl("j22", "c34", "good"),
  lbl("j22", "c35", "good", "synonym / english hotel receptionist"),
  lbl("j22", "c01", "bad", "location mismatch: tel aviv vs eilat"),

  // j23 logistics manager Haifa
  lbl("j23", "c36", "good"),
  lbl("j23", "c14", "acceptable", "seniority mismatch: operator not manager"),
  lbl("j23", "c15", "bad", "must-have skill missing: no team lead"),

  // j24 call center Beer Sheva
  lbl("j24", "c37", "good"),
  lbl("j24", "c13", "acceptable", "location mismatch: tel aviv"),
  lbl("j24", "c11", "bad", "location mismatch: haifa"),

  // j25 security Tel Aviv
  lbl("j25", "c38", "good"),
  lbl("j25", "c39", "acceptable", "synonym / english security guard"),
  lbl("j25", "c31", "bad", "false positive: cyber analyst not physical security"),

  // j26 Cyber Security Analyst (hi-tech domain + salary hard filter)
  lbl("j26", "c51", "good", "cyber stack + clearance"),
  lbl("j26", "c05", "bad", "must-have missing: SIEM/incident response"),
  lbl("j26", "c52", "bad", "frontend vs cyber analyst"),
  lbl("j03", "c52", "good", "HE JS alias canonicalized to JavaScript + React"),
  lbl("j06", "c52", "acceptable", "seniority: junior job vs mid frontend"),

  // Cross-cutting hard negatives (flexible candidate c50)
  lbl("j03", "c50", "bad", "false positive: generic worker should not match tech"),
  lbl("j01", "c50", "bad", "false positive: unrelated field"),
  lbl("j08", "c50", "bad", "false positive: generic profile not customer service"),
];
