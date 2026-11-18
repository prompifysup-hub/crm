import type { AuthProvider } from "ra-core";
import type { Sale } from "../../types";
import { CURRENT_USER } from "./currentUser";
import { dataProvider } from "./index";

/** The first team member (sales table), or the built-in user when there is none. */
export const getCurrentUser = async (): Promise<Sale> => {
  try {
    const { data } = await dataProvider.getList<Sale>("sales", {
      pagination: { page: 1, perPage: 1 },
      sort: { field: "created_at", order: "ASC" },
      filter: {},
    });
    return data[0] ?? CURRENT_USER;
  } catch {
    return CURRENT_USER;
  }
};

/** No login: the app always runs as the first team member, with full access. */
export const authProvider: AuthProvider = {
  login: async () => undefined,
  logout: async () => undefined,
  checkAuth: async () => undefined,
  checkError: async () => undefined,
  canAccess: async () => true,
  getIdentity: async () => {
    const user = await getCurrentUser();
    return {
      id: user.id,
      fullName: `${user.first_name} ${user.last_name}`,
      avatar: user.avatar?.src,
    };
  },
};
