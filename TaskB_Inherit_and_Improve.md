# Task B - Inherit and Improve
### Codebase Assessment & Migration Strategy - LeadPulse

---

## 1. Assessment

### 1.1 What's wrong, and in what order

I'm treating this as: I've just been handed an earlier, rushed version of LeadPulse. It's live, it has real customers, and it can't go down while I fix it.

| Issue | What's actually happening | Why it matters | Priority |
|---|---|---|---|
| **Hardcoded secrets** | The MongoDB connection string and JWT secret are sitting in plain text in the source code. | Anyone with read access to the repo can connect straight to the production database, or mint a valid JWT for any user - including admin. | Immediate |
| **Unauthenticated endpoint** | One of the lead-data routes has no auth middleware on it. | Anyone can hit it with no login at all and pull real customer lead data. | Immediate |
| **Permission checks that only sort of work** | The role/ownership logic is written inline, differently, on different routes. | A member can end up doing things they shouldn't - like reassigning a lead that's currently theirs - because the check wasn't written consistently everywhere. | High |
| **No tests at all** | Zero coverage, anywhere. | Every change is a guess. We won't know something broke until a customer tells us. | High |
| **Business logic living in the route handlers** | Permission checks, status rules, DB calls - all mixed together in the same function as the HTTP plumbing. | Makes the logic impossible to test on its own and easy to duplicate slightly wrong in a second route later. | High |
| **Audit log writes that aren't really guaranteed** | The activity log write is a fire-and-forget promise, not awaited, not in a transaction. | If it fails, the lead update still goes through and the audit trail just... doesn't have that entry. Nobody notices until someone asks "wait, who changed this?" | Medium |
| **No real input validation** | `req.body` goes straight into a DB update call. | Malformed data, unexpected fields, type mismatches - none of it gets caught before it hits Mongo. | Medium |
| **Errors leak internals** | Generic try/catch, dumping `err.message` and sometimes the stack trace straight to the client. | Not catastrophic on its own, but it's a bad habit that also means nobody has real visibility into what's failing in production. | Medium |

### 1.2 Why the security stuff jumps ahead of the code-quality stuff

My first instinct, honestly, was to want to just start cleaning up the route handlers - that's the part that would annoy me every day as a developer. But that's not actually where the risk is. The hardcoded secrets and the open endpoint aren't waiting for someone to hit a bug. They're already exploitable, right now, without anyone doing anything wrong on our end. A messy codebase slows the team down over weeks. A leaked database password can be a very bad Tuesday. So those two get fixed first, full stop, before I touch anything structural.

### 1.3 Rotate the secret, or clean up the git history?

Once you find a secret sitting in a repo, there are two things people usually reach for:

1. Rotate it - new DB password, new JWT secret, both moved into environment variables, old ones killed.
2. Scrub it out of git history with something like `git-filter-repo` or BFG.

I'd rotate first and treat the history-scrubbing as optional cleanup, not the fix. Rewriting history means force-pushing, which breaks every branch anyone else has open and any CI run in flight - that's real pain for a real team, on a system that can't go down. And more to the point: scrubbing history doesn't actually undo anything if someone already cloned the repo before you scrub it. The secret is compromised the second it's committed, not the second someone finds it in the history. Rotating is the thing that actually closes the door.

I ran into a small-scale version of this exact situation while building LeadPulse for real. My `.env` was never committed, but at one point I pasted a generated `JWT_SECRET` into a chat while getting help debugging something - and the second that happened, I just generated a new one instead of trying to figure out whether the old one was "really" exposed or not. Same logic, smaller stakes: once it's left your machine in any form, assume it's gone and replace it.

---

## 2. Migration Plan

Security first, then make change safe, then structural cleanup. Nothing here takes the app down or freezes feature work - it all ships in small pieces against the running system.

### Week 1 - stop the bleeding
- Pull the DB connection string and JWT secret out into environment variables, rotate both, add `.env` to `.gitignore`, commit a `.env.example` so the next person knows what they need
- Add auth middleware to whatever route is currently missing it
- Add a pre-commit secret scanner (`gitleaks` + `husky`) so this specific mistake can't happen again without someone noticing immediately
- Add a real global error handler so we stop returning stack traces to clients

### Month 1 - make it safe to actually change things
- Start pulling logic out of route handlers into service modules, beginning with whatever touches leads directly
- Add input validation on the handful of highest-risk routes (auth, anything public-facing) - manually for now, more on why below
- Wrap lead updates and their activity log entry in one transaction so they can't drift apart
- Bring in Jest and Supertest, and actually write tests for the permission logic and status transitions first, since that's where the real risk is

### Quarter 1 - the stuff that isn't urgent but matters
- Index the fields we actually query on a lot (`status`, `assignedTo`)
- Add rate limiting to the public and auth endpoints
- Get CI running the linter, the secret scanner, and the test suite on every PR
- Decide, now that there's actually room to think about it, whether a schema validation library like Zod is worth standardizing on across the team

---

## 3. Refactor Demonstration

Endpoint: `PUT /api/leads/:id/status-and-assignment`

