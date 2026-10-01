import rateLimit from 'express-rate-limit';

// Login and register: 10 tries per 15 minutes per person
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'on',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts. Please try again in 15 minutes.',
  },
});

// Everything else: 300 requests per 15 minutes per person
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  skip: () => process.env.NODE_ENV === 'test' && process.env.TEST_RATE_LIMIT !== 'on',
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});