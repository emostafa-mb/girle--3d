/** Test-only credentials used by the e2e database. Never used outside the throwaway e2e DB. */
export const E2E = {
  owner: { name: 'E2E Owner', email: 'owner@example.com', password: 'OwnerPass-e2e-1' },
  viewer: { name: 'E2E Viewer', email: 'viewer@example.com', password: 'ViewerPass-e2e-1' },
} as const;
