const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const TempUser = require('../models/TempUser');
const RoleRequest = require('../models/RoleRequest');
const { sendOTPEmail, sendAdminApprovalEmail, sendApprovalSuccessOTPEmail, sendApprovalRejectionEmail } = require('../utils/emailService');
const { ALLOWED_COMMODITIES, normalizeCommodity } = require('../constants/commodities');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const passwordStrongEnough = (password) => {
  return /^(?=.{8,})(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/.test(password);
};

const normalizeString = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeEmail = (value) => {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
};

const getResolvedPortName = (user) => {
  const fromPortName = normalizeString(user?.portName);
  const fromPort = normalizeString(user?.port);
  return fromPortName || fromPort || process.env.DEFAULT_PORT_NAME || 'default';
};

const buildUserResponse = (userDoc) => {
  const user = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc;
  const resolvedPortName = getResolvedPortName(user);

  return {
    ...user,
    country: user.country || '',
    portName: resolvedPortName,
    port: resolvedPortName,
    profilePicture: user.profilePicture || '',
    exportCommodities: Array.isArray(user.exportCommodities) ? user.exportCommodities : [],
  };
};

const parseExportCommodities = (input) => {
  const raw = Array.isArray(input) ? input : [];
  const normalized = raw.map(normalizeCommodity).filter(Boolean);
  const invalid = normalized.filter((item) => !ALLOWED_COMMODITIES.includes(item));
  if (invalid.length) {
    return { ok: false, message: `Invalid commodity types: ${invalid.join(', ')}` };
  }
  return { ok: true, value: Array.from(new Set(normalized)) };
};

// --- NEW OTP FLOW ---

exports.initiateRegistration = async (req, res) => {
  try {
    const {
      fullName,
      username,
      email,
      country,
      role,
      portName,
      port,
      exportCommodities,
    } = req.body;

    const normalizedFullName = normalizeString(fullName);
    const normalizedUsername = normalizeString(username);
    const normalizedEmail = normalizeEmail(email);
    const normalizedCountry = normalizeString(country);
    const normalizedRole = normalizeString(role).toLowerCase();
    const normalizedPortName = normalizeString(portName || port);

    if (
      !normalizedFullName ||
      !normalizedUsername ||
      !normalizedEmail ||
      !normalizedCountry ||
      !normalizedRole
    ) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (normalizedRole !== 'admin' && !normalizedPortName) {
      return res.status(400).json({ message: 'Port name is required for this role.' });
    }

    const parsedCommodities = parseExportCommodities(exportCommodities);
    if (!parsedCommodities.ok) {
      return res.status(400).json({ message: parsedCommodities.message });
    }

    if (
      normalizedRole === 'admin' &&
      normalizedEmail !== process.env.ADMIN_EMAIL?.toLowerCase()
    ) {
      return res.status(403).json({
        message: 'Admin registration requires the configured admin email.',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Email or username already registered.' });
    }

    const existingPendingRequest = await RoleRequest.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
      status: 'pending'
    });

    if (existingPendingRequest) {
      return res.status(409).json({ message: 'You already have a pending registration request.' });
    }

    // New logic: Admin approval required for Operator and Analyst
    if (normalizedRole === 'operator' || normalizedRole === 'analyst') {
      const token = crypto.randomBytes(32).toString('hex');

      await RoleRequest.create({
        fullName: normalizedFullName,
        username: normalizedUsername,
        email: normalizedEmail,
        country: normalizedCountry,
        role: normalizedRole,
        portName: normalizedRole === 'admin' ? '' : normalizedPortName,
        exportCommodities: parsedCommodities.value,
        token
      });

      const approvalLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/admin/approve-request?token=${token}`;

      try {
        await sendAdminApprovalEmail(process.env.EMAIL_USER, {
          fullName: normalizedFullName,
          email: normalizedEmail,
          role: normalizedRole
        }, approvalLink);
      } catch (emailError) {
        console.error('Failed to send admin approval email:', emailError);
      }

      return res.status(200).json({
        message: 'Your request has been submitted to the admin for approval. You will receive an email once approved.',
        email: normalizedEmail,
        pendingApproval: true
      });
    }

    // Organization and Admin flow (immediate OTP)
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now

    // Upsert TempUser
    await TempUser.findOneAndUpdate(
      { email: normalizedEmail },
      {
        fullName: normalizedFullName,
        username: normalizedUsername,
        country: normalizedCountry,
        role: normalizedRole,
        portName: normalizedRole === 'admin' ? '' : normalizedPortName,
        exportCommodities: parsedCommodities.value,
        otp,
        otpExpiresAt,
      },
      { upsert: true, new: true }
    );

    // Send Email
    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({
        message: 'Registration initiated, but failed to send verification email. Please check your SMTP settings.',
        error: emailError.message
      });
    }

    return res.status(200).json({
      message: 'OTP sent to your email. Please verify to continue.',
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Initiate registration error:', error);
    return res.status(500).json({ message: 'Failed to initiate registration. Please try again.' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    const tempUser = await TempUser.findOne({ email: normalizedEmail });

    if (!tempUser) {
      return res.status(404).json({ message: 'Registration session expired. Please start over.' });
    }

    if (tempUser.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    if (new Date() > tempUser.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    return res.status(200).json({ message: 'OTP verified successfully.', email: normalizedEmail });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
};

exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const tempUser = await TempUser.findOne({ email: normalizedEmail });

    if (!tempUser) {
      return res.status(404).json({ message: 'Registration session expired. Please start over.' });
    }

    // Generate new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 1 * 60 * 1000); // 1 minute from now

    tempUser.otp = otp;
    tempUser.otpExpiresAt = otpExpiresAt;
    await tempUser.save();

    // Send Email
    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error('Resend email failed:', emailError);
      return res.status(500).json({
        message: 'Failed to send a new verification email. Please check your SMTP settings.',
        error: emailError.message
      });
    }

    return res.status(200).json({
      message: 'New OTP sent to your email.',
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ message: 'Failed to resend OTP. Please try again.' });
  }
};

exports.register = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    if (!passwordStrongEnough(password)) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters, include upper and lower case letters, a number, and a special character.',
      });
    }

    const tempUser = await TempUser.findOne({ email: normalizedEmail });

    if (!tempUser) {
      return res.status(404).json({ message: 'Registration session expired or invalid. Please start over.' });
    }

    // Check if user was already created (race condition)
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: tempUser.username }],
    });

    if (existingUser) {
      await TempUser.deleteOne({ email: normalizedEmail });
      return res.status(409).json({ message: 'Email or username already registered.' });
    }

    const user = await User.create({
      fullName: tempUser.fullName,
      username: tempUser.username,
      email: tempUser.email,
      password,
      country: tempUser.country,
      portName: tempUser.portName,
      role: tempUser.role,
      exportCommodities: tempUser.exportCommodities,
    });

    // Cleanup temp user
    await TempUser.deleteOne({ email: normalizedEmail });

    return res.status(201).json({
      message: 'Registration successful. Please sign in with your credentials.',
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        country: user.country || '',
        role: user.role,
        portName: getResolvedPortName(user),
        port: getResolvedPortName(user),
        profilePicture: user.profilePicture || '',
        isDemo: Boolean(user.isDemo),
        demoExpiresAt: user.demoExpiresAt || null,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: 'Username/email and password are required.' });
    }

    const searchValue = identifier.trim();

    const user = await User.findOne({
      $or: [{ username: searchValue }, { email: searchValue.toLowerCase() }],
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const resolvedPortName = getResolvedPortName(user);

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        portName: resolvedPortName,
        port: resolvedPortName,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        country: user.country || '',
        role: user.role,
        portName: resolvedPortName,
        port: resolvedPortName,
        profilePicture: user.profilePicture || '',
        isDemo: Boolean(user.isDemo),
        demoExpiresAt: user.demoExpiresAt || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json(buildUserResponse(user));
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ message: 'Unable to fetch profile.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const {
      fullName,
      email,
      username,
      password,
      country,
      portName,
      port,
      exportCommodities,
    } = req.body;

    if (fullName !== undefined) {
      user.fullName = normalizeString(fullName);
    }

    if (country !== undefined) {
      user.country = normalizeString(country);
    }

    const incomingPortName = portName !== undefined ? portName : port;
    if (incomingPortName !== undefined) {
      const normalizedPortName = normalizeString(incomingPortName);

      if (String(user.role).toLowerCase() !== 'admin' && !normalizedPortName) {
        return res.status(400).json({ message: 'Port name is required for this role.' });
      }

      user.portName = normalizedPortName;
    }

    if (email !== undefined) {
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedEmail) {
        return res.status(400).json({ message: 'Email cannot be empty.' });
      }

      if (normalizedEmail !== user.email) {
        const existingEmail = await User.findOne({ email: normalizedEmail });
        if (existingEmail && String(existingEmail._id) !== String(user._id)) {
          return res.status(409).json({ message: 'Email is already in use.' });
        }
        user.email = normalizedEmail;
      }
    }

    if (username !== undefined) {
      const normalizedUsername = normalizeString(username);

      if (!normalizedUsername) {
        return res.status(400).json({ message: 'Username cannot be empty.' });
      }

      if (normalizedUsername !== user.username) {
        const existingUsername = await User.findOne({ username: normalizedUsername });
        if (existingUsername && String(existingUsername._id) !== String(user._id)) {
          return res.status(409).json({ message: 'Username is already in use.' });
        }
        user.username = normalizedUsername;
      }
    }

    if (password) {
      if (!passwordStrongEnough(password)) {
        return res.status(400).json({
          message:
            'Password must be at least 8 characters, include upper and lower case letters, a number, and a special character.',
        });
      }
      user.password = password;
    }

    if (req.file) {
      user.profilePicture = `/uploads/${req.file.filename}`;
    }

    if (exportCommodities !== undefined) {
      const parsedCommodities = parseExportCommodities(exportCommodities);
      if (!parsedCommodities.ok) {
        return res.status(400).json({ message: parsedCommodities.message });
      }
      if (String(user.role).toLowerCase() === 'organization' && parsedCommodities.value.length === 0) {
        return res.status(400).json({ message: 'Organization must have at least one export commodity.' });
      }
      user.exportCommodities = parsedCommodities.value;
    }

    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password');

    return res.json({
      message: 'Profile updated successfully.',
      user: buildUserResponse(updatedUser),
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ message: 'Unable to update profile.' });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Email not found in Google credential.' });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check if user exists
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Account not found. Please register first.' });
    }

    // User exists, log them in
    const resolvedPortName = getResolvedPortName(user);

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role,
        portName: resolvedPortName,
        port: resolvedPortName,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Google login successful.',
      token,
      user: {
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        country: user.country || '',
        role: user.role,
        portName: resolvedPortName,
        port: resolvedPortName,
        profilePicture: user.profilePicture || '',
      },
    });

  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ message: 'Google login failed. Please try again.' });
  }
};

exports.approveRegistration = async (req, res) => {
  try {
    const { token, action = 'approve' } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Approval token is required.' });
    }

    const roleRequest = await RoleRequest.findOne({ token, status: 'pending' });

    if (!roleRequest) {
      return res.status(404).json({ message: 'Invalid or expired approval token.' });
    }

    if (action === 'reject') {
      roleRequest.status = 'rejected';
      await roleRequest.save();

      try {
        await sendApprovalRejectionEmail(roleRequest.email, roleRequest.role);
      } catch (emailError) {
        console.error('Failed to send approval rejection email:', emailError);
        return res.status(500).json({ message: 'Rejected, but failed to send rejection email to user.' });
      }

      return res.status(200).json({ message: 'Registration request rejected successfully.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert TempUser so the normal OTP flow takes over
    await TempUser.findOneAndUpdate(
      { email: roleRequest.email },
      {
        fullName: roleRequest.fullName,
        username: roleRequest.username,
        country: roleRequest.country,
        role: roleRequest.role,
        portName: roleRequest.portName,
        exportCommodities: roleRequest.exportCommodities,
        otp,
        otpExpiresAt,
      },
      { upsert: true, new: true }
    );

    roleRequest.status = 'approved';
    await roleRequest.save();

    try {
      await sendApprovalSuccessOTPEmail(roleRequest.email, roleRequest.role, otp);
    } catch (emailError) {
      console.error('Failed to send approval success OTP email:', emailError);
      return res.status(500).json({ message: 'Approved, but failed to send OTP email to user.' });
    }

    return res.status(200).json({ message: 'Registration approved successfully. User has been notified with an OTP.' });
  } catch (error) {
    console.error('Approve registration error:', error);
    return res.status(500).json({ message: 'Failed to approve registration. Please try again.' });
  }
};