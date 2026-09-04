const nodemailer = require('nodemailer');

const cleanEnv = (value) => String(value || '').trim().replace(/^["']|["']$/g, '');

const extractEmailAddress = (str) => {
  if (!str || typeof str !== 'string') return '';
  const match = str.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return str.trim().replace(/^["']|["']$/g, '');
};

const extractSenderName = (str, defaultName = 'FlowSynq') => {
  if (!str || typeof str !== 'string') return defaultName;
  const match = str.match(/^\s*"?([^"<]+)"?\s*</);
  if (match && match[1].trim()) return match[1].trim();
  return defaultName;
};

const isRenderEnvironment = () => {
  return Boolean(
    process.env.RENDER === 'true' ||
    process.env.RENDER_SERVICE_ID ||
    (process.env.CLIENT_URL && process.env.CLIENT_URL.includes('.onrender.com'))
  );
};

const useResend = () => Boolean(cleanEnv(process.env.RESEND_API_KEY));
const useBrevoApi = () => Boolean(cleanEnv(process.env.BREVO_API_KEY));

const getMailConfig = () => {
  const rawProvider = cleanEnv(process.env.EMAIL_PROVIDER).toLowerCase();
  const host = cleanEnv(process.env.EMAIL_HOST);
  const isGmail = rawProvider === 'gmail' || host.includes('gmail.com');
  const provider = isGmail ? 'gmail' : (rawProvider || (host.includes('brevo') ? 'brevo' : 'smtp'));

  const resolvedHost = host || (isGmail ? 'smtp.gmail.com' : (provider === 'brevo' ? 'smtp-relay.brevo.com' : 'smtp.gmail.com'));
  const port = Number.parseInt(cleanEnv(process.env.EMAIL_PORT) || '587', 10);
  const user = cleanEnv(process.env.EMAIL_USER);
  const pass = cleanEnv(process.env.EMAIL_PASS).replace(/\s+/g, '');
  const from = cleanEnv(process.env.EMAIL_FROM) || user;

  const isComplete = Boolean(resolvedHost && Number.isInteger(port) && user && pass && from);

  return {
    host: resolvedHost,
    port: Number.isInteger(port) ? port : 587,
    secure: port === 465,
    user,
    pass,
    from,
    provider,
    isGmail,
    isComplete,
  };
};

const getTransportPorts = () => {
  const config = getMailConfig();
  const configured = config.port;
  if (config.provider !== 'brevo' || configured === 465) return [configured];
  return Array.from(new Set([configured, 2525]));
};

const createSmtpTransporter = (portOverride) => {
  const config = getMailConfig();
  if (!config.isComplete) {
    throw new Error('SMTP configuration is incomplete. Set EMAIL_USER, EMAIL_PASS, and EMAIL_FROM.');
  }

  const port = portOverride || config.port;
  const isRender = isRenderEnvironment();
  // On Render free tier, outbound SMTP ports (25, 465, 587) are blocked at the firewall.
  // Use a shorter timeout to avoid hitting Render's 30s gateway timeout if SMTP is attempted.
  const timeoutMs = isRender ? 5000 : 15000;

  if (config.isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: timeoutMs,
      greetingTimeout: timeoutMs,
      socketTimeout: timeoutMs + 5000,
    });
  }

  return nodemailer.createTransport({
    host: config.host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: config.user, pass: config.pass },
    authMethod: 'LOGIN',
    tls: { minVersion: 'TLSv1.2', servername: config.host },
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs + 5000,
  });
};

const logEmailFallback = (options, reason) => {
  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  console.log('\n================================================================');
  console.log(' [FLOWSYNQ EMAIL SERVICE - DEV/RENDER FALLBACK]');
  console.log(` Reason:  ${reason}`);
  console.log(` To:      ${to}`);
  if (options.bcc) {
    console.log(` Bcc:     ${Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc}`);
  }
  console.log(` Subject: ${options.subject}`);

  const otpMatch = options.html ? options.html.match(/>(\d{6})</) : null;
  if (otpMatch) {
    console.log(` >>> VERIFICATION OTP CODE: [ ${otpMatch[1]} ] <<<`);
  }
  const linkMatch = options.html ? options.html.match(/href="([^"]+)"/) : null;
  if (linkMatch) {
    console.log(` >>> ACTION LINK: ${linkMatch[1]} <<<`);
  }
  console.log('================================================================\n');
};

