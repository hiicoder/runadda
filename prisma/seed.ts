import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const adminHash = await bcrypt.hash("Admin@123", 10)
  const userHash = await bcrypt.hash("User@123", 10)

  // Admin account
  await prisma.user.upsert({
    where: { email: "admin@runningclub.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@runningclub.com",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  })

  // Default user account
  await prisma.user.upsert({
    where: { email: "user@runningclub.com" },
    update: {},
    create: {
      name: "Default User",
      email: "user@runningclub.com",
      passwordHash: userHash,
      role: "USER",
    },
  })

  console.log("✅ Seeded admin@runningclub.com (Admin@123) and user@runningclub.com (User@123)")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
