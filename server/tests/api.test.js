const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Note = require('../models/Note');
const ActivityLog = require('../models/ActivityLog');

let mongoServer;
let adminToken, memberToken, otherMemberToken;
let adminUser, memberUser, otherMemberUser;
let assignedLead, unassignedLead;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup seed users
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('TestPass123!', salt);

  adminUser = await User.create({
    name: 'Test Admin',
    email: 'admin.test@example.com',
    passwordHash,
    role: 'admin'
  });

  memberUser = await User.create({
    name: 'Test Member',
    email: 'member.test@example.com',
    passwordHash,
    role: 'member'
  });

  otherMemberUser = await User.create({
    name: 'Other Member',
    email: 'other.test@example.com',
    passwordHash,
    role: 'member'
  });

  // Login users to obtain JWT tokens
  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin.test@example.com', password: 'TestPass123!' });
  adminToken = adminRes.body.token;

  const memberRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'member.test@example.com', password: 'TestPass123!' });
  memberToken = memberRes.body.token;

  const otherMemberRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'other.test@example.com', password: 'TestPass123!' });
  otherMemberToken = otherMemberRes.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Lead Management Platform - Test Suite', () => {

  describe('1. Auth & Admin Route Protection (RBAC)', () => {
    it('should return 403 Forbidden when a member tries to access GET /api/users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${memberToken}`);
      
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('should return 403 Forbidden when a member tries to create a user via POST /api/users', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Hacker User',
          email: 'hacker@example.com',
          password: 'Password123!',
          role: 'admin'
        });

      expect(res.status).toBe(403);
    });

    it('should allow an admin to create a new user via POST /api/users and validate role enum', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Sales Rep',
          email: 'newrep@example.com',
          password: 'Password123!',
          role: 'member'
        });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('newrep@example.com');
      expect(res.body.user.role).toBe('member');
    });

    it('should return 400 Bad Request if admin tries to create user with an invalid role', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Super User',
          email: 'superuser@example.com',
          password: 'Password123!',
          role: 'superadmin' // invalid role
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid role');
    });
  });

  describe('2. Member Reassignment Restriction (RBAC Test)', () => {
    let testLead;

    beforeEach(async () => {
      testLead = await Lead.create({
        name: 'Reassignment Test Lead',
        email: 'reassign@example.com',
        company: 'Reassign Inc',
        status: 'new',
        assignedTo: memberUser._id
      });
    });

    it('should return 403 Forbidden when a member attempts to reassign a lead (including assignedTo field)', async () => {
      const res = await request(app)
        .patch(`/api/leads/${testLead._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          status: 'contacted',
          assignedTo: otherMemberUser._id // member trying to reassign!
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden: Only admins can reassign leads');
    });

    it('should allow an admin to reassign a lead to another member', async () => {
      const res = await request(app)
        .patch(`/api/leads/${testLead._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          assignedTo: otherMemberUser._id
        });

      expect(res.status).toBe(200);
      expect(res.body.lead.assignedTo._id.toString()).toBe(otherMemberUser._id.toString());
    });
  });

  describe('3. Public Lead Capture & Input Validation', () => {
    it('should return 400 Bad Request on public capture with malformed email or missing name', async () => {
      const res = await request(app)
        .post('/api/leads/capture')
        .send({
          name: '',
          email: 'invalid-email-address',
          company: 'Bad Data Ltd'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('should successfully submit public capture form and index lead in authenticated API', async () => {
      const captureRes = await request(app)
        .post('/api/leads/capture')
        .send({
          name: 'John Public',
          email: 'john.public@example.com',
          company: 'Public Co',
          source: 'web_form'
        });

      expect(captureRes.status).toBe(201);
      expect(captureRes.body.lead.name).toBe('John Public');

      // Verify the created lead appears in authenticated GET /api/leads
      const getRes = await request(app)
        .get('/api/leads?status=new')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      const foundLead = getRes.body.leads.find(l => l.email === 'john.public@example.com');
      expect(foundLead).toBeDefined();
      expect(foundLead.status).toBe('new');
    });
  });

  describe('4. Full Lifecycle & Ownership Permission Flow', () => {
    let lifecycleLead;

    it('Step A: Admin creates lead and assigns to member', async () => {
      const res = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Enterprise Opportunity',
          email: 'enterprise@corp.com',
          company: 'Enterprise Corp',
          assignedTo: memberUser._id
        });

      expect(res.status).toBe(201);
      lifecycleLead = res.body.lead;
      expect(lifecycleLead.assignedTo._id.toString()).toBe(memberUser._id.toString());
    });

    it('Step B: Member updates lead status to qualified', async () => {
      const res = await request(app)
        .patch(`/api/leads/${lifecycleLead._id}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          status: 'qualified'
        });

      expect(res.status).toBe(200);
      expect(res.body.lead.status).toBe('qualified');
    });

    it('Step C: Member adds a note to the lead', async () => {
      const res = await request(app)
        .post(`/api/leads/${lifecycleLead._id}/notes`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          text: 'Spoke with CFO, requirements confirmed.'
        });

      expect(res.status).toBe(201);
      expect(res.body.note.text).toBe('Spoke with CFO, requirements confirmed.');
    });

    it('Step D: Verify Activity Log contains accurate history', async () => {
      const res = await request(app)
        .get(`/api/leads/${lifecycleLead._id}/activity`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(200);
      const actions = res.body.activity.map(a => a.action);
      expect(actions).toContain('lead_created');
      expect(actions).toContain('status_changed');
      expect(actions).toContain('note_added');
    });

    it('Step E: Other member attempts to update status on assigned lead -> expect 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/leads/${lifecycleLead._id}`)
        .set('Authorization', `Bearer ${otherMemberToken}`)
        .send({
          status: 'won'
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('Forbidden');
    });

    it('Step F: Member attempts to delete lead -> expect 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/leads/${lifecycleLead._id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
    });

    it('Step G: Admin deletes lead -> expect 200 OK', async () => {
      const res = await request(app)
        .delete(`/api/leads/${lifecycleLead._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

});
