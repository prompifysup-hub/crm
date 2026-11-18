import { mergeTranslations } from "ra-core";
import polyglotI18nProvider from "ra-i18n-polyglot";
import englishMessages from "ra-language-english";
import { englishCrmMessages } from "./englishCrmMessages";

const englishCatalog = mergeTranslations(englishMessages, englishCrmMessages);

export const i18nProvider = polyglotI18nProvider(() => englishCatalog, "en", [
  { locale: "en", name: "English" },
], { allowMissing: true });
