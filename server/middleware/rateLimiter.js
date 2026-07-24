const rateLimit = require('express-rate-limit');

const publicCaptureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many lead submissions from this IP, please try again after 15 minutes.'
  }
});

module.exports = {
  publicCaptureLimiter
};
