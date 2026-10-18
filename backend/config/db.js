const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Log replica set status (needed for transactions and change streams)
    const adminDb = conn.connection.db.admin();
    try {
      const rsStatus = await adminDb.command({ isMaster: 1 });
      if (rsStatus.setName) {
        console.log(`📦 Replica Set: ${rsStatus.setName} — Change Streams & Transactions supported`);
      } else {
        console.log(`⚠️  Standalone MongoDB detected — Change Streams require a replica set`);
      }
    } catch (_) {
      // Non-critical
    }
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
