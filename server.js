require("dotenv").config();

const express    = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors       = require("cors");
const multer     = require("multer");
const path       = require("path");
const nodemailer = require("nodemailer");

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Nodemailer
const transporter = nodemailer.createTransport({
  host:"smtp-relay.brevo.com",
  port:587,
  secure:false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// ═══════════════════════════════════════════════════
// ROUTE 1 — POST /register
// ═══════════════════════════════════════════════════
app.post("/register", upload.single("paymentScreenshot"), async (req, res) => {

  console.log("BODY:", req.body);
  console.log("FILE:", req.file ? req.file.originalname : "No file");

  if (!req.file) {
    return res.json({ success: false, message: "No screenshot received" });
  }

  try {
    const file     = req.file;
    const fileName = Date.now() + "-" + file.originalname;

    // 1. Upload screenshot to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("payment-screenshots")
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      console.log("Upload error:", uploadError);
      return res.json({ success: false, message: "Screenshot upload failed" });
    }

    const screenshotUrl =
      `${process.env.SUPABASE_URL}/storage/v1/object/public/payment-screenshots/${fileName}`;

    // 2. Save to Supabase DB
    const { error: dbError } = await supabase
      .from("registrations")
      .insert([{
        name:       req.body.name,
        email:      req.body.email,
        phone:      req.body.phone,
        whatsapp:   req.body.whatsapp,
        dob:        req.body.dob,
        linkedin:   req.body.linkedin,
        college:    req.body.college,
        department: req.body.department,
        year:       req.body.year,
        cgpa:       req.body.cgpa,
        domain:     req.body.domain,
        skills:     req.body.skills,
        referral:   req.body.referral,
        duration:   req.body.duration,
        amount:     req.body.amount,
        startDate:  req.body.startDate,
        message:    req.body.message,
        screenshot: screenshotUrl,
        status:     "pending"
      }]);

    if (dbError) {
      console.log("DB error:", dbError);
      return res.json({ success: false, message: dbError.message });
    }

    // 3. Send response IMMEDIATELY — no timeout!
    res.json({ success: true, message: "Registration successful" });

    // 4. Send email AFTER response — runs in background
    transporter.sendMail({
      from:    `"Internship Team" <${process.env.GMAIL_USER}>`,
      to:      req.body.email,
      subject: "Registration Received - Payment Pending Verification",
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:14px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#667eea,#3d1368);color:white;padding:32px;text-align:center">
            <h1 style="font-size:22px;margin:0 0 6px">Registration Received!</h1>
            <p style="opacity:.8;font-size:14px;margin:0">Payment verification in progress</p>
          </div>
          <div style="padding:30px">
            <p style="font-size:15px;color:#333">Dear <strong>${req.body.name}</strong>,</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:12px 0 22px">
              Thank you for registering! We received your payment screenshot and are verifying it now.
            </p>
            <table style="width:100%;font-size:14px;border-collapse:collapse;background:#f8f9ff;border-radius:10px">
              <tr><td style="padding:10px;color:#888;width:40%">Name</td>      <td style="padding:10px;font-weight:600">${req.body.name}</td></tr>
              <tr><td style="padding:10px;color:#888">Email</td>               <td style="padding:10px;font-weight:600">${req.body.email}</td></tr>
              <tr><td style="padding:10px;color:#888">College</td>             <td style="padding:10px;font-weight:600">${req.body.college}</td></tr>
              <tr><td style="padding:10px;color:#888">Domain</td>              <td style="padding:10px;font-weight:600">${req.body.domain}</td></tr>
              <tr><td style="padding:10px;color:#888">Duration</td>            <td style="padding:10px;font-weight:600;color:#667eea">${req.body.duration}</td></tr>
              <tr><td style="padding:10px;color:#888">Amount</td>              <td style="padding:10px;font-weight:700;color:#28a745">Rs.${req.body.amount}</td></tr>
              <tr><td style="padding:10px;color:#888">Status</td>              <td style="padding:10px"><span style="background:#fff8e1;color:#92400e;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600">Pending Verification</span></td></tr>
            </table>
            <p style="margin-top:20px;font-size:13px;color:#92400e;background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px">
              Our team will verify your payment within 2 to 6 hours on business days.
            </p>
            <p style="font-size:13px;color:#555;margin-top:20px">Best regards,<br/><strong>Internship Team</strong></p>
          </div>
        </div>
      `
    }).then(() => {
      console.log("Pending email sent to", req.body.email);
    }).catch(err => {
      console.log("Email error:", err.message);
    });

  } catch (err) {
    console.log("BACKEND ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════
// ROUTE 2 — POST /send-status-email (admin panel)
// ═══════════════════════════════════════════════════
app.post("/send-status-email", async (req, res) => {

  const { email, name, status } = req.body;

  if (!email || !name || !status) {
    return res.json({ success: false, message: "email, name, status required" });
  }

  // Send response immediately
  res.json({ success: true, message: status + " email sending" });

  // Send email in background
  if (status === "verified") {

    transporter.sendMail({
      from:    `"Internship Team" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: "Internship Registration Confirmed!",
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:14px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#28a745,#1e7e34);color:white;padding:32px;text-align:center">
            <h1 style="font-size:24px;margin:0 0 6px">Congratulations!</h1>
            <p style="opacity:.8;font-size:14px;margin:0">Registration Confirmed - Payment Verified</p>
          </div>
          <div style="padding:30px">
            <p style="font-size:15px;color:#333">Dear <strong>${name}</strong>,</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:12px 0 22px">
              Your internship registration is officially confirmed. Your payment has been verified successfully.
            </p>
            <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:20px;margin-bottom:20px">
              <p style="color:#065f46;font-size:14px;margin:0">Payment Verified</p>
              <p style="color:#065f46;font-size:14px;margin:8px 0 0">Seat Confirmed</p>
              <p style="color:#065f46;font-size:14px;margin:8px 0 0">Our team will send your joining kit within 1 to 2 business days.</p>
            </div>
            <p style="font-size:13px;color:#555">Welcome aboard!<br/><strong>Internship Team</strong></p>
          </div>
        </div>
      `
    }).then(() => {
      console.log("Verified email sent to", email);
    }).catch(err => {
      console.log("Email error:", err.message);
    });

  } else if (status === "rejected") {

    transporter.sendMail({
      from:    `"Internship Team" <${process.env.GMAIL_USER}>`,
      to:      email,
      subject: "Payment Verification Issue - Action Required",
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:14px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#dc3545,#b02030);color:white;padding:32px;text-align:center">
            <h1 style="font-size:22px;margin:0">Payment Verification Issue</h1>
            <p style="opacity:.8;font-size:14px;margin:6px 0 0">Action required from your side</p>
          </div>
          <div style="padding:30px">
            <p style="font-size:15px;color:#333">Dear <strong>${name}</strong>,</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:12px 0">
              We could not verify your payment. Possible reasons:
            </p>
            <ul style="font-size:14px;color:#555;line-height:2;margin-left:20px;margin-bottom:20px">
              <li>Screenshot was unclear or incorrect</li>
              <li>Payment amount did not match</li>
              <li>Transaction could not be confirmed</li>
            </ul>
            <div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:8px;padding:14px;font-size:13px;color:#7f1d1d">
              Please reply to this email with your correct payment proof.
            </div>
            <p style="font-size:13px;color:#555;margin-top:20px">Regards,<br/><strong>Internship Team</strong></p>
          </div>
        </div>
      `
    }).then(() => {
      console.log("Rejected email sent to", email);
    }).catch(err => {
      console.log("Email error:", err.message);
    });
  }
});

// Static files
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "form2.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});