import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.ALLOW_DEMO_SEED !== 'true') {
    // No-op by default to avoid seeding any data accidentally in shared repos
    return
  }
  const email = 'demo@fintrack.local'
  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash },
  })
  await prisma.account.create({
    data: { userId: user.id, name: 'Checking', type: 'Checking', initialBalance: 1000 },
  })
}

main().finally(() => prisma.$disconnect())


