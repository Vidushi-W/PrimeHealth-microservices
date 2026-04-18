# PrimeHealth Design System & Landing Page Documentation

## 🎨 Design Philosophy

The PrimeHealth design system is built on modern, clean principles inspired by premium healthcare platforms like Warwick Acoustics. The goal is to create a professional yet approachable experience that builds trust while remaining intuitive for all users.

### Core Design Principles
- **Clarity First**: Clear visual hierarchy and information architecture
- **Spacious Layout**: Generous padding and whitespace for breathing room
- **Consistent Styling**: Unified component library across all pages
- **Accessibility**: Color-blind friendly, readable text, logical tab order
- **Trust Building**: Professional colors, clean typography, secure messaging

---

## 🎯 Color Palette

### Primary Colors
- **Sea Blue** (`#2B97C7`): Main interactive elements, buttons, links
- **Brand Teal** (`#14B8A6`): Accent color for highlights
- **Ocean Depth** (`#0E7490`): Darker shade for emphasis

### Neutral Colors
- **White** (`#FFFFFF`): Backgrounds, cards, content areas
- **Gray-50 to Gray-900**: Text, borders, secondary backgrounds
- **Light Gray** (`#F3F9FC`): Soft backgrounds for sections

### Semantic Colors
- **Green-600**: Success states, positive actions
- **Amber-600**: Warnings, caution states
- **Red-600**: Errors, critical information

---

## 🔤 Typography

### Font Stack
- **Primary Font**: Inter, Poppins, or system sans-serif (specify in CSS)
- **Approach**: Clean, modern, highly readable

### Type Scale (Desktop-Optimized)
```
Hero:         48-72px font-bold (text-6xl-7xl)
Heading 1:    36-48px font-bold (text-5xl-6xl)
Heading 2:    28-36px font-bold (text-4xl-5xl)
Heading 3:    24-28px font-bold (text-3xl)
Subheading:   18-24px font-semibold (text-xl-2xl)
Body:         16px font-normal (text-base)
Small:        14px font-normal (text-sm)
Caption:      12px font-normal (text-xs)
```

### Font Weights
- **Bold (700)**: Headlines, CTAs, emphasis
- **Semibold (600)**: Section headers, labels
- **Normal (400)**: Body text, descriptions

---

## 📐 Spacing System

### Base Unit: 4px
Spacing follows a 4px base for consistency:

```
xs:  0.5rem  (2px)
sm:  1rem    (4px)
md:  1.5rem  (6px)
lg:  2rem    (8px)
xl:  3rem    (12px)
2xl: 4rem    (16px)
```

### Common Spacing Applications
- **Card Padding**: 1.5rem (md)
- **Section Padding**: 3rem vertical (xl), 1.5rem horizontal (md)
- **Element Gap**: 1rem (sm) to 2rem (lg)
- **Between Sections**: 6-8rem (py-24 to py-32)

---

## 🧩 Component Library

### Core Components Available

#### Card Component
```jsx
<Card className="hoverable">
  Content here
</Card>
```
- White background with border
- Hover effect with shadow and color shift
- Padding: 1.5rem
- Border radius: 0.75rem (rounded-xl)

#### Button Component
```jsx
<Button variant="primary|secondary|outline|ghost" size="sm|md|lg">
  Click me
</Button>
```

**Variants:**
- `primary`: Gradient blue button
- `secondary`: Gray background
- `outline`: Bordered button
- `ghost`: Text-only with hover background

**Sizes:**
- `sm`: px-4 py-2 text-sm
- `md`: px-6 py-3 text-base
- `lg`: px-8 py-4 text-lg

#### Input Component
```jsx
<Input
  label="Email"
  type="email"
  placeholder="user@example.com"
  error={errorMessage}
/>
```

#### Select Component
```jsx
<Select
  label="Role"
  options={[
    { value: 'patient', label: 'Patient' },
    { value: 'doctor', label: 'Doctor' }
  ]}
/>
```

