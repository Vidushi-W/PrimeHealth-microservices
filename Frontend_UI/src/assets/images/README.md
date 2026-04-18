# Images Folder Structure for PrimeHealth

## Image Naming Convention

Please rename your images according to these guidelines for consistency:

### Hero Section
- `hero-main.jpg` - Large hero/banner image (recommended: 1920x1080px or wider)
- `hero-background.jpg` - Full-screen background (optional)

### Feature Section Icons/Images
- `feature-appointments.jpg` - For appointment booking feature
- `feature-doctors.jpg` - For doctor finder feature  
- `feature-telemedicine.jpg` - For video consultation feature
- `feature-symptom-checker.jpg` - For symptom checker feature
- `feature-insights.jpg` - For patient insights/analytics feature

### Trust & Social Proof
- `testimonial-doctor-1.jpg` - Doctor profile photo for testimonials
- `testimonial-doctor-2.jpg` - Doctor profile photo for testimonials
- `testimonial-patient-1.jpg` - Patient profile photo for testimonials
- `logo-partner-1.png` - Partner logo (e.g., hospital, clinic)
- `logo-partner-2.png` - Partner logo

### Section Images
- `dashboard-preview.jpg` - Screenshot or mockup of patient dashboard
- `appointment-flow.jpg` - Visual showing appointment booking process
- `doctor-profile.jpg` - Example doctor profile or team photo

## Format Guidelines
- **JPGs**: Use for photographs and hero images (quality: 80-85)
- **PNGs**: Use for logos, icons, and images with transparency
- **Recommended sizes:**
  - Hero: 1920x1080px (minimum), 2048x1440px (preferred for high-res)
  - Feature cards: 400x300px or 600x400px
  - Logos: 200x200px (min)
  - Testimonial photos: 120x120px (circular crop)

## Placement
Drop images into this `images/` folder and they'll be ready to use in components with paths like:
```jsx
import heroImage from '@/assets/images/hero-main.jpg';
```

Or use in img tags:
```jsx
<img src="/src/assets/images/feature-appointments.jpg" alt="..." />
```