What it needs to do:
1. Admins can update any lead and reassign it. Members can only touch status on leads assigned to them, and can't reassign anything.
2. Status has to move `NEW → IN_PROGRESS → QUALIFIED → WON / LOST` in order. Reopening a closed lead means going back through `IN_PROGRESS` first. A lead can't be marked `WON` without someone assigned to it.
3. Every change to status or assignee writes an activity log entry, and that has to actually happen, not just usually happen.

### 3.1 Before - what I'd expect to find

No comments explaining any of this - that's part of the problem. The previous developer either didn't notice the issues or didn't have time to flag them, which is exactly how this kind of thing survives in production. Reading through it, three things stand out: the permission check looks like it blocks reassignment but doesn't fully close the gap for a member acting on their own lead; there's no check on whether a status jump is even legal, so `LOST` can go straight to `WON`; and the activity log write is fire-and-forget, outside any transaction, so a failure there leaves the lead updated with no record of it.

```javascript
// routes/leads.js - LEGACY INLINE IMPLEMENTATION
const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const ActivityLog = require('../models/ActivityLog');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "super_secret_jwt_key_12345";
const MONGO_URI = "mongodb+srv://admin:Password123!@cluster0.abcde.mongodb.net/leadpulse_prod";

router.put('/:id/status-and-assignment', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    const leadId = req.params.id;
    const { status, assignedTo, note } = req.body;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    if (req.user.role !== 'admin') {
      if (lead.assignedTo && lead.assignedTo.toString() !== req.user.id) {
        return res.status(403).json({ error: "You can only update your own leads" });
      }
      if (assignedTo && assignedTo !== req.user.id) {
        return res.status(403).json({ error: "Members cannot reassign leads to others" });
      }
    }

    const oldStatus = lead.status;
    const oldAssignee = lead.assignedTo;

    if (status) lead.status = status;
    if (assignedTo) lead.assignedTo = assignedTo;

    await lead.save();

    ActivityLog.create({
      leadId: lead._id,
      performedBy: req.user.id,
      action: 'STATUS_AND_ASSIGNMENT_UPDATE',
      details: { oldStatus, newStatus: status, oldAssignee, newAssignee: assignedTo, note }
    }).catch(err => {
      console.log("Failed to log activity", err);
    });

    return res.status(200).json({ success: true, data: lead });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;
```

### 3.2 After - pulled apart into something testable

Same behavior, split into an error hierarchy, a validation schema, a service, a thin controller, and a router. Kept it in plain JavaScript - that's what the real LeadPulse backend actually runs, so switching to TypeScript here just for the writeup would've been inconsistent with the real app.

**`errors/appError.js`**
```javascript
class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') { super(404, message); }
}
class ForbiddenError extends AppError {
  constructor(message = 'Forbidden action') { super(403, message); }
}
class ValidationError extends AppError {
  constructor(message, details = null) { super(400, message, details); }
}

module.exports = { AppError, NotFoundError, ForbiddenError, ValidationError };
```

**`validators/lead.validator.js`**
```javascript
const { z } = require('zod');

const updateLeadStatusSchema = z.object({
  body: z.object({
    status: z.enum(['NEW', 'IN_PROGRESS', 'QUALIFIED', 'WON', 'LOST']).optional(),
    assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid User ID format').optional(),
    note: z.string().max(1000).optional(),
  }).refine(data => data.status || data.assignedTo, {
    message: "At least one of 'status' or 'assignedTo' must be provided",
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Lead ID format'),
  })
});

module.exports = { updateLeadStatusSchema };
```

**`services/lead.service.js`**
```javascript
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const ActivityLog = require('../models/ActivityLog');
const { NotFoundError, ForbiddenError, ValidationError } = require('../errors/appError');

const ALLOWED_TRANSITIONS = {
  NEW: ['IN_PROGRESS', 'LOST'],
  IN_PROGRESS: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['WON', 'LOST'],
  WON: ['IN_PROGRESS'],
  LOST: ['IN_PROGRESS'],
};

class LeadService {
  async updateStatusAndAssignment(leadId, dto, user) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const lead = await Lead.findById(leadId).session(session);
      if (!lead) throw new NotFoundError(`Lead with ID ${leadId} not found`);

      this.validatePermissions(lead, dto, user);

      if (dto.status && dto.status !== lead.status) {
        this.validateStatusTransition(
          lead.status,
          dto.status,
          dto.assignedTo || (lead.assignedTo && lead.assignedTo.toString())
        );
      }

      const oldStatus = lead.status;
      const oldAssignee = lead.assignedTo ? lead.assignedTo.toString() : null;

      if (dto.status) lead.status = dto.status;
      if (dto.assignedTo) lead.assignedTo = new mongoose.Types.ObjectId(dto.assignedTo);

      await lead.save({ session });

      await ActivityLog.create(
        [{
          leadId: lead._id,
          performedBy: new mongoose.Types.ObjectId(user.id),
          action: 'STATUS_AND_ASSIGNMENT_UPDATE',
          details: {
            oldStatus,
            newStatus: lead.status,
            oldAssignee,
            newAssignee: lead.assignedTo ? lead.assignedTo.toString() : null,
            note: dto.note || null,
          }
        }],
        { session }
      );

      await session.commitTransaction();
      return lead;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  validatePermissions(lead, dto, user) {
    if (user.role === 'admin') return;

    const currentAssignee = lead.assignedTo ? lead.assignedTo.toString() : null;
    if (currentAssignee !== user.id) {
      throw new ForbiddenError('Members can only modify leads assigned directly to themselves');
    }
    if (dto.assignedTo && dto.assignedTo !== user.id) {
      throw new ForbiddenError('Members cannot reassign leads to other team members');
    }
  }

  validateStatusTransition(currentStatus, newStatus, targetAssignee) {
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new ValidationError(
        `Illegal status transition from '${currentStatus}' to '${newStatus}'. Allowed: [${allowed ? allowed.join(', ') : ''}]`
      );
    }
    if (newStatus === 'WON' && !targetAssignee) {
      throw new ValidationError("Lead cannot be marked as 'WON' without an assigned team member");
    }
  }
}

module.exports = LeadService;
```

