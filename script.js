const upiId = "yourupi@okaxis";

const amountText = document.getElementById("amount");
const duration = document.getElementById("duration");
const qrImage = document.getElementById("qrImage");

function generateQR(){

const amount = duration.value;

amountText.innerText = amount;

const upiLink =
`upi://pay?pa=${upiId}&pn=AIInternship&am=${amount}&cu=INR`;

qrImage.src ="QR code (2).jpeg";

}

generateQR();

duration.addEventListener("change", generateQR);

async function submitForm(){

const data = {

name: document.getElementById("name").value,

email: document.getElementById("email").value,

phone: document.getElementById("phone").value,

amount: duration.value

};

const response = await fetch("http://localhost:5000/register",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(data)

});

const result = await response.json();

document.getElementById("message").innerText =
result.message;

}