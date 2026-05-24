require("dotenv").config();

const express    = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors       = require("cors");
const multer     = require("multer");
const path       = require("path");

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

// ═══════════════════════════════════════════════════
// ROUTE 1 — POST /register
// ═══════════════════════════════════════════════════
app.post("/register", upload.single("paymentScreenshot"), async (req, res) => {

  console.log("📝 New Registration Received:", new Date().toLocaleString());
  console.log("👤 Name:", req.body.name);
  console.log("📧 Email:", req.body.email);
  console.log("📱 Phone:", req.body.phone);
  console.log("🎓 Domain:", req.body.domain);
  console.log("⏱️ Duration:", req.body.duration);
  console.log("💰 Amount:", req.body.amount);
  console.log("📎 Screenshot:", req.file ? req.file.originalname : "No file");

  if (!req.file) {
    console.log("❌ No screenshot uploaded");
    return res.json({ success: false, message: "No screenshot received" });
  }

  try {
    const file     = req.file;
    const fileName = Date.now() + "-" + file.originalname;

    // 1. Upload screenshot to Supabase Storage
    console.log("📤 Uploading screenshot to Supabase...");
    const { error: uploadError } = await supabase.storage
      .from("payment-screenshots")
      .upload(fileName, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      console.log("❌ Upload error:", uploadError);
      return res.json({ success: false, message: "Screenshot upload failed" });
    }

    const screenshotUrl =
      `${process.env.SUPABASE_URL}/storage/v1/object/public/payment-screenshots/${fileName}`;
    console.log("✅ Screenshot uploaded:", screenshotUrl);

    // 2. Save to Supabase DB
    console.log("💾 Saving to database...");
    const { data, error: dbError } = await supabase
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
      }])
      .select();

    if (dbError) {
      console.log("❌ DB error:", dbError);
      return res.json({ success: false, message: dbError.message });
    }

    console.log("✅ Registration saved! ID:", data[0].id);
    console.log("📊 Total registrations so far:", await getTotalCount());
    
    // Send response
    res.json({ 
      success: true, 
      message: "Registration successful",
      registrationId: data[0].id 
    });

  } catch (err) {
    console.log("❌ BACKEND ERROR:", err);
    return res.json({ success: false, message: err.message });
  }
});

// Helper to get total count
async function getTotalCount() {
  const { count } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true });
  return count;
}

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
  console.log("🚀 Server running on port", PORT);
  console.log("📋 Registration form: http://localhost:" + PORT);
  console.log("🔧 Admin panel: http://localhost:" + PORT + "/admin");
});