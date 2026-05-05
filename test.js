import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // load .env

const uri = process.env.MONGO_URI;

async function testDB() {
  try {
    if (!uri) {
      throw new Error("MONGO_URI not found in .env");
    }

    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    const expenseSchema = new mongoose.Schema({
      title: String,
      amount: Number,
    });

    const Expense = mongoose.model("Expense", expenseSchema);

    const data = await Expense.create({
      title: "Env Test",
      amount: 200,
    });

    console.log("✅ Data inserted:", data);

    const allData = await Expense.find();
    console.log("📦 All data:", allData);

    await mongoose.connection.close();
    console.log("🔌 Connection closed");

  } catch (err) {
    console.log("❌ Error:", err.message);
  }
}

testDB();