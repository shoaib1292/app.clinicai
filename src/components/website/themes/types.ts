// Theme system types for ClinicAI multi-tenant websites.
// Template = block arrangement. Theme = visual style (CSS variables).
// Brand color = single --website-primary override, independent concept.

export interface ThemeDefinition {
  id: string
  name: string
  previewColor: string    // CSS gradient/color for thumbnail
  cssVariables: Record<string, string>  // Injected as inline styles on root div
}
