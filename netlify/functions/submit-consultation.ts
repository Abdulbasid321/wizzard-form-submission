import {
  EMAIL_REGEX,
  asObject,
  asString,
  asStringList,
  asYesNo,
  parseFiles,
  type FileItem,
} from "../shared/parse";
import {
  emailShell,
  filesSection,
  glanceStrip,
  joinLines,
  row,
  section,
  textBlock,
  textLine,
} from "../shared/email";
import {
  createSubmitHandler,
  type RenderedEmail,
  type Validation,
} from "../shared/handler";

// Email labels live in one map, so they are easy to change or translate later
const LABELS = {
  title: "New consultation request",
  basicInfo: "Basic information",
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  countryOfResidence: "Country of residence",
  medicalNeed: "Medical need",
  treatment: "Treatment sought",
  diagnosis: "Diagnosis / condition details",
  medicalHistory: "Medical history",
  medications: "Medications",
  allergies: "Allergies",
  travel: "Travel preferences",
  destinations: "Destination(s)",
  timeline: "Treatment timeline",
  preferredHospital: "Preferred hospital / specialist",
  preferredLanguage: "Preferred language",
  companion: "Traveling companion",
  specialRequirements: "Accessibility / special requirements",
  budget: "Budget",
  budgetRange: "Estimated range",
  includesTravel: "Budget includes travel & accommodation",
  fundingSource: "Funding source",
  financingInterest: "Interested in financing",
  budgetNotes: "Additional budget notes",
  files: "Medical files",
  diagnosisFiles: "Diagnosis reports & imaging",
  recordFiles: "Medical records",
};

type Submission = {
  locale: string;
  fullName: string;
  email: string;
  phone: string;
  countryOfResidence: string;
  treatment: string;
  diagnosis: string;
  medicalHistory: string;
  medications: string;
  allergies: string;
  destinations: string[];
  treatmentTimeline: string;
  preferredHospital: string;
  preferredLanguage: string;
  travelingCompanion: string;
  specialRequirements: string;
  budgetRange: string;
  budgetIncludesTravel: string;
  fundingSource: string;
  financingInterest: string;
  budgetNotes: string;
  diagnosisFiles: FileItem[];
  recordFiles: FileItem[];
};

const validate = (raw: Record<string, unknown>): Validation<Submission> => {
  const errors: Record<string, string> = {};

  const basic = asObject(raw.basicInfo);
  const medical = asObject(raw.medical);
  const travel = asObject(raw.travel);
  const budget = asObject(raw.budget);
  const files = asObject(raw.files);

  const data: Submission = {
    locale: asString(raw.locale, 5) === "fr" ? "fr" : "en",
    fullName: asString(basic.fullName, 120),
    email: asString(basic.email, 200),
    phone: asString(basic.phone, 40),
    countryOfResidence: asString(basic.countryOfResidence, 100),
    treatment: asString(medical.treatment, 200),
    diagnosis: asString(medical.diagnosis, 3000),
    medicalHistory: asString(medical.medicalHistory, 3000),
    medications: asString(medical.medications, 1000),
    allergies: asString(medical.allergies, 1000),
    destinations: asStringList(travel.destinations, 5, 100),
    treatmentTimeline: asString(travel.treatmentTimeline, 200),
    preferredHospital: asString(travel.preferredHospital, 200),
    preferredLanguage: asString(travel.language, 100),
    travelingCompanion: asString(travel.travelingCompanion, 200),
    specialRequirements: asString(travel.specialRequirements, 1000),
    budgetRange: asString(budget.range, 100),
    budgetIncludesTravel: asYesNo(budget.includesTravelAccommodation),
    fundingSource: asString(budget.fundingSource, 200),
    financingInterest: asYesNo(budget.financingInterest),
    budgetNotes: asString(budget.notes, 2000),
    diagnosisFiles: parseFiles(files.diagnosisReports, "diagnosisReports", errors),
    recordFiles: parseFiles(files.medicalRecords, "medicalRecords", errors),
  };

  if (!data.fullName) errors["basicInfo.fullName"] = "Full name is required";
  if (!EMAIL_REGEX.test(data.email)) errors["basicInfo.email"] = "Invalid email";
  if (!data.phone) errors["basicInfo.phone"] = "Phone is required";
  if (!data.countryOfResidence)
    errors["basicInfo.countryOfResidence"] = "Country of residence is required";
  if (!data.treatment) errors["medical.treatment"] = "Treatment is required";
  if (data.destinations.length === 0)
    errors["travel.destinations"] = "At least one destination is required";
  if (!data.treatmentTimeline)
    errors["travel.treatmentTimeline"] = "Treatment timeline is required";
  if (!data.budgetRange) errors["budget.range"] = "Budget range is required";

  return { errors, data };
};

