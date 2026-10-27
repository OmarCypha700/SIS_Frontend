export const STUDENT_STATUS_OPTIONS = [
  "APPLICANT", "ACTIVE", "DEFERRED", "SUSPENDED", "WITHDRAWN", "COMPLETED", "GRADUATED", "DISMISSED",
].map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase() }));

export const SHEET_STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "RETURNED", label: "Returned" },
  { value: "APPROVED", label: "Approved" },
  { value: "PUBLISHED", label: "Published" },
];

export const REGISTRATION_STATUS_OPTIONS = [
  { value: "PENDING", label: "Awaiting approval" },
  { value: "REGISTERED", label: "Registered" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const STANDING_LABELS = { GOOD: "Good standing", PROBATION: "Probation", DISMISS: "Dismissal" };
export const PLACEMENT_LABELS = {
  PROMOTE: "Promote to next level",
  REPEAT: "Repeat level",
  STAY: "No change",
  COMPLETE: "Final level completed",
};
