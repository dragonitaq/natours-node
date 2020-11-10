const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // STEP 1: Create a transporter. We define the type of service.
  /* In production mode, recommended to use SendGrid or MailGun. It's not practical to use Gmail because it allows us to send max 500 email/day and easily get marked as spam. To use it, you need to active "less secure app" in Gmail.
  There are many built-in services made by nodemailer like Gmail, Yahoo & etc. */
  // const transporter = nodemailer.createTransport({
  //   service: 'Gmail',
  //   auth: {
  //     user: process.env.EMAIL_USERNAME,
  //     pass: process.env.EMAIL_PASSWORD,
  //   },
  // });

  /* In development mode, We use MailTrap. It 'fake' sends emails to real addresses but we trap it in our development inbox then we can take a look on how they look like in production. We need to specify the host & port because we are not using built-in service. */
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // STEP 2: Define the email options
  const mailOptions = {
    from: 'Kevin Char <kevincharlk@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
    // html: // REVIEW
  };

  // STEP 3: Actually send the email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
