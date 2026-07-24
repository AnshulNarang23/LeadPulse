const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');

const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already seeded. Skipping initial seed.');
      return;
    }

    console.log('Seeding initial database data...');

    // Password hash for AdminPass123! and MemberPass123!
    const salt = await bcrypt.genSalt(10);
    const adminHash = await bcrypt.hash('AdminPass123!', salt);
    const memberHash = await bcrypt.hash('MemberPass123!', salt);

    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      passwordHash: adminHash,
      role: 'admin'
    });

    const memberUser = await User.create({
      name: 'Sales Member',
      email: 'member@example.com',
      passwordHash: memberHash,
      role: 'member'
    });

    console.log('Created seed users: admin@example.com and member@example.com');

    // Create seed leads
    const lead1 = await Lead.create({
      name: 'Sarah Connor',
      email: 'sarah@cyberdyne.io',
      company: 'Cyberdyne Systems',
      source: 'web_form',
      status: 'contacted',
      assignedTo: memberUser._id
    });

    await ActivityLog.create([
      {
        leadId: lead1._id,
        action: 'lead_created',
        actorId: null,
        details: { source: 'web_form' }
      },
      {
        leadId: lead1._id,
        action: 'assigned',
        actorId: adminUser._id,
        details: { from: null, to: memberUser._id }
      },
      {
        leadId: lead1._id,
        action: 'status_changed',
        actorId: memberUser._id,
        details: { from: 'new', to: 'contacted' }
      }
    ]);

    await Note.create({
      leadId: lead1._id,
      authorId: memberUser._id,
      text: 'Introductory call completed. Interested in enterprise tier package.'
    });

    const lead2 = await Lead.create({
      name: 'Bruce Wayne',
      email: 'bwayne@wayneenterprises.com',
      company: 'Wayne Enterprises',
      source: 'referral',
      status: 'qualified',
      assignedTo: adminUser._id
    });

    await ActivityLog.create([
      {
        leadId: lead2._id,
        action: 'lead_created',
        actorId: adminUser._id,
        details: { source: 'referral' }
      },
      {
        leadId: lead2._id,
        action: 'status_changed',
        actorId: adminUser._id,
        details: { from: 'new', to: 'qualified' }
      }
    ]);

    await Note.create({
      leadId: lead2._id,
      authorId: adminUser._id,
      text: 'Budget approved for Q3. Preparing custom proposal.'
    });

    const lead3 = await Lead.create({
      name: 'Peter Parker',
      email: 'peter.parker@dailybugle.net',
      company: 'Daily Bugle',
      source: 'web_form',
      status: 'new',
      assignedTo: null
    });

    await ActivityLog.create({
      leadId: lead3._id,
      action: 'lead_created',
      actorId: null,
      details: { source: 'web_form' }
    });

    console.log('Seed completed successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
};

module.exports = seedDatabase;
