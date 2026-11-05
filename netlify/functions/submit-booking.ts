import { EMAIL_REGEX, asString } from "../shared/parse";
import {
  emailShell,
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
  title: "New consultation booking",
  contact: "Contact details",
  fullName: "Full name",
  email: "Email",
  phone: "Phone",
  date: "Preferred date",
  time: "Preferred time",
  method: "Consultation method",
  discussion: "What they would like to discuss",
};

type Booking = {
  locale: string;
  fullName: string;
  email: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  consultationMethod: string;
  discussion: string;
};

const validate = (raw: Record<string, unknown>): Validation<Booking> => {
  const errors: Record<string, string> = {};

  const data: Booking = {
    locale: asString(raw.locale, 5) === "fr" ? "fr" : "en",
    fullName: asString(raw.fullName, 120),
    email: asString(raw.email, 200),
    phone: asString(raw.phone, 40),
    preferredDate: asString(raw.preferredDate, 100),
    preferredTime: asString(raw.preferredTime, 100),
    consultationMethod: asString(raw.consultationMethod, 100),
    discussion: asString(raw.discussion, 3000),
  };

  if (!data.fullName) errors["fullName"] = "Full name is required";
  if (!EMAIL_REGEX.test(data.email)) errors["email"] = "Invalid email";
  if (!data.phone) errors["phone"] = "Phone is required";
  if (!data.preferredDate) errors["preferredDate"] = "Preferred date is required";
  if (!data.preferredTime) errors["preferredTime"] = "Preferred time is required";
  if (!data.consultationMethod)
    errors["consultationMethod"] = "Consultation method is required";

  return { errors, data };
};

const render = (d: Booking, submittedAt: string): RenderedEmail => {
  const when = [d.preferredDate, d.preferredTime].filter(Boolean).join(" · ");
  const subtitle = [when, d.consultationMethod].filter(Boolean).join(" · ");

  const body =
    glanceStrip([
      { label: LABELS.date, value: d.preferredDate },
      { label: LABELS.time, value: d.preferredTime },
      { label: LABELS.method, value: d.consultationMethod },
    ]) +
    section(
      LABELS.contact,
      row(LABELS.fullName, d.fullName) +
        row(LABELS.email, d.email) +
        row(LABELS.phone, d.phone)
    ) +
    section(LABELS.discussion, textBlock(LABELS.discussion, d.discussion));

  const html = emailShell({
    pill: LABELS.title,
    heading: d.fullName,
    subtitle,
    preheader: [d.fullName, subtitle].filter(Boolean).join(" · "),
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
    "",
    textLine(LABELS.date, d.preferredDate),
    textLine(LABELS.time, d.preferredTime),
    textLine(LABELS.method, d.consultationMethod),
    textLine(LABELS.discussion, d.discussion),
  ]);

  return {
    subject: `New consultation booking: ${d.fullName} (${when})`,
    html,
    text,
    replyTo: d.email,
  };
};

export const handler = createSubmitHandler<Booking>({ validate, render });