const render = (d: Submission, submittedAt: string): RenderedEmail => {
  const destinations = d.destinations.join(", ");
  const subtitle = [destinations, d.treatment].filter(Boolean).join(" · ");
  const preheader = [d.fullName, subtitle].filter(Boolean).join(" · ");

  const body =
    glanceStrip([
      { label: LABELS.destinations, value: destinations },
      { label: LABELS.treatment, value: d.treatment },
      { label: LABELS.budget, value: d.budgetRange },
    ]) +
    section(
      LABELS.basicInfo,
      row(LABELS.fullName, d.fullName) +
        row(LABELS.email, d.email) +
        row(LABELS.phone, d.phone) +
        row(LABELS.countryOfResidence, d.countryOfResidence)
    ) +
    section(
      LABELS.medicalNeed,
      row(LABELS.treatment, d.treatment) +
        textBlock(LABELS.diagnosis, d.diagnosis) +
        textBlock(LABELS.medicalHistory, d.medicalHistory) +
        row(LABELS.medications, d.medications) +
        row(LABELS.allergies, d.allergies)
    ) +
    section(
      LABELS.travel,
      row(LABELS.destinations, destinations) +
        row(LABELS.timeline, d.treatmentTimeline) +
        row(LABELS.preferredHospital, d.preferredHospital) +
        row(LABELS.preferredLanguage, d.preferredLanguage) +
        row(LABELS.companion, d.travelingCompanion) +
        textBlock(LABELS.specialRequirements, d.specialRequirements)
    ) +
    section(
      LABELS.budget,
      row(LABELS.budgetRange, d.budgetRange) +
        row(LABELS.includesTravel, d.budgetIncludesTravel) +
        row(LABELS.fundingSource, d.fundingSource) +
        row(LABELS.financingInterest, d.financingInterest) +
        textBlock(LABELS.budgetNotes, d.budgetNotes)
    ) +
    filesSection(LABELS.files, [
      { title: LABELS.diagnosisFiles, files: d.diagnosisFiles },
      { title: LABELS.recordFiles, files: d.recordFiles },
    ]);

  const html = emailShell({
    pill: LABELS.title,
    heading: d.fullName,
    subtitle,
    preheader,
    contact: { fullName: d.fullName, email: d.email, phone: d.phone },
    body,
    submittedAt,
    locale: d.locale,
  });

  const text = joinLines([
    LABELS.title,
    `Submitted: ${submittedAt}`,
    "",
    textLine(LABELS.fullName, d.fullName),
    textLine(LABELS.email, d.email),
    textLine(LABELS.phone, d.phone),
    textLine(LABELS.countryOfResidence, d.countryOfResidence),
    "",
    textLine(LABELS.treatment, d.treatment),
    textLine(LABELS.diagnosis, d.diagnosis),
    textLine(LABELS.medicalHistory, d.medicalHistory),
    textLine(LABELS.medications, d.medications),
    textLine(LABELS.allergies, d.allergies),
    "",
    textLine(LABELS.destinations, destinations),
    textLine(LABELS.timeline, d.treatmentTimeline),
    textLine(LABELS.preferredHospital, d.preferredHospital),
    textLine(LABELS.preferredLanguage, d.preferredLanguage),
    textLine(LABELS.companion, d.travelingCompanion),
    textLine(LABELS.specialRequirements, d.specialRequirements),
    "",
    textLine(LABELS.budgetRange, d.budgetRange),
    textLine(LABELS.includesTravel, d.budgetIncludesTravel),
    textLine(LABELS.fundingSource, d.fundingSource),
    textLine(LABELS.financingInterest, d.financingInterest),
    textLine(LABELS.budgetNotes, d.budgetNotes),
    "",
    ...d.diagnosisFiles.map((f) => `${LABELS.diagnosisFiles} - ${f.name}: ${f.url}`),
    ...d.recordFiles.map((f) => `${LABELS.recordFiles} - ${f.name}: ${f.url}`),
  ]);

  return {
    subject: `New consultation request: ${d.fullName} (${destinations})`,
    html,
    text,
    replyTo: d.email,
  };
};

export const handler = createSubmitHandler<Submission>({ validate, render });