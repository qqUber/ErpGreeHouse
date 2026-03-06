---
phase: 18
name: Enhanced Localization
milestone: v2.2 UI/UX Refactor
type: standard
---

<objective>
Implement comprehensive localization system with TypeScript interfaces for translation keys, type-safe translation hook, centralized string management, and fallback logic (EN → RU → SR).

Purpose: Enable multilingual support (RU, EN, SR) with strict type safety and unified translation management.
Output: Language enum, translation key types, type-safe hook, centralized dictionary, fallback logic implemented.
</objective>

<context>
@.gsd/PROJECT.md
@.gsd/ROADMAP.md
@.gsd/phases/15-refactor-preparation/15-RESEARCH.md
@.gsd/phases/16-foundation/16-PLAN.md
@.gsd/phases/17-role-based-ui/17-PLAN.md
</context>

<plans>

<plan id="01" name="Language Enum and TypeScript Interfaces">

<tasks>
  <task type="auto">
    <name>Create Language enum</name>
    <files>admin-ui/src/</files>
    <action>Create Language enum: { RU: "RU", EN: "EN", SR: "SR" }</action>
    <verify>Language enum exported and used</verify>
    <done>Language enum created</done>
  </task>

  <task type="auto">
    <name>Define translation key interfaces</name>
    <files>admin-ui/src/</files>
    <action>Create TypeScript interfaces for all translation key namespaces (common, menu, dashboard, customer, product, pos, etc.)</action>
    <verify>All namespace interfaces defined</verify>
    <done>Translation key interfaces created</done>
  </task>

  <task type="auto">
    <name>Create translation key constants</name>
    <files>admin-ui/src/</files>
    <action>Generate translation key constants matching the existing locale files structure</action>
    <verify>Constants match locale file keys</verify>
    <done>Translation key constants created</done>
  </task>
</tasks>

<verification>
TypeScript compilation passes, no type errors
</verification>

<success_criteria>
- Language enum {RU, EN, SR} implemented
- Translation key interfaces for all namespaces
- Translation key constants generated
</success_criteria>

<output>
After completion, create SUMMARY.md with enum and interface details
</output>

</plan>

<plan id="02" name="Type-Safe Translation Hook">

<tasks>
  <task type="auto">
    <name>Create useTranslation typed hook</name>
    <files>admin-ui/src/hooks/</files>
    <action>Create useAppTranslation hook with strict typing for translation keys</action>
    <verify>Hook returns typed t function</verify>
    <done>Type-safe hook created</done>
  </task>

  <task type="auto">
    <name>Configure i18next fallback</name>
    <files>admin-ui/src/i18n.ts</files>
    <action>Configure i18next with fallback chain: EN → RU → SR</action>
    <verify>Fallback configuration works</verify>
    <done>i18next configured</done>
  </task>

  <task type="auto">
    <name>Create translation helper utilities</name>
  <files>admin-ui/src/utils/</files>
  <action>Create translation helper functions for common patterns (formatCurrency, formatDate, etc.)</action>
  <verify>Helpers work correctly</verify>
  <done>Helper utilities created</done>
  </task>
</tasks>

<verification>
Translation hook works with type checking
</verification>

<success_criteria>
- useAppTranslation hook with strict typing
- i18next fallback EN → RU → SR configured
- Translation helper utilities created
</success_criteria>

<output>
After completion, create SUMMARY.md with hook and configuration details
</output>

</plan>

<plan id="03" name="Centralized Dictionary Structure">

<tasks>
  <task type="auto">
    <name>Restructure locale files</name>
  <files>admin-ui/src/locales/*.json</files>
  <action>Restructure locale files with nested keys following pattern: namespace.key.subkey</action>
  <verify>Locale files have consistent nested structure</verify>
  <done>Locale files restructured</done>
  </task>

  <task type="auto">
    <name>Create centralized translation loader</name>
  <files>admin-ui/src/</files>
  <action>Create utility to load and validate translations from centralized location</action>
  <verify>Loader works correctly</verify>
  <done>Translation loader created</done>
  </task>

  <task type="auto">
    <name>Add validation for translation completeness</name>
  <files>admin-ui/src/</files>
  <action>Create script to validate all languages have same keys (completeness check)</action>
  <verify>Validation script works</verify>
  <done>Validation created</done>
  </task>
</tasks>

<verification>
Locale files restructured, validation works
</verification>

<success_criteria>
- Nested translation key structure
- Centralized translation loader
- Translation completeness validation
</success_criteria>

<output>
After completion, create SUMMARY.md with dictionary structure
</output>

</plan>

<plan id="04" name="Migrate Hardcoded Text">

<tasks>
  <task type="auto">
    <name>Migrate App.tsx translations</name>
  <files>admin-ui/src/App.tsx</files>
    <action>Replace all hardcoded text in App.tsx with translation function calls</action>
    <verify>All text uses t() function</verify>
    <done>App.tsx migrated</done>
  </task>

  <task type="auto">
    <name>Migrate dashboard components</name>
  <files>admin-ui/src/components/dashboard/*.tsx</files>
    <action>Replace hardcoded text in dashboard components with translation calls</action>
    <verify>All dashboard text uses translations</verify>
    <done>Dashboards migrated</done>
  </task>

  <task type="auto">
    <name>Migrate key form components</name>
  <files>admin-ui/src/components/*.tsx</files>
    <action>Replace hardcoded text in forms with translation calls</action>
    <verify>All form text uses translations</verify>
    <done>Forms migrated</done>
  </task>

  <task type="auto">
    <name>Update locale files</name>
  <files>admin-ui/src/locales/*.json</files>
    <action>Add missing translation keys to all locale files</action>
    <verify>All languages have complete translations</verify>
    <done>Locale files updated</done>
  </task>
</tasks>

<verification>
Build succeeds, no hardcoded text remaining in migrated files
</verification>

<success_criteria>
- App.tsx uses translations
- Dashboard components use translations
- Form components use translations
- All locale files complete
</success_criteria>

<output>
After completion, create SUMMARY.md with migration details
</output>

</plan>

<plan id="05" name="Test Localization Coverage">

<tasks>
  <task type="auto">
    <name>Run i18n tests</task>
    <files>admin-ui/e2e/functional/i18n-format.spec.ts</file>
    <action>Run i18n functional tests to verify localization works</action>
    <verify>All i18n tests pass</verify>
    <done>i18n tests passed</done>
  </task>

  <task type="auto">
    <name>Verify language switching</name>
    <files>admin-ui/e2e/</files>
    <action>Verify language switching works correctly between RU/EN/SR</action>
    <verify>Language switching works</verify>
    <done>Language switching verified</done>
  </task>
</tasks>

<verification>
All localization tests pass
</verification>

<success_criteria>
- i18n tests pass
- Language switching verified
- No console errors in translations
</success_criteria>

<output>
After completion, create SUMMARY.md with test results
</output>

</plan>

</plans>

<verification>
All plans executed, build succeeds, tests pass
</verification>

<success_criteria>
- Language enum {RU, EN, SR} implemented
- TypeScript interfaces for translation keys
- Type-safe translation hook
- Fallback logic EN → RU → SR
- All user-visible text wrapped in translations
- Localization tests pass
</success_criteria>

<output>
After completion, create SUMMARY.md with:
- Phase completion status
- Translation key structure
- Migration results
- Test coverage
</output>
