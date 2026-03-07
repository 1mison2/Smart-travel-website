const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const http = require("http");
const connectDB = require("./config/db");
const { createSocketServer } = require("./config/socket");

dotenv.config({ path: path.join(__dirname, ".env") });
connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/locations", require("./routes/locationRoutes"));
app.use("/api/bookings", require("./routes/bookingRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/places", require("./routes/placesRoutes"));
app.use("/api/itineraries", require("./routes/itineraryRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/listings", require("./routes/listingRoutes"));
app.use("/api/admin/listings", require("./routes/adminListingRoutes"));

app.use((err, _req, res, next) => {
  if (!err) return next();
  if (err.message === "Only image files are allowed") {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Image size must be 5MB or smaller" });
  }
  console.error(err);
  return res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);
createSocketServer(server);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try stopping the process using it or set PORT to a different value.`);
    process.exit(1);
  } else {
    console.error(err);
    process.exit(1);
  }
});
