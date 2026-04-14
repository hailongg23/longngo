// Rate Limiting Configuration for Large Scale Travel System
export const RATE_LIMIT_CONFIG = {
  // Authentication endpoints - More lenient for large systems
  AUTH: {
    LOGIN: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 25, // 25 attempts per 5 minutes
      category: 'login',
    },
    REGISTER: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20, // 20 registrations per hour
      category: 'register',
    },
    PASSWORD_RESET: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 reset attempts per hour
      category: 'password_reset',
    },
    REFRESH_TOKEN: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      maxRequests: 30, // 30 refresh attempts per 5 minutes
      category: 'refresh',
    },
  },

  // Business endpoints - Very generous for large systems
  BUSINESS: {
    BOOKING_CREATE: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 10, // 10 bookings per minute
      category: 'booking_create',
    },
    TOURS_SEARCH: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 searches per minute
      category: 'tours_search',
    },
    TOUR_DETAILS: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 200, // 200 detail views per minute
      category: 'tour_details',
    },
  },

  // Admin endpoints - Moderate limits
  ADMIN: {
    USER_MANAGEMENT: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 50, // 50 admin actions per minute
      category: 'admin_users',
    },
    TOUR_MANAGEMENT: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30, // 30 tour management actions per minute
      category: 'admin_tours',
    },
  },

  // Email endpoints - Prevent spam
  EMAIL: {
    SEND_EMAIL: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20, // 20 emails per hour
      category: 'email_send',
    },
  },

  // Failed login blocking thresholds - More lenient for large systems
  SECURITY: {
    FAILED_LOGIN_THRESHOLDS: {
      LIGHT_BLOCK: { attempts: 10, duration: 15 * 60 }, // 15 minutes after 10 attempts
      MEDIUM_BLOCK: { attempts: 15, duration: 30 * 60 }, // 30 minutes after 15 attempts
      HEAVY_BLOCK: { attempts: 20, duration: 60 * 60 }, // 1 hour after 20 attempts
      SEVERE_BLOCK: { attempts: 25, duration: 2 * 60 * 60 }, // 2 hours after 25 attempts
    },
  },
};

// Helper function to get rate limit config
export function getRateLimitConfig(category: string, endpoint: string) {
  const categoryConfig = RATE_LIMIT_CONFIG[category.toUpperCase()];
  if (!categoryConfig) {
    throw new Error(`Rate limit category '${category}' not found`);
  }

  const endpointConfig = categoryConfig[endpoint.toUpperCase()];
  if (!endpointConfig) {
    throw new Error(
      `Rate limit endpoint '${endpoint}' not found in category '${category}'`,
    );
  }

  return endpointConfig;
}

// Default rate limit for unspecified endpoints
export const DEFAULT_RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute (very generous)
  category: 'default',
};
