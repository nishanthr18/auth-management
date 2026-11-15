import nodemailer from 'nodemailer';

export const sendVerificationMail = async (to: string, subject: string, html: string) => {
    const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    await transport.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html
    }, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log("Message sent: %s", info.messageId);
    });
};