const sendResendMail = async (options) => {
  const apiKey = cleanEnv(process.env.RESEND_API_KEY);
  const from = cleanEnv(options.from || process.env.EMAIL_FROM || 'FlowSynq <onboarding@resend.dev>');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      bcc: options.bcc,
      subject: options.subject,
      html: options.html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend API HTTP ${response.status}: ${detail.slice(0, 300)}`);
  }
  return response.json();
};

const sendBrevoApiMail = async (options) => {
  const apiKey = cleanEnv(process.env.BREVO_API_KEY);
  const rawFrom = options.from || process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const senderEmail = extractEmailAddress(rawFrom);
  const senderName = cleanEnv(process.env.EMAIL_FROM_NAME) || extractSenderName(rawFrom, 'FlowSynq');

  if (!senderEmail) {
    throw new Error('Valid EMAIL_FROM or EMAIL_USER is required when using BREVO_API_KEY.');
  }

  const rawRecipients = Array.isArray(options.to) ? options.to : [options.to];
  const toList = rawRecipients
    .map((r) => {
      if (typeof r === 'object' && r?.email) {
        return { email: extractEmailAddress(r.email), name: r.name || undefined };
      }
      const email = extractEmailAddress(r);
      const name = extractSenderName(r, '');
      return name ? { email, name } : { email };
    })
    .filter((r) => Boolean(r.email));

  if (!toList.length) {
    throw new Error('No valid recipient email address provided.');
  }

  const bccList = options.bcc
    ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc])
        .map((r) => ({ email: extractEmailAddress(typeof r === 'object' ? r?.email : r) }))
        .filter((r) => Boolean(r.email))
    : undefined;

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: toList,
    bcc: bccList && bccList.length ? bccList : undefined,
    subject: options.subject,
    htmlContent: options.html,
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  const responseText = await response.text();
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = { raw: responseText };
  }

  if (!response.ok) {
    const errorMsg = responseData?.message || responseText.slice(0, 300);
    throw new Error(`Brevo API HTTP ${response.status}: ${errorMsg}`);
  }

  console.log(`[EMAIL SERVICE] Brevo API accepted message ${responseData?.messageId} for ${toList.map((t) => t.email).join(', ')}`);
  return responseData;
};

const sendSmtpMail = async (options) => {
  const config = getMailConfig();
  let lastError;
  for (const port of getTransportPorts()) {
    try {
      const transporter = createSmtpTransporter(port);
      const mailOptions = {
        ...options,
        from: options.from || `"FlowSynq" <${config.from}>`,
      };
      const result = await transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`SMTP send attempt failed on port ${port}:`, error.code || error.message);
    }
  }
  throw lastError;
};

const sendMail = async (options) => {
  let lastError = null;

  // 1. Try Resend HTTP API if configured (Port 443, Render friendly)
  if (useResend()) {
    try {
      const result = await sendResendMail(options);
      console.log(`[EMAIL SERVICE] Sent email to ${options.to} via Resend API.`);
      return result;
    } catch (error) {
      console.error('[EMAIL SERVICE] Resend API failed:', error.message);
      lastError = error;
      if (process.env.NODE_ENV === 'production' && !process.env.EMAIL_DEV_FALLBACK) {
        throw error;
      }
    }
  }

  // 2. Try Brevo REST API v3 if configured (Port 443, Render friendly)
  if (useBrevoApi()) {
    try {
      const result = await sendBrevoApiMail(options);
      console.log(`[EMAIL SERVICE] Sent email to ${options.to} via Brevo API. MessageId:`, result?.messageId);
      return result;
    } catch (error) {
      console.error('[EMAIL SERVICE] Brevo API failed:', error.message);
      lastError = error;
      if (process.env.NODE_ENV === 'production' && !process.env.EMAIL_DEV_FALLBACK) {
        throw error;
      }
    }
  }

  // 3. Try SMTP (Gmail or custom SMTP - works great locally)
  const config = getMailConfig();
  if (config.isComplete) {
    try {
      const result = await sendSmtpMail(options);
      console.log(`[EMAIL SERVICE] Sent email to ${options.to} via SMTP (${config.provider}).`);
      return result;
    } catch (error) {
      console.error(`[EMAIL SERVICE] SMTP send failed (${config.provider}):`, error.message);
      lastError = error;
    }
  } else if (!lastError) {
    lastError = new Error('No valid email provider (Resend, Brevo API, or complete SMTP) is configured.');
  }

  // 4. Graceful Fallback Mode:
  // Used in development or when explicitly enabled, or on Render when NO API key was set.
  const allowFallback =
    process.env.NODE_ENV !== 'production' ||
    process.env.EMAIL_DEV_FALLBACK === 'true' ||
    (isRenderEnvironment() && !useBrevoApi() && !useResend());

  if (allowFallback) {
    logEmailFallback(options, lastError ? lastError.message : 'No outbound email provider configured');
    return {
      messageId: `fallback-${Date.now()}@flowsynq.local`,
      fallback: true,
      deliveredToConsole: true,
      warning: lastError?.message,
    };
  }

  throw lastError;
};

const verifyEmailConnection = async () => {
  // 1. Resend API
  if (useResend()) {
    try {
      const response = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${cleanEnv(process.env.RESEND_API_KEY)}` },
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        return { ok: true, provider: 'resend', mode: 'https-api' };
      }
    } catch (e) {
      console.error('Resend verification failed:', e.message);
    }
  }

  // 2. Brevo REST API
  if (useBrevoApi()) {
    try {
      const apiKey = cleanEnv(process.env.BREVO_API_KEY);
      const configuredSender = extractEmailAddress(process.env.EMAIL_FROM || process.env.EMAIL_USER);

      const [accountRes, sendersRes] = await Promise.allSettled([
        fetch('https://api.brevo.com/v3/account', {
          headers: { 'api-key': apiKey },
          signal: AbortSignal.timeout(10000),
        }),
        fetch('https://api.brevo.com/v3/senders', {
          headers: { 'api-key': apiKey },
          signal: AbortSignal.timeout(10000),
        }),
      ]);

      if (accountRes.status === 'fulfilled' && accountRes.value.ok) {
        const accountData = await accountRes.value.json().catch(() => ({}));
        let verifiedSenders = [];
        let senderIsVerified = false;

        if (sendersRes.status === 'fulfilled' && sendersRes.value.ok) {
          const sendersData = await sendersRes.value.json().catch(() => ({}));
          verifiedSenders = (sendersData?.senders || [])
            .filter((s) => s.active)
            .map((s) => s.email);
          senderIsVerified = verifiedSenders.some(
            (e) => e.toLowerCase() === configuredSender.toLowerCase()
          );
        }

        return {
          ok: true,
          provider: 'brevo-api',
          mode: 'https-api',
          accountEmail: accountData?.email,
          configuredSender,
          senderIsVerified,
          verifiedSenders,
          warning: !senderIsVerified
            ? `EMAIL_FROM (${configuredSender}) is NOT verified in your Brevo senders list! Verified senders: [${verifiedSenders.join(', ')}]. In Brevo, go to Senders and add/verify ${configuredSender}.`
            : undefined,
          message: senderIsVerified
            ? 'Brevo API key and sender verified successfully.'
            : 'Brevo API key valid, but EMAIL_FROM may not be verified.',
        };
      }
    } catch (e) {
      console.error('Brevo API verification failed:', e.message);
    }
  }

  // 3. SMTP Verification
  const config = getMailConfig();
  if (config.isComplete) {
    let lastError;
    for (const port of getTransportPorts()) {
      try {
        const transporter = createSmtpTransporter(port);
        await transporter.verify();
        return { ok: true, provider: config.provider, port, mode: 'smtp' };
      } catch (error) {
        lastError = error;
        console.error(`SMTP verification failed on port ${port}:`, error.code || error.message);
      }
    }
    if (isRenderEnvironment()) {
      return {
        ok: true,
        provider: 'render-fallback',
        mode: 'fallback',
        warning: 'Render Free Tier blocks direct SMTP (ports 25, 465, 587). Email fallback logging is active. For production delivery, configure RESEND_API_KEY or BREVO_API_KEY.',
      };
    }
    throw lastError;
  }

  if (process.env.NODE_ENV !== 'production' || isRenderEnvironment()) {
    return {
      ok: true,
      provider: 'dev-fallback',
      mode: 'fallback',
      message: 'Console fallback active (no external provider configured).',
    };
  }

  throw new Error('No email provider configured. Please set RESEND_API_KEY, BREVO_API_KEY, or SMTP credentials.');
};