#### Badge Component
```jsx
<Badge variant="default|success|warning|error|sea">
  Label
</Badge>
```

#### StatCard Component
```jsx
<StatCard
  icon="📊"
  label="Appointments"
  value="128"
  trend={{ positive: true, label: "+12% this month" }}
/>
```

#### Alert Component
```jsx
<Alert
  type="info|success|warning|error"
  title="Title"
  message="Description"
  onClose={() => {}}
/>
```

---

## 🎬 Landing Page Structure

### 1. Hero Section (`LandingHero.jsx`)
- **Purpose**: First impression, value proposition
- **Layout**: Single column, centered text
- **Key Elements**:
  - Badge with accent color
  - Large headline with gradient text
  - Subheadline explaining benefits
  - Two CTA buttons (primary + secondary)
  - Floating stat cards (animated)
  - Placeholder for hero image (1920x1080px)

### 2. Features Section (`FeaturesSection.jsx`)
- **Purpose**: Showcase 6 key features
- **Layout**: 3-column grid (responsive: 1 mobile, 2 tablet, 3 desktop)
- **Each Feature Card**:
  - Large emoji icon
  - Title (24px bold)
  - Description (16px regular)
  - Gradient background (subtle)
  - Hover effect (scale + shadow)

### 3. How It Works (`HowItWorks.jsx`)
- **Purpose**: Show 4-step process
- **Layout**: 4-column timeline
- **Step Cards**:
  - Circular numbered badge (sea blue gradient)
  - Title and description
  - Connection lines between steps
  - Mobile-friendly vertical layout

### 4. Benefits Section (`Benefits.jsx`)
- **Purpose**: Why choose PrimeHealth + social proof
- **Layout**: 2-column (image + content)
- **Left**: Placeholder image (1080x1080px)
- **Right**:
  - 4 benefit cards with icons
  - Trust metrics (ratings, user count, success rate)

### 5. Testimonials (`Testimonials.jsx`)
- **Purpose**: Build credibility
- **Layout**: 4-card grid + video section
- **Each Testimonial**:
  - 5-star rating
  - Quote text
  - Author with avatar (initials)
  - Role badge

### 6. CTA Section (`CTASection.jsx`)
- **Purpose**: Final conversion call-to-action
- **Layout**: Full-width card with gradient background
- **Content**:
  - Headline + subheadline
  - Two buttons (primary + secondary)
  - Trust indicators (metric trio)
  - 3-column benefit cards

### 7. Footer (`Footer.jsx`)
- **Purpose**: Navigation, legal, engagement
- **Sections**:
  - Brand info + newsletter signup
  - 4-column link grid (Product, Company, Legal, Support)
  - Social media links
  - Bottom bar with compliance info

---

## 🔄 Navigation Component

### Desktop View
- Fixed header with logo
- Menu links (Home, Features, About, Contact)
- Auth buttons (Login, Sign Up)
- Smooth transitions

### Mobile View
- Hamburger menu
- Collapsible navigation
- Full-width mobile menu on click
- Touch-friendly spacing

---

## 📱 Responsive Design Strategy

### Breakpoints (Tailwind Default)
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Key Responsive Behaviors
- **Hero**: Single column on mobile → full-width hero
- **Feature Cards**: 1 column → 2 columns → 3 columns
- **Timeline**: Vertical line → horizontal line
- **Benefits**: Stacked → side-by-side
- **Testimonials**: 1 card → 2 cards → 4 cards

---

## 🎭 Auth Page Redesign

### Layout
- **Desktop**: 2-column (left: brand message, right: form)
- **Mobile**: Single column (form only)

### Left Side (Desktop Only)
- Brand headline + subheadline
- 3 feature checkmarks with descriptions
- Trust badges (users, compliance)

### Right Side (Form)
- Tab switcher (Login / Register)
- Error alert (conditional)
- Form fields with labels
- CTA button
- Switch to other tab link

