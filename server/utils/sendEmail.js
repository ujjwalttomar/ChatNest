import nodemailer from "nodemailer"

// TODO: move to env later
const transporter = nodemailer.createTransport({
    service : "gmail",
    auth : {
        user : process.env.EMAIL_USER,
        pass : process.env.EMAIL_PASS
    }
})

const sendEmail = async (to, subject, html) => {
    const mailOptions = {
        from : process.env.EMAIL_USER,
        to,
        subject,
        html
    }

    await transporter.sendMail(mailOptions)
}

export default sendEmail
