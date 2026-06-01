import { prisma } from "./db/prisma.js";
import dayjs from "dayjs";

async function run() {
  const userId = 1;
  const start = dayjs("2024-01-01").toDate();
  const end = dayjs("2025-01-01").toDate();
  console.log("Testing logic")
}
run();
