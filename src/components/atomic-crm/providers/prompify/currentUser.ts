import type { Sale } from "../../types";

/**
 * Fallback user when the `sales` table (the team) is empty. Normally the signed-in user is the
 * first row of `sales` (see authProvider.ts); there is no login screen.
 */
export const CURRENT_USER: Sale = {
  id: 0,
  first_name: "Jane",
  last_name: "Doe",
  email: "jane@example.com",
  administrator: true,
  user_id: "0",
};