**`controllers/lead.controller.js`**
```javascript
const LeadService = require('../services/lead.service');

class LeadController {
  constructor(leadService = new LeadService()) {
    this.leadService = leadService;
  }

  updateStatusAndAssignment = async (req, res, next) => {
    try {
      const updatedLead = await this.leadService.updateStatusAndAssignment(
        req.params.id,
        req.body,
        req.user
      );
      res.status(200).json({ success: true, message: 'Lead updated successfully', data: updatedLead });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = LeadController;
```

**`routes/lead.routes.js`**
```javascript
const express = require('express');
const router = express.Router();
const LeadController = require('../controllers/lead.controller');
const authenticate = require('../middleware/authenticate');
const validateRequest = require('../middleware/validateRequest');
const { updateLeadStatusSchema } = require('../validators/lead.validator');

const controller = new LeadController();

router.put(
  '/:id/status-and-assignment',
  authenticate,
  validateRequest(updateLeadStatusSchema),
  controller.updateStatusAndAssignment
);

module.exports = router;
```

### 3.3 What actually got better

- **You can test it without spinning up a server.** `LeadService` doesn't know `req` or `res` exist. I can call `validatePermissions` directly with a fake lead and a fake user and know in milliseconds whether it's right.
- **The reassignment bug is actually fixed, not patched around.** There's one function that decides who can do what, called the same way every time - not three slightly different inline checks scattered across routes that'll inevitably drift.
- **Illegal status jumps get rejected up front** instead of just... happening. `LOST` to `WON` in one step throws a clear error now.
- **The audit log can't silently go missing anymore.** The lead update and the log write share a transaction - if one fails, so does the other, instead of leaving a lead in a new state with no record of who changed it.
- **Errors are structured and don't leak internals.** Zod catches bad input before it reaches the service; the error types map to real status codes instead of `err.message` and a stack trace going straight to the client.

---

## 4. Standards, and Getting People to Actually Follow Them

### 4.1 What I'd put in place

- No secrets in the repo, ever - caught by a pre-commit scanner, not by someone remembering
- Route handlers stay thin - logic lives in services, tested on their own
- Validate incoming requests at the edge, starting manual on the riskiest routes, expanding once there's time to do it properly (more on this below)
- Any state change that matters (status, assignment) writes its audit log entry in the same transaction, no exceptions
- New business logic doesn't merge without at least a basic test covering the normal path and one denied case

There's one more I'd add specifically because I actually ran into it building LeadPulse: **registration should never be open to the public.** Early in the build, the plan I was working from had self-registration as a public route with nothing stopping a client from just sending `role: "admin"` in the request body. I caught it before writing any code, just by asking what would actually stop someone from doing that. The fix was simple - drop public registration, make account creation admin-only. It's an easy thing to miss once, and a bad thing to have live, which is exactly why I'd want it caught automatically rather than relying on someone noticing in review.

### 4.2 Adoption - the part people usually get wrong

Nobody actually reads a standards doc and changes their behavior because of it, especially not a team that's used to shipping fast. What works is making it hard to do the wrong thing by accident:

1. A secret scanner on pre-commit, so a leaked key never even makes it off someone's laptop
2. CI that actually blocks a merge if tests or lint fail - not a suggestion, a gate
3. A clean starter pattern for controllers/services that's genuinely faster to copy than to write inline logic from scratch

On the Zod question specifically - I wouldn't push the whole team onto a schema validation library on day one. For a small team that's mid-crisis stabilizing a live system, manual checks on the two or three highest-risk endpoints get real protection in place today, without also asking everyone to learn a new library while they're already under pressure. That's actually the same call I made on LeadPulse's own public capture form - plain manual validation, quick to write, easy to follow. I'd only bring in something heavier once the team has room to do it properly, which is why it's a Quarter 1 item above and not a Month 1 one.

---

*Produced for the Digital Heroes Full Stack Development qualification task, Task B.*
