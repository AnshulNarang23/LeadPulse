const Lead = require('../models/Lead');
const ActivityLog = require('../models/ActivityLog');

// Helper to log activity
const createActivity = async ({ leadId, action, actorId = null, details = null }) => {
  try {
    await ActivityLog.create({
      leadId,
      action,
      actorId,
      details,
      timestamp: new Date()
    });
  } catch (err) {
    console.error('Failed to create activity log:', err);
  }
};

exports.captureLead = async (req, res) => {
  try {
    const { name, email, company, source } = req.body;

    const lead = new Lead({
      name,
      email: email.toLowerCase(),
      company: company || '',
      source: source || 'web_form',
      status: 'new'
    });

    await lead.save();

    await createActivity({
      leadId: lead._id,
      action: 'lead_created',
      actorId: null,
      details: { source: lead.source }
    });

    return res.status(201).json({
      message: 'Lead captured successfully',
      lead
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error capturing lead.', error: err.message });
  }
};

exports.getLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.assignedTo) {
      if (req.query.assignedTo === 'unassigned') {
        filter.assignedTo = null;
      } else {
        filter.assignedTo = req.query.assignedTo;
      }
    }

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(filter)
    ]);

    return res.status(200).json({
      leads,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching leads.', error: err.message });
  }
};

exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name email role');
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }
    return res.status(200).json({ lead });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching lead details.', error: err.message });
  }
};

exports.createLead = async (req, res) => {
  try {
    const { name, email, company, source, status, assignedTo } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    // Only admin can set assignment at creation time, or member can assign to self/leave null
    let targetAssignedTo = null;
    if (assignedTo) {
      if (req.user.role !== 'admin' && assignedTo !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: Only admins can assign leads to other members.' });
      }
      targetAssignedTo = assignedTo;
    }

    const lead = new Lead({
      name,
      email: email.toLowerCase(),
      company: company || '',
      source: source || 'internal',
      status: status || 'new',
      assignedTo: targetAssignedTo
    });

    await lead.save();

    await createActivity({
      leadId: lead._id,
      action: 'lead_created',
      actorId: req.user.id,
      details: { createdBy: req.user.name }
    });

    const populatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');

    return res.status(201).json({
      message: 'Lead created successfully',
      lead: populatedLead
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error creating lead.', error: err.message });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const lead = req.lead; // attached by requireLeadOwnershipOrAdmin middleware
    const { name, email, company, source, status, assignedTo } = req.body;

    const oldStatus = lead.status;
    const oldAssignedTo = lead.assignedTo ? lead.assignedTo.toString() : null;

    if (name) lead.name = name;
    if (email) lead.email = email.toLowerCase();
    if (company !== undefined) lead.company = company;
    if (source) lead.source = source;

    let statusChanged = false;
    if (status && status !== oldStatus) {
      lead.status = status;
      statusChanged = true;
    }

    let assignmentChanged = false;
    if (assignedTo !== undefined && req.user.role === 'admin') {
      const newAssigned = assignedTo === '' || assignedTo === null ? null : assignedTo;
      if (newAssigned !== oldAssignedTo) {
        lead.assignedTo = newAssigned;
        assignmentChanged = true;
      }
    }

    await lead.save();

    if (statusChanged) {
      await createActivity({
        leadId: lead._id,
        action: 'status_changed',
        actorId: req.user.id,
        details: { from: oldStatus, to: lead.status }
      });
    }

    if (assignmentChanged) {
      await createActivity({
        leadId: lead._id,
        action: 'assigned',
        actorId: req.user.id,
        details: { from: oldAssignedTo, to: lead.assignedTo }
      });
    }

    if (!statusChanged && !assignmentChanged) {
      await createActivity({
        leadId: lead._id,
        action: 'lead_updated',
        actorId: req.user.id
      });
    }

    const updatedLead = await Lead.findById(lead._id).populate('assignedTo', 'name email role');

    return res.status(200).json({
      message: 'Lead updated successfully',
      lead: updatedLead
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error updating lead.', error: err.message });
  }
};

exports.deleteLead = async (req, res) => {
  try {
    const leadId = req.params.id;
    const lead = await Lead.findByIdAndDelete(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found.' });
    }
    // Delete associated logs and notes
    await ActivityLog.deleteMany({ leadId });
    return res.status(200).json({ message: 'Lead deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting lead.', error: err.message });
  }
};

exports.getLeadActivity = async (req, res) => {
  try {
    const leadId = req.params.id;
    const logs = await ActivityLog.find({ leadId })
      .populate('actorId', 'name email role')
      .sort({ timestamp: -1 });

    return res.status(200).json({ activity: logs });
  } catch (err) {
    return res.status(500).json({ message: 'Error fetching activity logs.', error: err.message });
  }
};
