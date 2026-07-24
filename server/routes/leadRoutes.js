const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const noteController = require('../controllers/noteController');
const { verifyToken, requireAdmin, requireLeadOwnershipOrAdmin } = require('../middleware/auth');
const { validatePublicCapture } = require('../middleware/validators');
const { publicCaptureLimiter } = require('../middleware/rateLimiter');

// Public lead capture
router.post('/capture', publicCaptureLimiter, validatePublicCapture, leadController.captureLead);

// Authenticated routes
router.use(verifyToken);

router.get('/', leadController.getLeads);
router.post('/', leadController.createLead);
router.get('/:id', leadController.getLeadById);
router.patch('/:id', requireLeadOwnershipOrAdmin, leadController.updateLead);
router.delete('/:id', requireAdmin, leadController.deleteLead);

// Notes & Activity
router.post('/:id/notes', requireLeadOwnershipOrAdmin, noteController.addNote);
router.get('/:id/notes', noteController.getNotes);
router.get('/:id/activity', leadController.getLeadActivity);

module.exports = router;
