import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// --- Config --------------------------------------------------------------- //

const ORG_ID = "org_fake_academy";
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

  // Clear existing data
  await db.scoreLog.deleteMany();
  await db.user.deleteMany();

  // Create teacher
  const teacher = await db.user.create({
    data: {
      clerkId: "user_fake_teacher_001",
      email: "teacher@academy.test",
      name: "Prof. Carmen Vidal",
    },
  });
  console.log(`  👩‍🏫 Teacher: ${teacher.name}`);

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
      `  👤 ${student.name} (${level}) — ${numScores} scores`,
    );
  }

  console.log(
    `\n✅ Seeded ${NUM_STUDENTS} students + 1 teacher, ${totalScores} score logs`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