### Form Fields
- Label above input
- Placeholder text for guidance
- Error state with red border + message
- Focus state: blue ring, smooth transition

---

## 🖼️ Image Folder Structure

All images should be placed in: `src/assets/images/`

### Naming Convention
```
hero-main.jpg                  // Hero section background
feature-appointments.jpg       // Feature card image
feature-doctors.jpg
feature-telemedicine.jpg
feature-symptom-checker.jpg
feature-insights.jpg
testimonial-doctor-1.jpg       // Profile photos
benefits-visual.jpg            // Large visual for benefits section
dashboard-preview.jpg          // App screenshots
```

### Image Specifications
- **Format**: JPG for photos (85% quality), PNG for logos/icons
- **Hero**: 1920x1080px minimum, 2048x1440px preferred
- **Feature Cards**: 400x300px or 600x400px
- **Testimonial Photos**: 120x120px (circular crop)
- **Logos**: 200x200px minimum

### How to Use Images
```jsx
import heroImage from '@/assets/images/hero-main.jpg';

<img 
  src={heroImage} 
  alt="Healthcare platform demonstration"
  className="w-full h-auto rounded-2xl"
/>
```

---

## ✨ Animation & Transitions

### Hover Effects
- **Buttons**: `hover:scale-105` + `hover:shadow-lg`
- **Cards**: `hover:shadow-hover` + `hover:border-sea/20`
- **Links**: `hover:text-sea` (color transition)

### Transitions
- **Duration**: `duration-300` (300ms) for most transitions
- **Timing**: `ease-in-out` for smooth motion
- **Properties**: `transition-all` or specific property

### Animations
- **Float**: Custom 3s infinite animation for floating elements
- **Pulse**: `animate-pulse` for loading states

---

## 🚀 Implementation Notes

### Colors in Tailwind
Use the color names directly:
```jsx
className="text-sea bg-brand-50 border-brand-200"
```

### Spacing
Use Tailwind spacing utilities:
```jsx
className="p-6 md:p-8 lg:p-12 mb-8 gap-4"
```

### Responsive Classes
Mobile-first approach:
```jsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
```

### Shadow Utilities
Custom shadows defined:
```jsx
className="shadow-card"     // Subtle (0 4px 12px)
className="shadow-hover"    // Prominent (0 12px 24px)
className="shadow-soft"     // Softer (0 16px 36px)
```

---

## 📋 Content Guidelines

### Headlines
- **Keep them punchy**: 6-10 words typically
- **Benefit-focused**: What does user gain?
- **Use gradients**: Apply `bg-clip-text bg-gradient-to-r from-sea to-teal-600 text-transparent`

### Subheadlines
- **Expand on headline**: Add 1-2 more details
- **Readable**: 16-20px on desktop
- **Emotional**: Appeal to user needs

### Call-to-Action Copy
- **Action-oriented**: "Get Started", "Book Now", "Sign Up"
- **Clear value**: Hint at benefit if possible
- **Urgency**: Consider "Start Free", "Join Now"

### Button Labels
- **Primary CTA**: Positive action (Sign Up, Get Started)
- **Secondary CTA**: Alternative (Learn More, Watch Demo)
- **Destructive**: Use red for delete/danger actions

---

## 🔍 Accessibility Checklist

- [ ] Color contrast ratio >= 4.5:1 for text
- [ ] Interactive elements have visible focus states
- [ ] Alt text for all images
- [ ] Semantic HTML (buttons, links, headings)
- [ ] Keyboard navigation works
- [ ] Form labels associated with inputs
- [ ] Error messages clear and actionable

---

## 📝 Version Control

This design system was created on **April 17, 2026** as PrimeHealth's comprehensive visual identity and component library. All components follow the established patterns for consistency across the platform.

For updates to colors, spacing, or typography, ensure:
1. Update the `tailwind.config.js` to reflect changes
2. Update this documentation
3. Rebuild and test across all pages
4. Maintain backward compatibility where possible

