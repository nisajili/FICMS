/* eslint-disable no-console */
/**
 * Development seed. Synthetic demonstration data ONLY – never real patient data.
 * Creates a demo clinic organisation with staff users, patients, appointments,
 * cycles, lab orders, and billing records.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from '@node-rs/argon2';

const prisma = new PrismaClient();

const hash = (pw: string) =>
  argon2.hash(pw, { algorithm: argon2.Algorithm.Argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });

function rand(l: number, h: number) {
  return Math.floor(Math.random() * (h - l + 1)) + l;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY_MS);

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-clinic' },
    create: {
      name: 'Demo Fertility Clinic',
      slug: 'demo-clinic',
      domain: 'demo.example.com',
      status: 'ACTIVE',
      settings: {
        create: [
          { key: 'CLINIC_NAME', value: 'Demo Fertility Clinic' },
          { key: 'COUNTRY', value: '' },
          { key: 'CURRENCY', value: 'USD' },
          { key: 'TIMEZONE', value: 'UTC' },
          { key: 'PRIMARY_LANGUAGE', value: 'en' },
          { key: 'PRIMARY_COLOR', value: '#0f766e' },
        ],
      },
    },
    update: {},
  });

  const facility = await prisma.facility.upsert({
    where: { organizationId_code: { organizationId: org.id, code: 'MAIN' } },
    create: { organizationId: org.id, name: 'Main Clinic', code: 'MAIN', status: 'ACTIVE', timezone: 'UTC' },
    update: {},
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.example' },
    create: {
      email: 'admin@demo.example',
      name: 'Demo Administrator',
      role: 'org_owner',
      passwordHash: await hash('Demo@2026!'),
      status: 'ACTIVE',
      organizationId: org.id,
      facilityId: facility.id,
    },
    update: {},
  });

  // A fertility specialist.
  const specialist = await prisma.user.upsert({
    where: { email: 'doctor@demo.example' },
    create: {
      email: 'doctor@demo.example',
      name: 'Dr. Demo Specialist',
      role: 'fertility_specialist',
      passwordHash: await hash('Demo@2026!'),
      status: 'ACTIVE',
      organizationId: org.id,
      facilityId: facility.id,
    },
    update: {},
  });

  // Patients
  let mrnCounter = 1000;
  const makePatient = async (given: string, family: string, female: boolean, dob: Date) => {
    const mrn = `MRN-${String(mrnCounter++).padStart(5, '0')}`;
    return prisma.patient.create({
      data: {
        organizationId: org.id,
        medicalRecordNumber: mrn,
        givenName: given,
        familyName: family,
        dateOfBirth: dob,
        sex: female ? 'FEMALE' : 'MALE',
        email: `${given}.${family}@example.test`.toLowerCase(),
        phone: `+1-555-0${rand(100, 999)}`,
        status: 'ACTIVE',
      },
    });
  };

  const patients = [];
  const names: [string, string][] = [
    ['Amelia', 'Reed'],
    ['Noah', 'Bennett'],
    ['Olivia', 'Marsh'],
    ['Liam', 'Cole'],
    ['Sophia', 'Hayes'],
    ['Mason', 'Floyd'],
    ['Isabella', 'Curtis'],
    ['Ethan', 'Price'],
  ];
  for (const [g, f] of names) {
    patients.push(await makePatient(g, f, rand(0, 1) === 0, daysAgo(rand(5840, 14600))));
  }

  // Link a couple (patient 0 & patient 1 as partners).
  if (patients.length >= 2) {
    await prisma.partner.upsert({
      where: { patientId_partnerId: { patientId: patients[0]!.id, partnerId: patients[1]!.id } },
      create: { organizationId: org.id, patientId: patients[0]!.id, partnerId: patients[1]!.id, relationshipType: 'partner' },
      update: {},
    });
  }

  // Appointments
  const apptC = patients[0]!;
  await prisma.appointment.createMany({
    data: [
      { organizationId: org.id, code: `APT-${rand(1000, 9999)}`, facilityId: facility.id, patientId: apptC.id, practitionerId: specialist.id, scheduledStart: daysAhead(0), scheduledEnd: new Date(Date.now() + 60 * 60 * 1000), status: 'SCHEDULED', serviceType: 'Consultation', queueNumber: 'A-01' },
      { organizationId: org.id, code: `APT-${rand(1000, 9999)}`, facilityId: facility.id, patientId: patients[2]!.id, practitionerId: specialist.id, scheduledStart: daysAhead(1), scheduledEnd: new Date(Date.now() + DAY_MS + 60 * 60 * 1000), status: 'SCHEDULED', serviceType: 'Ultrasound' },
    ],
  });

  // A cycle for the couple
  const cycle = await prisma.cycle.create({
    data: {
      organizationId: org.id,
      patientId: apptC.id,
      partnerId: patients[1]!.id,
      cycleNumber: `CY-${rand(1000, 9999)}`,
      treatmentType: 'IVF',
      protocolTemplate: 'Antagonist',
      diagnosis: 'Primary infertility',
      status: 'STIMULATION',
      startDate: daysAgo(7),
      events: {
        create: [
          { organizationId: org.id, eventType: 'baseline', title: 'Baseline scan', scheduledAt: daysAgo(7) },
          { organizationId: org.id, eventType: 'trigger', title: 'Trigger injection', scheduledAt: daysAhead(3) },
          { organizationId: org.id, eventType: 'retrieval', title: 'Egg retrieval', scheduledAt: daysAhead(5) },
        ],
      },
    },
  });

  // Lab order for patient 0
  const labOrder = await prisma.labOrder.create({
    data: {
      organizationId: org.id,
      patientId: apptC.id,
      orderNumber: `LAB-${rand(1000, 9999)}`,
      status: 'REQUESTED',
      orderedById: specialist.id,
      priority: 'routine',
    },
  });
  await prisma.labResult.create({
    data: {
      organizationId: org.id,
      labOrderId: labOrder.id,
      testName: 'AMH',
      value: '2.4',
      unit: 'ng/mL',
      referenceLow: '1.0',
      referenceHigh: '5.0',
      status: 'result',
      enteredById: specialist.id,
    },
  });

  // Cryotank + positions + a stored embryo
  const tank = await prisma.cryoTank.create({
    data: { organizationId: org.id, facilityId: facility.id, name: 'Tank-A', label: 'Tank A', capacity: 100, alarmLowC: -196, alarmHighC: -180, status: 'active' },
  });
  const pos = await prisma.cryoPosition.create({
    data: { organizationId: org.id, tankId: tank.id, canister: '1', cane: 'A', goblet: '1', rack: '1', position: '1', label: '1-1-1' },
  });
  await prisma.cryoStorageItem.create({
    data: {
      organizationId: org.id,
      positionId: pos.id,
      patientId: apptC.id,
      cycleId: cycle.id,
      type: 'EMBRYO',
      label: 'Embryo-Day5-4AA',
      status: 'STORED',
      frozenAt: daysAgo(2),
      renewalDate: daysAhead(365),
      storedById: admin.id,
    },
  });

  // Invoice + payment
  const invoice = await prisma.invoice.create({
    data: {
      organizationId: org.id,
      patientId: apptC.id,
      invoiceNumber: `INV-${rand(1000, 9999)}`,
      status: 'ISSUED',
      currency: 'USD',
      subtotal: 1500,
      taxTotal: 0,
      total: 1500,
      amountPaid: 0,
      amountDue: 1500,
      version: 1,
    },
  });

  console.log('Seed complete.');
  console.log(`Org slug : demo-clinic`);
  console.log(`Admin     : admin@demo.example / Demo@2026!`);
  console.log(`Doctor    : doctor@demo.example / Demo@2026!`);
  console.log(`Patients  : ${patients.length} synthetic`);
  console.log(`Cycle     : ${cycle.cycleNumber}`);
  console.log(`Invoice   : ${invoice.invoiceNumber} (${invoice.amountDue} ${invoice.currency} due)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