const getEmailProvider = () => {
  if (useResend()) return 'resend';
  if (useBrevoApi()) return 'brevo-api';
  const config = getMailConfig();
  if (config.isComplete) return config.provider;
  return 'dev-fallback';
};

// --- Transactional Email Functions ---

const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      to: email,
      subject: 'Verify your FlowSynq Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #0ea5e9; text-align: center;">Welcome to FlowSynq</h2>
          <p style="font-size: 16px; color: #334155;">Hi there,</p>
          <p style="font-size: 16px; color: #334155;">Thank you for registering. Please use the following 6-digit OTP to verify your email address. This code is valid for <strong>2 minutes</strong>.</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0ea5e9;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #64748b;">If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 FlowSynq. All rights reserved.</p>
        </div>
      `,
    };

    const info = await sendMail(mailOptions);
    console.log('OTP Email sent: %s', info?.messageId || 'ok');
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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <h2 style="color: #0ea5e9; text-align: center;">Your FlowSynq Demo Access is Approved</h2>
        <p style="font-size: 16px; color: #334155;">Hi there,</p>
        <p style="font-size: 16px; color: #334155;">Your FlowSynq demo account has been approved and activated. Here are your temporary login credentials:</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <p style="margin: 6px 0; font-size: 15px; color: #334155;"><strong>Username:</strong> <code style="color: #0ea5e9; font-weight: bold;">${username}</code></p>
          <p style="margin: 6px 0; font-size: 15px; color: #334155;"><strong>Password:</strong> <code style="color: #0ea5e9; font-weight: bold;">${password}</code></p>
          <p style="margin: 6px 0; font-size: 14px; color: #64748b;"><strong>Expires:</strong> ${new Date(expiresAt).toLocaleString()}</p>
        </div>
        <p style="font-size: 14px; color: #64748b;">This account has pre-loaded port demonstration data.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 FlowSynq. All rights reserved.</p>
      </div>
    `,
  });
};

