const jwt = require('jsonwebtoken');
const Lead = require('../models/Lead');

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity-secret-key-12345';

// Authenticate JWT Token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required. Token missing or invalid format.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// Require Admin Role
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
  }
  next();
};

// Require Lead Ownership or Admin for lead modifications
const requireLeadOwnershipOrAdmin = async (req, res, next) => {
  try {
    const leadId = req.params.id;
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }

    // Check if member is trying to change assignment (assignedTo)
    if (req.user.role !== 'admin' && req.body && req.body.assignedTo !== undefined) {
      return res.status(403).json({ message: 'Forbidden: Only admins can reassign leads.' });
    }

    // Admins have full access
    if (req.user.role === 'admin') {
      req.lead = lead;
      return next();
    }

    // Members can only modify if lead is assigned to them
    if (lead.assignedTo && lead.assignedTo.toString() === req.user.id.toString()) {
      req.lead = lead;
      return next();
    }

    return res.status(403).json({ message: 'Forbidden: You can only modify leads assigned to you.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error checking lead permissions.', error: err.message });
  }
};

module.exports = {
  verifyToken,
  requireAdmin,
  requireLeadOwnershipOrAdmin,
  JWT_SECRET
};
