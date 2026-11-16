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

const LABELS = {
  title: "New contact message",
  contact: "Contact details",
  fullName: "Name",
  email: "Email",
  phone: "Phone",
  message: "Message",
};

// Allows + ( ) - . and spaces, 7 to 20 characters
const PHONE_REGEX = /^\+?[\d\s().-]{7,20}$/;

type ContactMessage = {
  locale: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
};

const validate = (raw: Record<string, unknown>): Validation<ContactMessage> => {
  const errors: Record<string, string> = {};

  const contact = asString(raw.contact, 200);
  const isEmail = EMAIL_REGEX.test(contact);
  const isPhone = !isEmail && PHONE_REGEX.test(contact);

  const data: ContactMessage = {
    locale: asString(raw.locale, 5) === "fr" ? "fr" : "en",
    firstName: asString(raw.firstName, 80),
    lastName: asString(raw.lastName, 80),
    email: isEmail ? contact : "",
    phone: isPhone ? contact : "",
    message: asString(raw.message, 3000),
  };

  if (!data.firstName) errors["firstName"] = "First name is required";
  if (!data.lastName) errors["lastName"] = "Last name is required";
  if (!contact) errors["contact"] = "Email or phone is required";
  else if (!isEmail && !isPhone)
    errors["contact"] = "Enter a valid email or phone number";
  if (!data.message) errors["message"] = "Message is required";

  return { errors, data };
};

const render = (d: ContactMessage, submittedAt: string): RenderedEmail => {
  const fullName = `${d.firstName} ${d.lastName}`.trim();
  const reach = d.email || d.phone;

  const body =
    glanceStrip([
      { label: LABELS.fullName, value: fullName },
      { label: d.email ? LABELS.email : LABELS.phone, value: reach },
    ]) +
    section(
      LABELS.contact,
      row(LABELS.fullName, fullName) +
        row(LABELS.email, d.email) +
        row(LABELS.phone, d.phone)
    ) +
    section(LABELS.message, textBlock(LABELS.message, d.message));

  const html = emailShell({
    pill: LABELS.title,
    heading: fullName,
    subtitle: reach,
    preheader: [fullName, reach].filter(Boolean).join(" · "),
    // For phone-only messages, the Reply button points to the client's own
    // inbox (harmless) and the Call button does the real work.
    contact: {
      fullName,
      email: d.email || process.env.CLIENT_EMAIL || "",
      phone: d.phone,
    },
    body,
    submittedAt,
    locale: d.locale,
  });

  const text = joinLines([
    LABELS.title,
    `Submitted: ${submittedAt}`,
    "",
    textLine(LABELS.fullName, fullName),
    textLine(LABELS.email, d.email),
    textLine(LABELS.phone, d.phone),
    "",
    textLine(LABELS.message, d.message),
  ]);

  return {
    subject: `New contact message: ${fullName}`,
    html,
    text,
    replyTo: d.email || undefined,
  };
};

export const handler = createSubmitHandler<ContactMessage>({ validate, render });