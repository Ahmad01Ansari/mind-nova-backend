const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true, id: true, deviceId: true, passwordHash: true }
  })
  console.log("Total users in DB:", users.length)
  console.log(users)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
