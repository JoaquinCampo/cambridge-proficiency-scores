import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// --- Config --------------------------------------------------------------- //

const ORG_ID = "org_39ZehHaR64NClXqsMnn9MEjjeJy";
const TEACHER_CLERK_ID = "user_39ZegHLtfQXfJcprQTQylQExlt8";
const REAL_STUDENT_CLERK_ID = "user_39a1nmYqwoTxjw3Qto3HUUOPnhM";
const NUM_STUDENTS = 25;
const SCORES_PER_STUDENT = { min: 4, max: 12 };

// --- Helpers -------------------------------------------------------------- //

const rng = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const rngFloat = (min: number, max: number, step = 0.5) => {
  const steps = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * (steps + 1)) * step;
};

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

const maybe = <T>(value: T, chance = 0.85): T | null =>
  Math.random() < chance ? value : null;

// Realistic raw score ranges per skill level
type Level = "weak" | "average" | "strong";

const ranges: Record<Level, Record<string, [number, number]>> = {
  weak: {
    reading: [10, 22],
    useOfEnglish: [6, 13],
    writing: [8, 16],
    listening: [8, 14],
    speaking: [15, 30],
  },
  average: {
    reading: [20, 32],
    useOfEnglish: [12, 20],
    writing: [15, 28],
    listening: [13, 22],
    speaking: [28, 52],
  },
  strong: {
    reading: [28, 42],
    useOfEnglish: [17, 26],
    writing: [24, 38],
    listening: [18, 28],
    speaking: [45, 70],
  },
};

// Students get a base level, with slight improvement over time
function generateRawScore(
  component: string,
  level: Level,
  progressBonus: number,
): number {
  const [min, max] = ranges[level][component]!;
  const base = rng(min, max);
  const boosted = Math.min(
    base + Math.floor(progressBonus * rng(0, 3)),
    component === "reading"
      ? 44
      : component === "useOfEnglish"
        ? 28
        : component === "writing"
          ? 40
          : component === "listening"
            ? 30
            : 75,
  );
  return component === "speaking" ? rngFloat(boosted, boosted) : boosted;
}

// --- Student names -------------------------------------------------------- //

const FIRST_NAMES = [
  "Lucía",
  "Martín",
  "Sofía",
  "Diego",
  "Valentina",
  "Mateo",
  "Camila",
  "Nicolás",
  "Isabella",
  "Santiago",
  "Emma",
  "Daniel",
  "Mía",
  "Alejandro",
  "Catalina",
  "Tomás",
  "Renata",
  "Sebastián",
  "Ana",
  "Gabriel",
  "Mariana",
  "Lucas",
  "Paula",
  "Andrés",
  "Julia",
  "Carlos",
  "Elena",
  "Joaquín",
  "Laura",
  "Felipe",
];

const LAST_NAMES = [
  "García",
  "Rodríguez",
  "Martínez",
  "López",
  "González",
  "Hernández",
  "Pérez",
  "Sánchez",
  "Ramírez",
  "Torres",
  "Flores",
  "Rivera",
  "Gómez",
  "Díaz",
  "Cruz",
  "Morales",
  "Reyes",
  "Ortiz",
  "Vargas",
  "Castillo",
  "Mendoza",
  "Ruiz",
  "Álvarez",
  "Romero",
  "Jiménez",
  "Delgado",
  "Moreno",
  "Muñoz",
  "Rojas",
  "Navarro",
];

const NOTES = [
  null,
  null,
  null,
  "Mock exam",
  "Practice test #2",
  "Timed conditions",
  "Retake after holidays",
  "Felt confident on reading",
  "Struggled with use of english",
  "Writing topic was difficult",
  "Good listening section",
  "Speaking felt natural",
  "Need more practice on Part 4",
  "Improved from last time",
  "First full practice exam",
  null,
  null,
];

