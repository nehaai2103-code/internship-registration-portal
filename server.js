require("dotenv").config();

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors    = require("cors");
const multer  = require("multer");
const path    = require("path");
const { Resend } = require("resend");

const app    = express();
const resend = new Resend(process.env.RESEND_API_KEY);
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
  origin: "*"
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Supabase ──────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ═══════════════════════════════════════════════════════════════
//  ROUTE 1 — POST /register
//  Called by index.html (student registration form)
// ═══════════════════════════════════════════════════════════════
app.post("/register", upload.single("paymentScreenshot"), async (req, res) => {

  console.log("BODY:", req.body);
  console.log("FILE:", req.file ? req.file.originalname : "No file");

const { name, email, phone } = req.body;

if (!name || !email || !phone) {
  return res.json({
    success: false,
    message: "All fields required"
  });
}

const phoneRegex = /^[0-9]{10}$/;

if (!phoneRegex.test(phone)) {
  return res.json({
    success: false,
    message: "Phone must be 10 digits"
  });
}

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

    // 2. Save registration to Supabase DB
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

    // 3. Send PENDING email to student
    await resend.emails.send({
      from:    "onboarding@resend.dev",
      to:      req.body.email,
      subject: "⏳ Registration Received — Payment Pending Verification",
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:14px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#667eea,#3d1368);color:white;padding:32px;text-align:center">
            <div style="font-size:44px;margin-bottom:10px">⏳</div>
            <h1 style="font-size:22px;margin:0 0 6px">Registration Received!</h1>
            <p style="opacity:.8;font-size:14px;margin:0">Payment verification in progress</p>
          </div>
          <div style="padding:30px">
            <p style="font-size:15px;color:#333">Dear <strong>${req.body.name}</strong>,</p>
            <p style="font-size:14px;color:#555;line-height:1.7;margin:12px 0 22px">
              Thank you for registering! We have received your registration and payment screenshot.
              Our team is currently verifying your payment. You will receive a confirmation email once verified.
            </p>
            <div style="background:#f8f9ff;border:1px solid #dde5ff;border-radius:10px;padding:18px;margin-bottom:22px">
              <table style="width:100%;font-size:14px;border-collapse:collapse">
                <tr><td style="padding:8px 0;color:#888;width:40%">Name</td>      <td style="font-weight:600;color:#1a1a2e">${req.body.name}</td></tr>
                <tr><td style="padding:8px 0;color:#888">Email</td>               <td style="font-weight:600;color:#1a1a2e">${req.body.email}</td></tr>
                <tr><td style="padding:8px 0;color:#888">Domain</td>              <td style="font-weight:600;color:#1a1a2e">${req.body.domain}</td></tr>
                <tr><td style="padding:8px 0;color:#888">Duration</td>            <td style="font-weight:600;color:#667eea">${req.body.duration}</td></tr>
                <tr><td style="padding:8px 0;color:#888">Amount</td>              <td style="font-weight:700;color:#28a745;font-size:15px">₹${req.body.amount}</td></tr>
                <tr><td style="padding:8px 0;color:#888">Status</td>              <td><span style="background:#fff8e1;color:#92400e;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600">⏳ Pending Verification</span></td></tr>
              </table>
            </div>
            <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;font-size:13px;color:#92400e">
              💡 Our team will verify your payment within <strong>2–6 hours</strong> on business days.
            </div>
            <p style="font-size:13px;color:#555;margin-top:20px">Best regards,<br/><strong>Internship Team</strong></p>
          </div>
        </div>
      `
    });

    console.log(`✅ Registration saved & pending email sent to ${req.body.email}`);
    return res.json({ success: true, message: "Registration successful" });                      

  } catch (err) {
    console.log("🔥 FULL BACKEND ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTE 2 — POST /send-status-email
//  Called by admin.html when admin clicks Verify or Reject
// ═══════════════════════════════════════════════════════════════
app.post("/send-status-email", async (req, res) => {

  const { email, name, status } = req.body;

  if (!email || !name || !status) {
    return res.json({ success: false, message: "email, name, status are required" });
  }

  try {

    if (status === "verified") {

      // ── Send CONFIRMED email ──────────────────────────────
      await resend.emails.send({
        from:    "onboarding@resend.dev",
        to:      email,
        subject: "🎉 Internship Registration Confirmed!",
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:14px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#28a745,#1e7e34);color:white;padding:32px;text-align:center">
              <div style="font-size:56px;margin-bottom:10px">🎉</div>
              <h1 style="font-size:22px;margin:0 0 6px">Registration Confirmed!</h1>
              <p style="opacity:.8;font-size:14px;margin:0">Payment verified · Seat secured</p>
            </div>
            <div style="padding:30px">
              <p style="font-size:15px;color:#333">Dear <strong>${name}</strong>,</p>
              <p style="font-size:14px;color:#555;line-height:1.7;margin:12px 0 22px">
                Congratulations! 🎊 Your internship registration is <strong style="color:#28a745">officially confirmed</strong>.
                Your payment has been verified successfully by our team.
              </p>
              <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:18px;margin-bottom:22px">
                <div style="font-size:14px;color:#065f46">
                  <p>✅ <strong>Payment Verified</strong></p>
                  <p style="margin-top:8px">✅ <strong>Seat Confirmed</strong></p>
                  <p style="margin-top:8px">📅 Our team will send your joining kit and schedule within <strong>1–2 business days</strong>.</p>
                </div>
              </div>
              <p style="font-size:13px;color:#555;margin-top:20px">Welcome aboard! 🚀<br/><strong>Internship Team</strong></p>
            </div>
          </div>
        `
      });

    } else if (status === "rejected") {

      // ── Send REJECTED email ───────────────────────────────
      await resend.emails.send({
        from:    "onboarding@resend.dev",
        to:      formData.email,
        subject: "⚠️ Payment Verification Issue — Action Required",
        html: `
          <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0e0e0;border-radius:14px;overflow:hidden">
            <div style="background:linear-gradient(135deg,#dc3545,#b02030);color:white;padding:32px;text-align:center">
              <div style="font-size:44px;margin-bottom:10px">⚠️</div>
              <h1 style="font-size:22px;margin:0 0 6px">Payment Verification Issue</h1>
              <p style="opacity:.8;font-size:14px;margin:0">Action required from your side</p>
            </div>
            <div style="padding:30px">
              <p style="font-size:15px;color:#333">Dear <strong>${name}</strong>,</p>
              <p style="font-size:14px;color:#555;line-height:1.7;margin:12px 0 22px">
                We were unable to verify your payment screenshot. This could be because:
              </p>
              <ul style="font-size:14px;color:#555;line-height:2;margin-left:20px;margin-bottom:22px">
                <li>Screenshot was unclear or incorrect</li>
                <li>Payment amount did not match</li>
                <li>Transaction could not be confirmed</li>
              </ul>
              <div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:8px;padding:14px;font-size:13px;color:#7f1d1d">
                📞 Please reply to this email or contact our support team with your correct payment proof to resolve this.
              </div>
              <p style="font-size:13px;color:#555;margin-top:20px">Regards,<br/><strong>Internship Team</strong></p>
            </div>
          </div>
        `
      });
    }

    console.log(`📧 Status email (${status}) sent to ${email}`);
    return res.json({ success: true, message: `${status} email sent to ${email}` });

  } catch (err) {
    console.log("Email error:", err);
    return res.json({ success: false, message: err.message });
  }
});

// ── Serve HTML files ──────────────────────────────────────────
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "form2.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("═══════════════════════════════════════");
  console.log("Server running on port" + PORT);
  console.log("═══════════════════════════════════════");
});




