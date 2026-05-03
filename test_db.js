const { PrismaClient } = require('@prisma/client')
const mongoose = require('mongoose')
const prisma = new PrismaClient()

async function test() {
  console.log("--- Checking Postgres Users ---")
  const users = await prisma.user.findMany({
    include: { profile: true }
  })
  console.log(`Found ${users.length} users in PostgreSQL.`)
  users.forEach(u => console.log(` - ${u.email} (${u.role}) - PasswordHash: ${!!u.passwordHash}`))

  console.log("\n--- Checking MongoDB Connectivity ---")
  const mongoUrl = process.env.MONGODB_URL
  if (!mongoUrl) {
    console.log("MONGODB_URL not found in environment.")
    return
  }
  
  try {
    console.log("Attempting to connect to MongoDB...")
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 })
    console.log("✅ MongoDB Connected Successfully!")
    
    // Check Assessment Sessions
    const collections = await mongoose.connection.db.listCollections().toArray()
    console.log("MongoDB Collections:", collections.map(c => c.name).join(", "))
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message)
    if (err.message.includes('EAI_AGAIN')) {
      console.log("Diagnosis: This is a DNS error (EAI_AGAIN). Your machine cannot resolve 'ac-fczum7i-shard-00-02.bqwmchg.mongodb.net'.")
    }
  } finally {
    await prisma.$disconnect()
    await mongoose.disconnect()
  }
}

test()
