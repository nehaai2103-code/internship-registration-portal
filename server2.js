require("dotenv").config();

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
//const nodemailer = require("nodemailer");
const multer = require("multer");
const path = require("path");


const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);


const app = express();

app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
  service:"gmail",
  auth:{
    user:GMAIL_USER,
    pass:GMAIL_PASS
  }
});
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.post(
  "/register",
  upload.single("paymentScreenshot"),

  async(req,res)=>{

    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    if(!req.file){
      return res.json({
        success:false,
        message:"No file received (Screenshot missing)"
      });
    }

  
    try{

      const file = req.file;

      const fileName =
        Date.now() + "-" + file.originalname;

      // upload screenshot
      const { error: uploadError } =
        await supabase.storage
          .from("payment-screenshots")
          .upload(fileName, file.buffer,{
            contentType:file.mimetype
          });

      if(uploadError){

        console.log(uploadError);

        return res.json({
          success:false,
          message:"Screenshot upload failed"
        });
      }

      const screenshotUrl =
        `${SUPABASE_URL}/storage/v1/object/public/payment-screenshots/${fileName}`;

      // save database
      const { error } =
        await supabase
          .from("registrations")
          .insert([{

            name:req.body.name,
            email:req.body.email,
            phone:req.body.phone,
            whatsapp:req.body.whatsapp,
            dob:req.body.dob,
            linkedin:req.body.linkedin,
            college:req.body.college,
            department:req.body.department,
            year:req.body.year,
            cgpa:req.body.cgpa,
            domain:req.body.domain,
            skills:req.body.skills,
            referral:req.body.referral,
            duration:req.body.duration,
            amount:req.body.amount,
            startDate:req.body.startDate,
            message:req.body.message,

            screenshot:screenshotUrl,

            status:"pending"

          }]);

      if(error){

        console.log("SUPABASE ERROR:", error);

        return res.json({
          success:false,
          message:error.message
        });
      }

      // email student
  //    await transporter.sendMail({

  // from:`Internship Team <${GMAIL_USER}>`,

  // to:req.body.email,

  // subject:"Internship Registration Successful",

  // html: `
  //   <div style="font-family:Arial;padding:20px">

  //     <h2 style="color:#667eea;">
  //       Internship Registration Successful 🎉
  //     </h2>

  //     <p>Hello <b>${req.body.name}</b>,</p>

  //     <p>
  //       Thank you for registering for our internship program.
  //     </p>

  //     <p>
  //       Your payment screenshot has been received successfully.
  //     </p>

  //     <p>
  //       Your registration is currently under verification by our team.
  //     </p>

  //     <hr>

  //     <h3>Registration Details:</h3>

  //     <p><b>Domain:</b> ${req.body.domain}</p>

  //     <p><b>Duration:</b> ${req.body.duration}</p>

  //     <p><b>Amount Paid:</b> ₹${req.body.amount}</p>

  //     <p><b>Status:</b> Pending Verification</p>

  //     <br>

  //     <p>
  //       We will contact you shortly with further internship details.
  //     </p>

  //     <p>
  //       Regards,<br>
  //       Internship Team
  //     </p>

  //   </div>
  // `
// });
await resend.emails.send({

  from: "onboarding@resend.dev",

  to: req.body.email,

  subject: "Internship Registration Successful",

  html: `
    <h2>Registration Successful 🎉</h2>

    <p>Hello ${req.body.name},</p>

    <p>Your internship registration was submitted successfully.</p>

    <p>Domain: ${req.body.domain}</p>

    <p>Duration: ${req.body.duration}</p>

    <p>Amount: ₹${req.body.amount}</p>
  `
});
      res.json({
        success:true,
        message:"Registration successful"
      });

    } catch(err){

  console.log("FULL ERROR:", err);

  res.json({
    success:false,
    message: err.message
  });

}
});
const path = require("path");
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "form2.html"));
});

const PORT = process.env.PORT||5000;
app.listen(PORT,()=>{
  console.log(`Server running on ${PORT}`);
});