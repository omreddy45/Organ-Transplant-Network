export type OrganType =
  | "Kidney" | "Liver" | "Heart" | "Lung" | "Pancreas" | "Cornea" | "Bone Marrow" | "Skin";

export type OrganStatus = "available" | "reserved" | "transplanted";
export type TransplantStatus = "pending" | "completed" | "cancelled";
export type DoctorAvailability = "available" | "busy" | "on_leave";

export interface Organ {
  organ_id: number;
  name: OrganType;
  quantity: number;
  availability_status: OrganStatus;
  donor_id: number | null;
  org_id: number;
  organization_name: string;
  location: string;
  blood_type?: string;
}

const orgs = [
  { id: 1, name: "Ruby Hall Clinic", location: "Pune" },
  { id: 2, name: "Sahyadri Hospital", location: "Pune" },
  { id: 3, name: "Deenanath Mangeshkar Hospital", location: "Pune" },
  { id: 4, name: "Jehangir Hospital", location: "Pune" },
  { id: 5, name: "KEM Hospital", location: "Pune" },
];

const organTypes: OrganType[] = [
  "Kidney", "Liver", "Heart", "Lung", "Pancreas", "Cornea", "Bone Marrow", "Skin",
];

const statuses: OrganStatus[] = ["available", "available", "available", "reserved", "transplanted"];
const bloodTypes = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export const mockOrgans: Organ[] = Array.from({ length: 32 }, (_, i) => {
  const org = orgs[i % orgs.length];
  const type = organTypes[i % organTypes.length];
  return {
    organ_id: 1000 + i,
    name: type,
    quantity: 1 + (i % 4),
    availability_status: statuses[i % statuses.length],
    donor_id: 200 + i,
    org_id: org.id,
    organization_name: org.name,
    location: org.location,
    blood_type: bloodTypes[i % bloodTypes.length],
  };
});

export const organCounts = organTypes.reduce<Record<string, number>>((acc, t) => {
  acc[t] = mockOrgans.filter((o) => o.name === t && o.availability_status === "available").length;
  return acc;
}, {});

export const heroStats = [
  { label: "Registered Donors", value: 2400 },
  { label: "Available Organs", value: mockOrgans.filter((o) => o.availability_status === "available").length },
  { label: "Lives Saved", value: 1800 },
  { label: "Partner Hospitals", value: 320 },
];

export const ORGAN_TYPES = organTypes;
export const ORGANIZATIONS = orgs;

// ---------- Doctors ----------
export interface Doctor {
  doctor_id: number;
  name: string;
  specialization: string;
  availability_status: DoctorAvailability;
  org_id: number;
  organization_name: string;
  last_visit?: string;
  phones?: string[];
}

const specializations = ["Nephrology", "Cardiology", "Hepatology", "Pulmonology", "General Surgery", "Ophthalmology", "Hematology"];
const docFirst = ["Aarav", "Vivaan", "Aditya", "Diya", "Anaya", "Kabir", "Reyansh", "Saanvi", "Ishaan", "Myra", "Arjun", "Riya"];
const docLast = ["Sharma", "Patel", "Kumar", "Singh", "Reddy", "Nair", "Iyer", "Mehta", "Gupta", "Rao"];
const docAvail: DoctorAvailability[] = ["available", "available", "busy", "on_leave"];

export const mockDoctors: Doctor[] = Array.from({ length: 14 }, (_, i) => {
  const org = orgs[i % orgs.length];
  return {
    doctor_id: 500 + i,
    name: `Dr. ${docFirst[i % docFirst.length]} ${docLast[i % docLast.length]}`,
    specialization: specializations[i % specializations.length],
    availability_status: docAvail[i % docAvail.length],
    org_id: org.id,
    organization_name: org.name,
    last_visit: `2025-0${(i % 9) + 1}-${String((i % 27) + 1).padStart(2, "0")}`,
    phones: [`+91 9${String(800000000 + i * 12345).slice(0, 9)}`],
  };
});

// ---------- Patients ----------
export interface Patient {
  patient_id: number;
  name: string;
  dob: string;
  city: string;
  state: string;
  street: string;
  medical_insurance: string;
  last_visit: string;
  blood_type: string;
}