const sendAdminApprovalEmail = async (adminEmail, requestDetails, approvalLink) => {
  try {
    const targetEmail = adminEmail || cleanEnv(process.env.ADMIN_EMAIL) || cleanEnv(process.env.EMAIL_USER);
    const roleFormatted = requestDetails.role.charAt(0).toUpperCase() + requestDetails.role.slice(1);
    const mailOptions = {
      to: targetEmail,
      subject: `New Role Request - ${roleFormatted}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #0ea5e9;">A new user is requesting access to the platform:</h2>
          <p><strong>Name:</strong> ${requestDetails.fullName}</p>
          <p><strong>Email:</strong> ${requestDetails.email}</p>
          <p><strong>Requested Role:</strong> ${roleFormatted}</p>
          <p><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
          <div style="margin-top: 30px; display: flex; gap: 10px;">
            <a href="${approvalLink}&action=approve" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Approve Request</a>
            <a href="${approvalLink}&action=reject" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reject Request</a>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 FlowSynq. All rights reserved.</p>
        </div>
      `,
    };

    const info = await sendMail(mailOptions);
    console.log('Admin approval email sent: %s', info?.messageId || 'ok');
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
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 FlowSynq. All rights reserved.</p>
        </div>
      `,
    };

    const info = await sendMail(mailOptions);
    console.log('Approval success OTP email sent: %s', info?.messageId || 'ok');
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
          <p style="font-size: 16px; color: #334155;">We regret to inform you that your request to join FlowSynq as an <strong>${formattedRole}</strong> has been denied by the administration.</p>
          <p style="font-size: 14px; color: #64748b; margin-top: 20px;">If you believe this is a mistake or have any questions, please contact our support team.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 FlowSynq. All rights reserved.</p>
        </div>
      `,
    };

    const info = await sendMail(mailOptions);
    console.log('Approval rejection email sent: %s', info?.messageId || 'ok');
    return true;
  } catch (error) {
    console.error('Error sending approval rejection email:', error);
    throw new Error('Failed to send approval rejection email.');
  }
};

