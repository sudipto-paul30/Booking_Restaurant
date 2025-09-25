const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Parser } = require("json2csv");

const app = express();
app.use(
  cors({
    origin: "http://localhost:3000", // Frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// ✅ MongoDB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/restaurant", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Booking Schema
const bookingSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true },
    table: { type: Number, required: true },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", bookingSchema);

//
// ---------------- ROUTES ----------------
//

// ✅ Admin Login (super simple — replace with JWT in production)
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  const ADMIN_USER = "admin";
  const ADMIN_PASS = "123";

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    return res.json({ success: true, message: "Login successful" });
  } else {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }
});

// ✅ GET All Bookings (with optional search/filter)
app.get("/bookings", async (req, res) => {
  try {
    const { date, email, phone } = req.query;
    let filter = {};

    if (date) filter.date = date;
    if (email) filter.email = { $regex: email, $options: "i" };
    if (phone) filter.phone = { $regex: phone, $options: "i" };

    const bookings = await Booking.find(filter).sort({ date: 1, time: 1 });
    res.json(bookings);
  } catch (error) {
    console.error("❌ Error fetching bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ✅ POST Create Booking
app.post("/bookings", async (req, res) => {
  try {
    const { firstName, lastName, phone, email, date, time, table } = req.body;

    if (
      !firstName ||
      !lastName ||
      !phone ||
      !email ||
      !date ||
      !time ||
      !table
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const formattedDate = date.split("T")[0]; // Ensure YYYY-MM-DD

    // Check if table already booked
    const exists = await Booking.findOne({ date: formattedDate, time, table });
    if (exists) return res.status(400).json({ error: "Table already booked" });

    const booking = new Booking({ ...req.body, date: formattedDate });
    await booking.save();

    res.status(201).json(booking);
  } catch (error) {
    console.error("❌ Error saving booking:", error);
    res.status(500).json({ error: "Booking failed. Please try again." });
  }
});

// ✅ DELETE Booking
app.delete("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Booking.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json({ message: "Booking deleted successfully", id });
  } catch (error) {
    console.error("❌ Error deleting booking:", error);
    res.status(500).json({ error: "Failed to delete booking" });
  }
});

// ✅ UPDATE Booking
app.put("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Booking.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("❌ Error updating booking:", error);
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// ✅ Export Bookings as CSV
app.get("/bookings/export/csv", async (req, res) => {
  try {
    const bookings = await Booking.find().lean();
    const fields = [
      "firstName",
      "lastName",
      "phone",
      "email",
      "date",
      "time",
      "table",
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(bookings);

    res.header("Content-Type", "text/csv");
    res.attachment("bookings.csv");
    return res.send(csv);
  } catch (error) {
    console.error("❌ Error exporting CSV:", error);
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

// ✅ Start Server
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
