const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const cors = require("cors");
const nodemailer = require("nodemailer");
const multer = require("multer");
const app = express();

app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const SUPABASE_URL =
"https://wydvkbznrgjykdltyjtz.supabase.co";

const SUPABASE_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZHZrYnpucmdqeWtkbHR5anR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODgyNDM5MSwiZXhwIjoyMDk0NDAwMzkxfQ.AZNMfLDdKUE1gg-5U7DrQRH8I5qvr6lwTexXwxXhlgs";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const GMAIL_USER = "nehaai2103@gmail.com";

const GMAIL_PASS = "rvryrosgapqykxpd";

const transporter = nodemailer.createTransport({
  service:"gmail",
  auth:{
    user:GMAIL_USER,
    pass:GMAIL_PASS
  }
});
app.use(express.json())
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
     await transporter.sendMail({

  from:`Internship Team <${GMAIL_USER}>`,

  to:req.body.email,

  subject:"Internship Registration Successful",

  html: `
    <div style="font-family:Arial;padding:20px">

      <h2 style="color:#667eea;">
        Internship Registration Successful 🎉
      </h2>

      <p>Hello <b>${req.body.name}</b>,</p>

      <p>
        Thank you for registering for our internship program.
      </p>

      <p>
        Your payment screenshot has been received successfully.
      </p>

      <p>
        Your registration is currently under verification by our team.
      </p>

      <hr>

      <h3>Registration Details:</h3>

      <p><b>Domain:</b> ${req.body.domain}</p>

      <p><b>Duration:</b> ${req.body.duration}</p>

      <p><b>Amount Paid:</b> ₹${req.body.amount}</p>

      <p><b>Status:</b> Pending Verification</p>

      <br>

      <p>
        We will contact you shortly with further internship details.
      </p>

      <p>
        Regards,<br>
        Internship Team
      </p>

    </div>
  `
});

      res.json({
        success:true,
        message:"Registration successful"
      });

    } catch(err){

      console.log(err);

      res.json({
        success:false,
        message:"Server error"
      });

    }

});

app.listen(5000,()=>{
  console.log("Server running on 5000");
});