const sendDemandApprovalEmail = async ({ to, analystName, region, date, batchId }) => {
  try {
    const formattedDate = date ? new Date(date).toLocaleDateString() : 'N/A';
    const recipientName = analystName || 'Analyst';
    const mailOptions = {
      to,
      subject: `Demand Submission Approved - ${region || 'Port Operations'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #0ea5e9; text-align: center;">Demand Submission Approved</h2>
          <p style="font-size: 16px; color: #334155;">Hi ${recipientName},</p>
          <p style="font-size: 16px; color: #334155;">Your demand data submission has been reviewed and approved by the port administrator.</p>
          <div style="background-color: #f8fafc; padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 6px 0; color: #334155;"><strong>Region / Port:</strong> ${region || 'Default'}</p>
            <p style="margin: 6px 0; color: #334155;"><strong>Date:</strong> ${formattedDate}</p>
            ${batchId ? `<p style="margin: 6px 0; color: #334155;"><strong>Batch ID:</strong> ${batchId}</p>` : ''}
            <p style="margin: 6px 0; color: #10b981; font-weight: bold;">Status: Approved & Synced</p>
          </div>
          <p style="font-size: 14px; color: #64748b;">The operational numbers and commodity entries are now locked into the system for planning and analytics.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 FlowSynq. Automated operations notification.</p>
        </div>
      `,
    };
    const info = await sendMail(mailOptions);
    console.log('Demand approval email sent: %s', info?.messageId || 'ok');
    return true;
  } catch (error) {
    console.error('Error sending demand approval email:', error);
    return false;
  }
};

const sendDemandRejectionEmail = async ({ to, analystName, region, date, batchId, reason }) => {
  try {
    const formattedDate = date ? new Date(date).toLocaleDateString() : 'N/A';
    const recipientName = analystName || 'Analyst';
    const mailOptions = {
      to,
      subject: `Demand Submission Needs Correction - ${region || 'Port Operations'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ef4444; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #ef4444; text-align: center;">Demand Submission Rejected</h2>
          <p style="font-size: 16px; color: #334155;">Hi ${recipientName},</p>
          <p style="font-size: 16px; color: #334155;">Your demand data submission was reviewed and rejected by the port administrator.</p>
          <div style="background-color: #fef2f2; padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px solid #fca5a5;">
            <p style="margin: 6px 0; color: #7f1d1d;"><strong>Region / Port:</strong> ${region || 'Default'}</p>
            <p style="margin: 6px 0; color: #7f1d1d;"><strong>Date:</strong> ${formattedDate}</p>
            ${batchId ? `<p style="margin: 6px 0; color: #7f1d1d;"><strong>Batch ID:</strong> ${batchId}</p>` : ''}
            ${reason ? `<p style="margin: 6px 0; color: #991b1b;"><strong>Reason:</strong> ${reason}</p>` : ''}
          </div>
          <p style="font-size: 14px; color: #64748b;">Please review the notes, make the necessary corrections, and resubmit.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; 2026 FlowSynq. Automated operations notification.</p>
        </div>
      `,
    };
    const info = await sendMail(mailOptions);
    console.log('Demand rejection email sent: %s', info?.messageId || 'ok');
    return true;
  } catch (error) {
    console.error('Error sending demand rejection email:', error);
    return false;
  }
};

const sendEmergencyBroadcastEmail = async (users, alertData) => {
  try {
    const bccList = (Array.isArray(users) ? users : [])
      .map(u => (typeof u === 'string' ? u : u?.email))
      .filter(Boolean);

    if (bccList.length === 0) return true;

    const fromAddress = cleanEnv(process.env.EMAIL_FROM || process.env.EMAIL_USER) || 'emergency@flowsynq.org';

    const mailOptions = {
      from: `"FlowSynq Emergency System" <${fromAddress}>`,
      to: fromAddress,
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
          <p style="font-size: 12px; color: #991b1b; text-align: center;">&copy; 2026 FlowSynq. This is an automated emergency broadcast.</p>
        </div>
      `,
    };

    const info = await sendMail(mailOptions);
    console.log(`Emergency broadcast sent to ${bccList.length} users. MessageId: ${info?.messageId || 'ok'}`);
    return true;
  } catch (error) {
    console.error('Error sending emergency broadcast email:', error);
    return false;
  }
};

module.exports = {
  getEmailProvider,
  verifyEmailConnection,
  sendMail,
  sendOTPEmail,
  sendDemoCredentialsEmail,
  sendAdminApprovalEmail,
  sendApprovalSuccessOTPEmail,
  sendApprovalRejectionEmail,
  sendDemandApprovalEmail,
  sendDemandRejectionEmail,
  sendEmergencyBroadcastEmail,
};
