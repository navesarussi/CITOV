/** Allow-list for CV Pass B inference keys (M3). */
export const CV_INFERENCE_FIELD_KEYS = new Set([
  "managementExperience",
  "teamSizeManaged",
  "experienceLevel",
  "industryExperience",
  "personality",
  "workStyle",
  "customerFacingOk",
  "experienceYears",
  "desiredRole",
  "field",
  "location",
  "skills",
  "softSkills",
  "languages",
  "hebrewLevel",
  "englishLevel",
  "summary",
  "salaryMin",
  "salaryMax",
  "flexibility",
]);

export const JOB_INFERENCE_FIELD_KEYS = new Set([
  "title",
  "field",
  "location",
  "mustHaves",
  "niceToHaves",
  "requiredLanguages",
  "summary",
  "toolsRequired",
  "salaryMin",
  "salaryMax",
  "flexibility",
]);

export function isAllowedCvInferenceFieldKey(fieldKey: string): boolean {
  const k = fieldKey.trim();
  if (!k || k.includes(" ") || k.length > 64) return false;
  return CV_INFERENCE_FIELD_KEYS.has(k);
}
