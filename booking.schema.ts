export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  type: 'access' | 'refresh';
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenValidationResult {
  isValid: boolean;
  payload?: JwtPayload;
  error?: string;
}
