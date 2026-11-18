import type { DataProvider, Identifier } from "ra-core";
import type { ConfigurationContextValue } from "../root/ConfigurationContext";
import type {
  Deal,
  Sale,
  SalesFormData,
  SignUpData,
} from "../types";

/** The data provider used by the CRM: the standard ra-core methods plus a few CRM-specific ones. */
export type CrmDataProvider = DataProvider & {
  signUp: (data: SignUpData) => Promise<{ id: string; email: string; password: string }>;
  salesCreate: (data: SalesFormData) => Promise<Sale>;
  salesUpdate: (
    id: Identifier,
    data: Partial<Omit<SalesFormData, "password">>,
  ) => Promise<Sale>;
  updatePassword: (id: Identifier) => Promise<true>;
  unarchiveDeal: (deal: Deal) => Promise<any>;
  isInitialized: () => Promise<boolean>;
  getConfiguration: () => Promise<ConfigurationContextValue>;
  updateConfiguration: (
    config: ConfigurationContextValue,
  ) => Promise<ConfigurationContextValue>;
};
