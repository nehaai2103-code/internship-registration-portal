require("dotenv").config();
const path = require("path")
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const nodemailer = require("nodemailer");

const app = express();

app.use(express.json());

app.use(cors({
  origin: "*"
}));

// ======================================
// MULTER
// ======================================
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage
});

// ======================================
// NODEMAILER
// ======================================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// ======================================
// HOME ROUTE
// ======================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "form2.html"));
});

// ======================================
// ADMIN ROUTE
// ======================================
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});
// ======================================
// REGISTER API
// ======================================
app.post("/register", upload.single("paymentScreenshot"), async (req, res) => {

  try {

    console.log("Registration API called");

    console.log("BODY:", req.body);

    console.log("FILE:", req.file);

    const {
      name,
      email,
      phone
    } = req.body;

    // ==================================
    // VALIDATION
    // ==================================
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "All fields required"
      });
    }

    const phoneRegex = /^[0-9]{10}$/;

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number"
      });
    }

    // ==================================
    // SEND SUCCESS MAIL TO USER
    // ==================================
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: req.body.email,
      subject: "Internship Registration Successful",
      html: `
        <h2>Registration Successful ✅</h2>

        <p>Hello ${name},</p>

        <p>Your internship registration has been received successfully.</p>

        <p>We will contact you soon.</p>

        <p>Thank you.</p>
      `
    });

    // ==================================
    // RESPONSE
    // ==================================
    return res.json({
      success: true,
      message: "Registration successful"
    });

  } catch (error) {

    console.log("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

});

// ======================================
// VERIFY API
// ======================================
app.post("/verify/:email", async (req, res) => {

  try {

    const email = req.params.email;

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: req.boby.email,
      subject: "Internship Registration Confirmed",
      html: `
        <h2>Registration Confirmed ✅</h2>

        <p>Your internship registration has been VERIFIED successfully.</p>

        <p>You are selected for the internship program.</p>

        <p>Thank you.</p>
      `
    });

    return res.json({
      success: true,
      message: "Verification mail sent"
    });

  } catch (error) {

    console.log("VERIFY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

});

// ======================================
// REJECT API
// ======================================
app.post("/reject/:email", async (req, res) => {

  try {

    const email = req.params.email;

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: req.body.email,
      subject: "Internship Registration Rejected",
      html: `
        <h2>Registration Rejected ❌</h2>

        <p>Sorry.</p>

        <p>Your internship registration has been rejected.</p>

        <p>Thank you for applying.</p>
      `
    });

    return res.json({
      success: true,
      message: "Rejection mail sent"
    });

  } catch (error) {

    console.log("REJECT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });

  }

});

// ======================================
// PORT
// ======================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});