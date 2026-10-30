import {
  BookOpen, CalendarRange, ClipboardCheck, ClipboardList, FileClock, FilePen, GraduationCap, Layers, LayoutDashboard,
  Library, ListChecks, ScrollText, Settings, ShieldCheck, Building2, UserPlus, Users, UserX, Upload, Scale,
  NotebookPen, BookMarked, RotateCcw, TrendingUp, Gavel, FileBadge, ImagePlus, BadgeCheck, ListPlus,
} from "lucide-react";

/**
 * Navigation per role. This only decides what is shown; every endpoint enforces its own
 * permissions on the server.
 */
const ADMIN = "ADMIN";
const REGISTRAR = "REGISTRAR";
const LECTURER = "LECTURER";
const OFFICER = "RESULTS_OFFICER";
const STUDENT = "STUDENT";
const STAFF = [ADMIN, REGISTRAR, LECTURER, OFFICER];

export const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: [...STAFF, STUDENT] }],
  },
  {
    label: "My studies",
    items: [
      { href: "/registration", label: "Course registration", icon: ClipboardCheck, roles: [STUDENT] },
      { href: "/registration/history", label: "Registration history", icon: FileClock, roles: [STUDENT] },
      { href: "/my-results", label: "My results", icon: GraduationCap, roles: [STUDENT] },
      { href: "/my-results/transcript", label: "Academic record", icon: ScrollText, roles: [STUDENT] },
    ],
  },
  {
    label: "Students",
    items: [
      { href: "/students", label: "Student records", icon: Users, roles: [ADMIN, REGISTRAR, OFFICER] },
      { href: "/students/new", label: "Add student", icon: UserPlus, roles: [ADMIN, REGISTRAR] },
      { href: "/students/import", label: "Import students", icon: Upload, roles: [ADMIN, REGISTRAR] },
      { href: "/students/photos", label: "Import photos", icon: ImagePlus, roles: [ADMIN, REGISTRAR] },
      { href: "/transcripts", label: "Transcripts", icon: FileBadge, roles: [ADMIN, REGISTRAR] },
    ],
  },
  {
    label: "Academics",
    items: [
      { href: "/academics/periods", label: "Years & semesters", icon: CalendarRange, roles: [ADMIN, REGISTRAR] },
      { href: "/academics/departments", label: "Departments", icon: Building2, roles: [ADMIN, REGISTRAR] },
      { href: "/academics/programmes", label: "Programmes", icon: Library, roles: [ADMIN, REGISTRAR] },
      { href: "/academics/levels", label: "Levels", icon: Layers, roles: [ADMIN, REGISTRAR] },
      { href: "/academics/courses", label: "Courses", icon: BookOpen, roles: [ADMIN, REGISTRAR] },
      { href: "/academics/courses/import", label: "Import courses", icon: Upload, roles: [ADMIN] },
      { href: "/academics/offerings", label: "Course offerings", icon: BookMarked, roles: [ADMIN, REGISTRAR] },
    ],
  },
  {
    label: "Registration",
    items: [
      { href: "/registrations", label: "Registrations", icon: ClipboardList, roles: [ADMIN, REGISTRAR] },
      { href: "/registrations/not-registered", label: "Not registered", icon: UserX, roles: [ADMIN, REGISTRAR] },
      { href: "/registrations/on-behalf", label: "Register a student", icon: NotebookPen, roles: [ADMIN, REGISTRAR] },
      { href: "/registrations/bulk", label: "Bulk registration", icon: ListPlus, roles: [ADMIN, REGISTRAR] },
    ],
  },
  {
    label: "Results",
    items: [
      { href: "/results/courses", label: "My courses", icon: BookOpen, roles: [LECTURER] },
      { href: "/results/sheets", label: "Result sheets", icon: ListChecks, roles: [ADMIN, REGISTRAR, OFFICER] },
      { href: "/results/resits", label: "Resits", icon: RotateCcw, roles: [ADMIN, REGISTRAR, OFFICER, LECTURER] },
      { href: "/results/amendments", label: "Amendments", icon: FilePen, roles: [ADMIN, REGISTRAR, OFFICER, LECTURER] },
      { href: "/progression", label: "Progression reviews", icon: TrendingUp, roles: [ADMIN, REGISTRAR, OFFICER] },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/settings/users", label: "Staff accounts", icon: ShieldCheck, roles: [ADMIN] },
      { href: "/settings/users/import", label: "Import staff", icon: Upload, roles: [ADMIN] },
      { href: "/settings/appointments", label: "Appointments", icon: BadgeCheck, roles: [ADMIN] },
      { href: "/settings/grading", label: "Grading schemes", icon: Scale, roles: [ADMIN] },
      { href: "/settings/regulations", label: "Academic regulations", icon: Gavel, roles: [ADMIN, REGISTRAR, OFFICER] },
      { href: "/settings/institution", label: "Institution settings", icon: Settings, roles: [ADMIN] },
      { href: "/audit", label: "Audit log", icon: ScrollText, roles: [ADMIN, REGISTRAR, OFFICER] },
    ],
  },
];

/** Items for everything the person can act as now (see `user.roles`). */
export function navForUser(user) {
  const held = user.roles?.length ? user.roles : [user.role];
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.some((role) => held.includes(role))),
  })).filter((section) => section.items.length > 0);
}

/** Breadcrumb labels for path segments. */
export const SEGMENT_LABELS = {
  dashboard: "Dashboard",
  students: "Students",
  new: "New",
  edit: "Edit",
  import: "Import",
  academics: "Academics",
  periods: "Years & semesters",
  departments: "Departments",
  programmes: "Programmes",
  levels: "Levels",
  courses: "Courses",
  offerings: "Offerings",
  registration: "Registration",
  registrations: "Registrations",
  history: "History",
  slip: "Slip",
  "not-registered": "Not registered",
  "on-behalf": "Register a student",
  bulk: "Bulk registration",
  results: "Results",
  sheets: "Result sheets",
  amendments: "Amendments",
  "my-results": "My results",
  transcript: "Academic record",
  settings: "Settings",
  users: "Staff accounts",
  appointments: "Appointments",
  grading: "Grading schemes",
  institution: "Institution",
  audit: "Audit log",
  profile: "My account",
  "class-lists": "Class list",
  resits: "Resits",
  progression: "Progression reviews",
  regulations: "Academic regulations",
};
