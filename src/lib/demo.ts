/**
 * Demo-mode flag.
 *
 * Set EXPO_PUBLIC_DEMO_MODE=true in your .env file to run the app
 * completely offline with realistic fixture data.
 * All API modules check this flag and short-circuit to fixtures.
 */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
