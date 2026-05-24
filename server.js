require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve static files (IMPORTANT for QR + images + html)
app.use(express.static(path.join(__dirname, "public")));

// multer
const upload = multer({ storage: multer.memoryStorage() });

// nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// HOME
app.get("/", (req, res) => {
  res.send("Server Running OK");
});

// REGISTER API
app.post("/register", upload.single("paymentScreenshot"), async (req, res) => {
  try {
    console.log("REGISTER HIT");

    const { name, email, phone } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "Registration Successful",
      html: `<h2>Success</h2><p>Hi ${name}, registered successfully.</p>`
    });

    res.json({ success: true, message: "Registered successfully" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ADMIN VERIFY
app.post("/verify", async (req, res) => {
  const { email } = req.body;

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Verified",
    html: "<h2>Your application is APPROVED</h2>"
  });

  res.json({ success: true });
});

// ADMIN REJECT
app.post("/reject", async (req, res) => {
  const { email } = req.body;

  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Rejected",
    html: "<h2>Your application is REJECTED</h2>"
  });

  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));