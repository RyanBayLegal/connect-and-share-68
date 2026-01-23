

# Bay Legal Branding Implementation Plan

Based on the uploaded reference images and logo, I will transform the intranet to match Bay Legal's professional corporate identity with their signature navy blue color scheme.

---

## Color Scheme Extracted from Reference

The Bay Legal design uses a distinctive color palette:

| Color | HSL Value | Usage |
|-------|-----------|-------|
| Deep Navy | 220 60% 15% | Primary backgrounds, sidebar |
| Medium Blue | 210 80% 45% | Primary buttons, links, accents |
| Light Blue | 210 70% 60% | Headings, hover states |
| Gold/Amber | 45 90% 55% | Accent highlights, badges |
| White | 0 0% 100% | Text on dark backgrounds |
| Light Gray | 220 15% 95% | Content backgrounds |

---

## Files to Modify

### 1. Logo and Branding Assets
- Copy the Bay Legal "B" logo to `src/assets/bay-legal-logo.webp`
- Add logo to sidebar header and login page

### 2. src/lib/constants.ts
- Update `APP_NAME` from "IntraConnect" to "Bay Legal Hub"
- Add company description constant

### 3. index.html
- Update page title to "Bay Legal Hub"
- Update meta descriptions and og tags

### 4. src/index.css (Design System)
Update CSS variables to Bay Legal colors:

```text
Light Mode:
- --background: Light gray-blue (220 20% 98%)
- --foreground: Deep navy (220 60% 15%)
- --primary: Medium blue (210 80% 45%)
- --primary-foreground: White
- --secondary: Light blue (210 30% 92%)
- --accent: Gold/amber (45 90% 55%)
- --sidebar-background: Deep navy (220 60% 15%)
- --sidebar-foreground: White
- --sidebar-primary: Light blue (210 70% 60%)

Dark Mode:
- --background: Very dark navy (220 60% 8%)
- --sidebar-background: Near-black navy (220 60% 6%)
- Adjusted accent colors for contrast
```

### 5. src/components/layout/AppSidebar.tsx
- Replace text logo "IC" with actual Bay Legal logo image
- Style header to match the navy theme with logo
- Adjust avatar fallback colors to match brand

### 6. src/pages/Login.tsx
- Add Bay Legal logo prominently
- Style with navy blue gradient background matching reference
- Update welcome text to "Bay Legal Knowledge Hub"
- Add diamond geometric pattern background (like reference)

### 7. src/pages/Dashboard.tsx
- Add welcome banner with Bay Legal branding
- Update stat card colors to use brand palette
- Add subtle geometric patterns matching reference design

---

## Visual Changes Summary

### Before (Current Generic)
- Gray/neutral color scheme
- Generic "IC" logo placeholder
- Standard corporate styling

### After (Bay Legal Branded)
- Deep navy sidebar with white text
- "B" logo in sidebar and login
- Light blue accent colors for links/buttons
- Gold accents for important highlights
- Professional legal firm aesthetic
- Diamond geometric background patterns (matching reference)

---

## Technical Details

### Logo Integration
```tsx
// AppSidebar.tsx - Header section
<SidebarHeader className="bg-[hsl(220,60%,15%)] border-b border-white/10 px-4 py-4">
  <div className="flex items-center gap-3">
    <img 
      src="/assets/bay-legal-logo.webp" 
      alt="Bay Legal" 
      className="h-10 w-10 rounded"
    />
    <div>
      <span className="text-lg font-semibold text-white">Bay Legal</span>
      <span className="text-xs text-white/70 block">Knowledge Hub</span>
    </div>
  </div>
</SidebarHeader>
```

### Login Page Hero
```tsx
// Login.tsx - Background with diamond pattern
<div className="min-h-screen flex items-center justify-center 
  bg-gradient-to-br from-[hsl(220,60%,15%)] to-[hsl(210,80%,25%)]
  relative overflow-hidden">
  {/* Diamond pattern overlay */}
  <div className="absolute inset-0 opacity-10" 
    style={{backgroundImage: 'url(...diamond-pattern...)'}} />
  
  {/* Login card */}
  <Card className="relative z-10 w-full max-w-md">
    <img src={logo} alt="Bay Legal" className="h-16 mx-auto mb-4" />
    <h1 className="text-2xl font-bold">Bay Legal, PC Hub</h1>
    <p>Your Knowledge Base for Policies, Resources, and Support</p>
    {/* ... form ... */}
  </Card>
</div>
```

### CSS Variables Update (excerpt)
```css
:root {
  --background: 220 20% 98%;
  --foreground: 220 60% 15%;
  --primary: 210 80% 45%;
  --primary-foreground: 0 0% 100%;
  --accent: 45 90% 55%;
  --sidebar-background: 220 60% 15%;
  --sidebar-foreground: 0 0% 100%;
  --sidebar-primary: 210 70% 60%;
}
```

---

## Implementation Order

1. Copy logo to assets folder
2. Update constants (APP_NAME, descriptions)
3. Update index.html meta tags
4. Update CSS variables in src/index.css
5. Redesign Login page with Bay Legal branding
6. Update AppSidebar with logo and navy styling
7. Adjust Dashboard welcome section
8. Test all pages for visual consistency

