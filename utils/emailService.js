const nodemailer = require('nodemailer');

const getMailConfig = () => {
  const host = String(process.env.EMAIL_HOST || '').trim();
  const port = Number.parseInt(String(process.env.EMAIL_PORT || '587').trim(), 10);
  const user = String(process.env.EMAIL_USER || '').trim();
  const pass = String(process.env.EMAIL_PASS || '').trim();
  const from = String(process.env.EMAIL_FROM || user).trim();
  if (!host || !Number.isInteger(port) || !user || !pass || !from) {
    throw new Error('SMTP configuration is incomplete. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, and EMAIL_FROM.');
  }
  return { host, port, secure: port === 465, auth: { user, pass }, from };
};

const createTransporter = () => nodemailer.createTransport({
  ...getMailConfig(),
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 20000,
});

const sendMail = async (options) => {
  const config = getMailConfig();
  const transporter = createTransporter();
  return transporter.sendMail({ ...options, from: options.from || `"Flowsynq" <${config.from}>` });
};

const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      to: email,
      subject: 'Verify your Flowsynq Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #0ea5e9; text-align: center;">Welcome to Flowsynq</h2>
          <p style="font-size: 16px; color: #334155;">Hi there,</p>
          <p style="font-size: 16px; color: #334155;">Thank you for registering. Please use the following 6-digit OTP to verify your email address. This code is valid for <strong>1 minute</strong>.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0ea5e9;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #64748b;">If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 Flowsynq. All rights reserved.</p>
        </div>
      `,
    };

    const info = await sendMail(mailOptions);
    console.log('OTP Email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send verification email.');
  }
};

const sendDemoCredentialsEmail = async (email, username, password, expiresAt) => {
  await sendMail({
    to: email,
    subject: 'Your approved FlowSynq demo access',
    html: `<p>Your FlowSynq demo has been approved.</p><p><strong>Username:</strong> ${username}<br><strong>Password:</strong> ${password}</p><p>This account is view-only and expires on ${new Date(expiresAt).toISOString()}.</p>`,
  });
};

const sendAdminApprovalEmail = async (adminEmail, requestDetails, approvalLink) => {
  try {
    const mailOptions = {
      to: adminEmail,
      subject: `New Role Request - ${requestDetails.role.charAt(0).toUpperCase() + requestDetails.role.slice(1)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #0ea5e9;">A new user is requesting access to the platform:</h2>
          <p><strong>Name:</strong> ${requestDetails.fullName}</p>
          <p><strong>Email:</strong> ${requestDetails.email}</p>
          <p><strong>Requested Role:</strong> ${requestDetails.role.charAt(0).toUpperCase() + requestDetails.role.slice(1)}</p>
          <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
          <div style="margin-top: 30px; display: flex; gap: 10px;">
            <a href="${approvalLink}&action=approve" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Approve Request</a>
            <a href="${approvalLink}&action=reject" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reject Request</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 Flowsynq. All rights reserved.</p>
        </div>
      `,
    };

    const info = await sendMail(mailOptions);
    console.log('Admin approval email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending admin approval email:', error);
    throw new Error('Failed to send admin notification email.');
  }
};

const sendApprovalSuccessOTPEmail = async (email, role, otp) => {
  try {
    const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);

    const mailOptions = {
      to: email,
      subject: 'Your Registration Request - Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #10b981; text-align: center;">Registration Approved!</h2>
          <p style="font-size: 16px; color: #334155;">Hi there,</p>
          <p style="font-size: 16px; color: #334155;">Your request to join as <strong>${formattedRole}</strong> has been approved!</p>
          <p style="font-size: 16px; color: #334155;">Please use the following 6-digit OTP to complete your registration. This code is valid for <strong>10 minutes</strong>.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10b981;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #64748b;">If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 Flowsynq. All rights reserved.</p>
        </div>
      `,
    };

    const info = await sendMail(mailOptions);
    console.log('Approval success OTP email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending approval success email:', error);
    throw new Error('Failed to send approval success email.');
  }
};

const sendApprovalRejectionEmail = async (email, role) => {
  try {
    const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);

    const mailOptions = {
      to: email,
      subject: 'Your Registration Request - Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #ef4444; text-align: center;">Registration Request Denied</h2>
          <p style="font-size: 16px; color: #334155;">Hi there,</p>
          <p style="font-size: 16px; color: #334155;">We regret to inform you that your request to join Flowsynq as an <strong>${formattedRole}</strong> has been denied by the administration.</p>
          <p style="font-size: 14px; color: #64748b; margin-top: 20px;">If you believe this is a mistake or have any questions, please contact our support team.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 Flowsynq. All rights reserved.</p>
        </div>
      `,
    };

    const info = await sendMail(mailOptions);
    console.log('Approval rejection email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending approval rejection email:', error);
    throw new Error('Failed to send approval rejection email.');
  }
};

const sendEmergencyBroadcastEmail = async (users, alertData) => {
  try {
    const bccList = users.map(u => u.email).filter(Boolean);
    if (bccList.length === 0) return true;

    const mailOptions = {
      from: `"Flowsynq Emergency System" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_FROM,
      bcc: bccList,
      subject: `[EMERGENCY ALERT] ${alertData.severity.toUpperCase()} - ${alertData.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #ef4444; border-radius: 10px; background-color: #fef2f2;">
          <h2 style="color: #ef4444; text-align: center; text-transform: uppercase;">⚠️ EMERGENCY ALERT ⚠️</h2>
          <p style="font-size: 16px; color: #7f1d1d;"><strong>To:</strong> All Port Personnel</p>
          <p style="font-size: 16px; color: #7f1d1d;"><strong>Type:</strong> ${alertData.type}</p>
          <p style="font-size: 16px; color: #7f1d1d;"><strong>Location:</strong> ${alertData.location}</p>
          <p style="font-size: 16px; color: #7f1d1d;"><strong>Incident Time:</strong> ${new Date(alertData.incidentTime).toLocaleString()}</p>
          <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fca5a5;">
            <p style="font-size: 16px; font-weight: bold; color: #b91c1c; margin: 0;">${alertData.message}</p>
          </div>
          <p style="font-size: 14px; color: #991b1b;"><strong>Triggered By:</strong> ${alertData.triggeredBy} (${alertData.triggeredByRole})</p>
          <p style="font-size: 14px; color: #991b1b; font-weight: bold;">Please follow port emergency procedures immediately.</p>
          <hr style="border: 0; border-top: 1px solid #fca5a5; margin: 20px 0;">
          <p style="font-size: 12px; color: #991b1b; text-align: center;">&copy; 2026 Flowsynq. This is an automated emergency broadcast.</p>
        </div>
      `,
    };

    const info = await sendMail(mailOptions);
    console.log(`Emergency broadcast sent to ${bccList.length} users. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error sending emergency broadcast email:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail,
  sendDemoCredentialsEmail,
  sendAdminApprovalEmail,
  sendApprovalSuccessOTPEmail,
  sendApprovalRejectionEmail,
  sendEmergencyBroadcastEmail,
};
