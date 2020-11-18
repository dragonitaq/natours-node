const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    (this.to = user.email), (this.firstName = user.name.split(' ')[0]), (this.url = url), (this.from = `Kevin Char <${process.env.EMAIL_FROM}>`);
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  /* This is the base function for sending email. */
  async send(template, subject) {
    // STEP 1: Render HTML based on pug template
    /* This will take the pug file and convert into HTML format. NOT render it. But we can pass variables into pug just like we did when we want to render it. */
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // STEP 2: Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      /* We convert from HTML to plain text form of email because some cases user can't render html format, then at least they can read the plain text format. */
      text: htmlToText.fromString(html),
    };

    // STEP 3: Create a transport and send the email.
    await this.newTransport().sendMail(mailOptions);
  }

  /* Option for sending different type of email. */
  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Natours family!');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Your password reset token (valid for only 10 minutes)');
  }
};

/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */
/*           Old version code to test reset password email          */
/* @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ */

// const sendEmail = async (options) => {
//   // STEP 1: Create a transporter. We define the type of service.
//   /* In production mode, recommended to use SendGrid or MailGun. It's not practical to use Gmail because it allows us to send max 500 email/day and easily get marked as spam. To use it, you need to active "less secure app" in Gmail.
//   There are many built-in services made by nodemailer like Gmail, Yahoo & etc. */
//   // const transporter = nodemailer.createTransport({
//   //   service: 'Gmail',
//   //   auth: {
//   //     user: process.env.EMAIL_USERNAME,
//   //     pass: process.env.EMAIL_PASSWORD,
//   //   },
//   // });

//   /* In development mode, We use MailTrap. It 'fake' sends emails to real addresses but we trap it in our development inbox then we can take a look on how they look like in production. We need to specify the host & port because we are not using built-in service. */
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   // STEP 2: Define the email options
//   const mailOptions = {
//     from: 'Kevin Char <kevincharlk@gmail.com>',
//     to: options.email,
//     subject: options.subject,
//     text: options.message,
//     // html:
//   };

//   // STEP 3: Actually send the email
//   await transporter.sendMail(mailOptions);
// };
