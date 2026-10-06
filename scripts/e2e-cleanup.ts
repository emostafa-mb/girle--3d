import { killListeners, killOrphanedWorkers } from './lib/postgres';

// Playwright force-kills the e2e server on Windows; sweep up anything it left behind.
killListeners([3100, 54331]);
killOrphanedWorkers();
