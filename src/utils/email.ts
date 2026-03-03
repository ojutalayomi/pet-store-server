import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer';
import handlebars from 'handlebars'
import { Invite } from '../types/type';
import { Time, timeFormatter } from './time';

// Verify required environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials are not properly configured in environment variables');
}

// Read the HTML email template file
const emailTemplateSource = fs.readFileSync(path.join(__dirname, '../../email_templates/email.hbs'), 'utf8');

const inviteTemplateSource = fs.readFileSync(path.join(__dirname, '../../email_templates/invite.hbs'), 'utf8');

const inviteExpiredTemplateSource = fs.readFileSync(path.join(__dirname, '../../email_templates/inviteExpired.hbs'), 'utf8');

const scheduleVisitTemplateSource = fs.readFileSync(path.join(__dirname, '../../email_templates/scheduleVisit.hbs'), 'utf8');

// Create a Handlebars template
const template = handlebars.compile(emailTemplateSource);

const inviteTemplate = handlebars.compile(inviteTemplateSource);

const inviteExpiredTemplate = handlebars.compile(inviteExpiredTemplateSource);

const scheduleVisitTemplate = handlebars.compile(scheduleVisitTemplateSource);

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify connection configuration
transporter.verify(function(error, success) {
    if (error) {
        console.log('SMTP connection error:', error);
    } else {
        console.log('Server is ready to take our messages');
    }
});

export default transporter;

export async function sendInviteEmail( name: string, email: string, role: Invite['role'], link: string, expiresAt: string ) {
    const mailOptions = {
        from: 'Petty Shelter',
        to: email,
        subject: 'Petty Shelter - You\'re Invited to Join Our Shelter Team!',
        html: inviteTemplate({
            subject: 'Petty Shelter - You\'re Invited to Join Our Shelter Team!',
            name: name,
            role: role,
            link: link,
            expiresAt: timeFormatter(Time(expiresAt))
        }),        
    };
    
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
            // return res.status(401).json({ error: 'Error sending email' });
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

export async function sendInviteExpiredEmail( name: string, email: string, expiresAt: string ) {
    const mailOptions = {
        from: 'Petty Shelter',
        to: email,
        subject: 'Petty Shelter - Invitation Expired',
        html: inviteExpiredTemplate({ name: name, expiresAt: timeFormatter(Time(expiresAt)) }),
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
            // return res.status(401).json({ error: 'Error sending email' });
        } else {
            console.log('Email sent:', info.response);
        }
    });
}

export async function callSuccess( firstname: string, lastname: string, email: string ) {
  
    // Construct the confirmation link
    const confirmationLink = `${process.env.FRONTEND_URL}/accounts/confirm-email`;
    
    // Prepare the email options
    const mailOptions = {
        from: 'Petty Shelter',
        to: email,
        subject: 'Welcome to Petty Shelter',
        html: template({
            subject: 'Welcome to Petty Shelter!',
            heading: 'Where Every Pet Finds Their Forever Home',
            message: `
                Thank you for joining our mission at Petty Shelter! We are so excited to have you as part of our community.
                As a nonprofit organization, we are committed to giving every pet a loving and forever home. Your involvement will make a real difference, and we are grateful for your support.
                Before we can start sending you updates on the adorable pets waiting for their forever homes, we need you to confirm your email address.
                Please click the button below to verify your email and officially become a part of our shelter family:
                
            `,
            link: confirmationLink,
            click: 'Click me',
            firstname: firstname,
            lastname: lastname,
            imageAlt: 'Success Image',
            imageSrc: 'https://ojutalayomi.github.io/feetbook/FeetBook/public/images/icon-success.png'
        }),        
    };
  
    // Send the confirmation email
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
            // return res.status(401).json({ error: 'Error sending email' });
        } else {
            console.log('Email sent:', info.response);
        }
    });
  
}

export async function sendCodeByEmail( firstname: string, lastname: string, email: string, confirmationCode: string ) {
  
    // Prepare the email options
    const mailOptions = {
        from: 'Petty Shelter',
        to: email,
        subject: 'Petty Shelter - Email Verification',
        html: template({
            subject: 'Petty Shelter - Email Verification',
            heading: 'Where Every Pet Finds Their Forever Home',
            message: `To complete your registration and become an official member of our community, please confirm your email address by copying the code below.`,
            confirmationCode: confirmationCode,
            firstname: firstname,
            lastname: lastname,
            imageAlt: 'Success Image',
            imageSrc: 'https://ojutalayomi.github.io/feetbook/FeetBook/public/images/icon-success.png'
        }),        
    };
  
    // Send the confirmation email
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
            // return res.status(401).json({ error: 'Error sending email' });
        } else {
            console.log('Email sent:', info.response);
        }
    });
  
}

export async function emailChangedNotification( firstname: string, lastname: string, email: string ) {
    
    // Prepare the email options
    const mailOptions = {
        from: 'Petty Shelter',
        to: email,
        subject: 'Petty Shelter - Email Verification',
        html: template({
            subject: 'Petty Shelter - Email Verification Successful',
            heading: 'Where Every Pet Finds Their Forever Home',
            message: `Great news! Your email address has been successfully verified. You’re now officially part of the Petty Shelter family!
                Thank you for joining our mission to provide every pet with a loving forever home. With your support, we can make a real difference in the lives of many animals in need.
                As a member of our community, you’ll receive updates about available pets, adoption stories, and other ways you can help make a positive impact. Together, we can find homes for every pet and give them the love they deserve.
                If you have any questions or need assistance, feel free to reach out. We’re here to help!
            `,
            firstname: firstname,
            lastname: lastname,
            imageAlt: 'Success Image',
            imageSrc: 'https://ojutalayomi.github.io/feetbook/FeetBook/public/images/icon-success.png'
        }),        
    };
  
    // Send the confirmation email
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
            // return res.status(401).json({ error: 'Error sending email' });
        } else {
            console.log('Email sent:', info.response);
        }
    });
  
}

export async function sendScheduleVisitEmail( firstname: string, lastname: string, email: string, visitDateAndTime: string, notes: string, status: string ) {
    const mailOptions = {
        from: 'Petty Shelter',
        to: email,
        subject: 'Petty Shelter - Visit Scheduled',
        html: scheduleVisitTemplate({ firstname: firstname, lastname: lastname, visitDateAndTime: timeFormatter(Time(visitDateAndTime)), notes: notes, status: status }),
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
            // return res.status(401).json({ error: 'Error sending email' });
        } else {
            console.log('Email sent:', info.response);
        }
    });
}