const cities = [
  { city: "Delhi", state: "Delhi" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Jaipur", state: "Rajasthan" },
];
const ptFirst = ["Rohan", "Priya", "Ananya", "Karan", "Neha", "Vikram", "Sneha", "Rahul", "Pooja", "Amit", "Kavya", "Nikhil", "Tara", "Yash", "Isha", "Devansh", "Meera", "Siddharth", "Aanya", "Rudra", "Pari", "Ayaan", "Zara", "Krish"];
const ptLast = ["Verma", "Joshi", "Bose", "Kapoor", "Malhotra", "Chopra", "Banerjee", "Pillai", "Desai", "Khanna"];

export const mockPatients: Patient[] = Array.from({ length: 24 }, (_, i) => {
  const c = cities[i % cities.length];
  const year = 1960 + (i * 3) % 45;
  const month = String((i % 12) + 1).padStart(2, "0");
  const day = String((i % 27) + 1).padStart(2, "0");
  return {
    patient_id: 700 + i,
    name: `${ptFirst[i % ptFirst.length]} ${ptLast[i % ptLast.length]}`,
    dob: `${year}-${month}-${day}`,
    city: c.city,
    state: c.state,
    street: `${10 + i} ${["Lotus", "Rose", "Marine", "Park", "Hill", "Lake"][i % 6]} ${["Ave", "Rd", "St", "Ln"][i % 4]}`,
    medical_insurance: `INS-${100000 + i * 137}`,
    last_visit: `2025-${String((i % 10) + 1).padStart(2, "0")}-${String((i % 27) + 1).padStart(2, "0")}`,
    blood_type: bloodTypes[i % bloodTypes.length],
  };
});

// ---------- Transplants ----------
export interface TransplantRecord {
  transplant_id: number;
  transplant_date: string;
  status: TransplantStatus;
  bill_amount: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  organ_id: number;
  organ_name: OrganType;
  org_id: number;
  organization_name: string;
}

const tStatuses: TransplantStatus[] = ["pending", "completed", "completed", "completed", "cancelled"];
export const mockTransplants: TransplantRecord[] = Array.from({ length: 26 }, (_, i) => {
  const p = mockPatients[i % mockPatients.length];
  const d = mockDoctors[i % mockDoctors.length];
  const o = mockOrgans[i % mockOrgans.length];
  const month = String((i % 12) + 1).padStart(2, "0");
  const day = String((i % 27) + 1).padStart(2, "0");
  return {
    transplant_id: 9000 + i,
    transplant_date: `2025-${month}-${day}`,
    status: tStatuses[i % tStatuses.length],
    bill_amount: 250000 + (i * 17500) % 1750000,
    patient_id: p.patient_id,
    patient_name: p.name,
    doctor_id: d.doctor_id,
    doctor_name: d.name,
    organ_id: o.organ_id,
    organ_name: o.name,
    org_id: o.org_id,
    organization_name: o.organization_name,
  };
});

// ---------- Medical history ----------
export interface MedicalRecord {
  history_id: number;
  patient_id: number;
  medical_detail: string;
  record_date: string;
}

const sampleNotes = [
  "Routine check-up. Vitals stable. Blood pressure 120/80.",
  "Pre-transplant evaluation completed. Cleared for surgery.",
  "Reported mild fatigue. Prescribed iron supplements.",
  "Lab results: Creatinine 1.4 mg/dL, slightly elevated.",
  "Vaccination: Hepatitis B booster administered.",
  "Follow-up imaging: kidney function within normal range.",
  "Consultation with nephrologist completed.",
  "Dialysis session #14 — no complications reported.",
];

export const mockMedicalHistory: MedicalRecord[] = Array.from({ length: 7 }, (_, i) => ({
  history_id: 4000 + i,
  patient_id: 700,
  medical_detail: sampleNotes[i % sampleNotes.length],
  record_date: `2025-${String(11 - i).padStart(2, "0")}-${String((i + 3) % 27 + 1).padStart(2, "0")}`,
}));

// ---------- Donor donations ----------
export interface DonorOrgan {
  organ_id: number;
  name: OrganType;
  organization_name: string;
  location: string;
  status: OrganStatus;
  donated_on: string;
}

export const mockDonorOrgans: DonorOrgan[] = [
  { organ_id: 1500, name: "Kidney", organization_name: "AIIMS Delhi", location: "Delhi", status: "available", donated_on: "2025-03-12" },
  { organ_id: 1501, name: "Cornea", organization_name: "Apollo Hospital", location: "Chennai", status: "transplanted", donated_on: "2024-11-04" },
  { organ_id: 1502, name: "Bone Marrow", organization_name: "Fortis Memorial", location: "Mumbai", status: "reserved", donated_on: "2025-06-18" },
];

// ---------- Charts data ----------
export const monthlyTransplants = [
  { month: "Nov", transplants: 18 },
  { month: "Dec", transplants: 24 },
  { month: "Jan", transplants: 22 },
  { month: "Feb", transplants: 31 },
  { month: "Mar", transplants: 28 },
  { month: "Apr", transplants: 36 },
];

export const inventoryMix = ORGAN_TYPES.map((t, i) => ({
  name: t,
  value: 4 + ((i * 7) % 18),
}));

export const donorGrowth = [
  { month: "Nov", donors: 1820 },
  { month: "Dec", donors: 1960 },
  { month: "Jan", donors: 2080 },
  { month: "Feb", donors: 2210 },
  { month: "Mar", donors: 2330 },
  { month: "Apr", donors: 2480 },
];

// ---------- Doctor schedule ----------
export interface ScheduleVisit {
  day: number; // 0=Mon..6=Sun
  hour: number; // 9..17
  patient_name: string;
  kind: "consult" | "surgery" | "follow-up";
}

export const mockSchedule: ScheduleVisit[] = [
  { day: 0, hour: 9, patient_name: "Rohan Verma", kind: "consult" },
  { day: 0, hour: 14, patient_name: "Priya Joshi", kind: "follow-up" },
  { day: 1, hour: 10, patient_name: "Ananya Bose", kind: "surgery" },
  { day: 2, hour: 11, patient_name: "Karan Kapoor", kind: "consult" },
  { day: 2, hour: 15, patient_name: "Neha Malhotra", kind: "follow-up" },
  { day: 3, hour: 9, patient_name: "Vikram Chopra", kind: "surgery" },
  { day: 4, hour: 13, patient_name: "Sneha Banerjee", kind: "consult" },
  { day: 5, hour: 10, patient_name: "Rahul Pillai", kind: "follow-up" },
];
