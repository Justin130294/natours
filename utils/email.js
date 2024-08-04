// Utility function to send emails

// nodemailer is the service that will send the email
const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    // this is the url to embed in the email as a link (e.g. reset password)
    this.url = url;
    this.from = `Justin Ng <${process.env.EMAIL_FROM}>`;
  }

  // Function to create the transport
  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Use sendgrid to send the email
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      // Enter the username and password of the sender (i.e. server)
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Base function to send the actual email
  async send(template, subject) {
    // 1) Render HTML string based on a pug template
    const html = pug.renderFile(
      `${__dirname}/../views/email/${template}.pug`,
      // Pass the objects into the pug file
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      },
    );
    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      // Convert the html to text only
      text: htmlToText.convert(html),
    };

    // 3) Create a transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  // Send password reset email
  async sendWelcome() {
    // await so that this function only returns as soon as the email has been sent
    await this.send('welcome', 'Welcome to the Natours Family');
  }

  // Send password reset email
  async sendPasswordReset() {
    // await so that this function only returns as soon as the email has been sent
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)',
    );
  }
};