// --- Main ----------------------------------------------------------------- //

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clear existing data (order matters for FK constraints)
  await db.scoreLog.deleteMany();
  await db.groupMember.deleteMany();
  await db.group.deleteMany();
  await db.user.deleteMany();

  // Create teacher (real Clerk user)
  const teacher = await db.user.upsert({
    where: { clerkId: TEACHER_CLERK_ID },
    create: {
      clerkId: TEACHER_CLERK_ID,
      email: "joacocampo27@gmail.com",
      name: "Joaquín Camponario",
    },
    update: {},
  });
  console.log(`  👩‍🏫 Teacher: ${teacher.name}`);

  // Create groups
  const proficiencyGroup = await db.group.create({
    data: {
      name: "Proficiency Monday 2026",
      organizationId: ORG_ID,
    },
  });

  const proficiencyGroup2 = await db.group.create({
    data: {
      name: "Proficiency Wednesday 2026",
      organizationId: ORG_ID,
    },
  });

  console.log(`  📁 Group: ${proficiencyGroup.name}`);
  console.log(`  📁 Group: ${proficiencyGroup2.name}`);

  const groups = [proficiencyGroup, proficiencyGroup2];

  // Create real student with hand-crafted progression (C1 → Grade C territory)
  const realStudent = await db.user.upsert({
    where: { clerkId: REAL_STUDENT_CLERK_ID },
    create: {
      clerkId: REAL_STUDENT_CLERK_ID,
      email: "student@test.com",
      name: "Test Student",
    },
    update: {},
  });

  // Assign real student to the Monday group
  await db.groupMember.create({
    data: {
      groupId: proficiencyGroup.id,
      userId: realStudent.clerkId,
      active: true,
    },
  });

  // 10 exams over 6 months: deliberate upward arc
  const realStudentScores: {
    examDate: Date;
    reading: number | null;
    useOfEnglish: number | null;
    writing: number | null;
    listening: number | null;
    speaking: number | null;
    notes: string | null;
  }[] = [
    // Exam 1 — baseline, weak start (~185 overall)
    { examDate: new Date("2025-08-12"), reading: 20, useOfEnglish: 12, writing: 14, listening: 13, speaking: 28, notes: "First mock exam — very nervous" },
    // Exam 2 — slight dip, missing speaking (~182)
    { examDate: new Date("2025-09-02"), reading: 22, useOfEnglish: 11, writing: 15, listening: 14, speaking: null, notes: "Couldn't do speaking section" },
    // Exam 3 — small improvement (~189)
    { examDate: new Date("2025-09-23"), reading: 24, useOfEnglish: 14, writing: 16, listening: 15, speaking: 32, notes: "Practice test #2" },
    // Exam 4 — plateau (~191)
    { examDate: new Date("2025-10-14"), reading: 25, useOfEnglish: 14, writing: 18, listening: 16, speaking: 34, notes: "Timed conditions" },
    // Exam 5 — breakthrough in reading (~197)
    { examDate: new Date("2025-11-04"), reading: 29, useOfEnglish: 16, writing: 19, listening: 17, speaking: 36, notes: "Reading felt much easier today!" },
    // Exam 6 — first time crossing 200! (~202)
    { examDate: new Date("2025-11-25"), reading: 30, useOfEnglish: 17, writing: 21, listening: 18, speaking: 40, notes: "Mock exam — finally passed C2!" },
    // Exam 7 — small regression (~198), keeps it realistic
    { examDate: new Date("2025-12-09"), reading: 28, useOfEnglish: 16, writing: 20, listening: 17, speaking: 38, notes: "Tough writing topic" },
    // Exam 8 — bounce back (~205)
    { examDate: new Date("2025-12-23"), reading: 31, useOfEnglish: 18, writing: 23, listening: 19, speaking: 42, notes: "Retake after holidays" },
    // Exam 9 — strong (~210)
    { examDate: new Date("2026-01-20"), reading: 33, useOfEnglish: 19, writing: 25, listening: 20, speaking: 48, notes: "Best practice test yet" },
    // Exam 10 — latest, solid Grade C (~213)
    { examDate: new Date("2026-02-03"), reading: 34, useOfEnglish: 20, writing: 26, listening: 21, speaking: 50, notes: "Felt confident on all sections" },
  ];

  for (const s of realStudentScores) {
    await db.scoreLog.create({
      data: {
        userId: realStudent.clerkId,
        organizationId: ORG_ID,
        groupId: proficiencyGroup.id,
        ...s,
      },
    });
  }
  console.log(`  🎓 Real student: ${realStudent.name} — ${realStudentScores.length} scores`);

  // Create students with scores
  let totalScores = 0;

  for (let i = 0; i < NUM_STUDENTS; i++) {
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const clerkId = `user_fake_student_${String(i + 1).padStart(3, "0")}`;

    const student = await db.user.create({
      data: {
        clerkId,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i + 1}@students.test`,
        name: `${firstName} ${lastName}`,
      },
    });

    // Assign to a group (roughly 60/40 split between Monday and Wednesday)
    const group = i < 15 ? proficiencyGroup : proficiencyGroup2;
    await db.groupMember.create({
      data: {
        groupId: group.id,
        userId: student.clerkId,
        active: true,
      },
    });

    // Each student has a base skill level
    const level = pick<Level>(["weak", "average", "average", "strong"]);
    const numScores = rng(SCORES_PER_STUDENT.min, SCORES_PER_STUDENT.max);

    // Generate scores spread over the last ~6 months
    const now = Date.now();
    const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;

    for (let j = 0; j < numScores; j++) {
      const progress = j / numScores; // 0 → 1, slight improvement over time
      const examDate = new Date(
        sixMonthsAgo + (j / (numScores - 1 || 1)) * (now - sixMonthsAgo),
      );

      await db.scoreLog.create({
        data: {
          userId: student.clerkId,
          organizationId: ORG_ID,
          groupId: group.id,
          examDate,
          reading: maybe(generateRawScore("reading", level, progress)),
          useOfEnglish: maybe(
            generateRawScore("useOfEnglish", level, progress),
          ),
          writing: maybe(generateRawScore("writing", level, progress)),
          listening: maybe(generateRawScore("listening", level, progress)),
          speaking: maybe(
            generateRawScore("speaking", level, progress),
            0.75,
          ),
          notes: pick(NOTES),
        },
      });
    }

    totalScores += numScores;
    console.log(
      `  👤 ${student.name} (${level}, ${group.name}) — ${numScores} scores`,
    );
  }

  console.log(
    `\n✅ Seeded ${NUM_STUDENTS} students + 1 teacher, ${totalScores} score logs, ${groups.length} groups`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
