# GMShooter v2 - UI/UX Guidelines

## Design Philosophy
GMShooter v2 follows a "Digital Serenity" design philosophy - clean, modern, and focused on user experience with minimal distractions.

## Color Palette

### Primary Colors
- **Primary Blue**: `#3B82F6` (Blue-500)
- **Primary Dark**: `#1E40AF` (Blue-800)
- **Primary Light**: `#DBEAFE` (Blue-100)

### Secondary Colors
- **Secondary Purple**: `#8B5CF6` (Purple-500)
- **Secondary Teal**: `#14B8A6` (Teal-500)

### Neutral Colors
- **White**: `#FFFFFF`
- **Light Gray**: `#F3F4F6` (Gray-100)
- **Medium Gray**: `#6B7280` (Gray-500)
- **Dark Gray**: `#1F2937` (Gray-800)
- **Black**: `#000000`

### Status Colors
- **Success**: `#10B981` (Green-500)
- **Warning**: `#F59E0B` (Amber-500)
- **Error**: `#EF4444` (Red-500)
- **Info**: `#3B82F6` (Blue-500)

## Typography

### Font Family
- **Primary**: Inter (system-ui fallback)
- **Monospace**: JetBrains Mono (for code/technical data)

### Font Sizes
- **Text-xs**: 0.75rem (12px)
- **Text-sm**: 0.875rem (14px)
- **Text-base**: 1rem (16px)
- **Text-lg**: 1.125rem (18px)
- **Text-xl**: 1.25rem (20px)
- **Text-2xl**: 1.5rem (24px)
- **Text-3xl**: 1.875rem (30px)
- **Text-4xl**: 2.25rem (36px)
- **Text-5xl**: 3rem (48px)

### Font Weights
- **Font-light**: 300
- **Font-normal**: 400
- **Font-medium**: 500
- **Font-semibold**: 600
- **Font-bold**: 700

## Spacing

### Base Unit: 0.25rem (4px)
- **Space-1**: 0.25rem (4px)
- **Space-2**: 0.5rem (8px)
- **Space-3**: 0.75rem (12px)
- **Space-4**: 1rem (16px)
- **Space-5**: 1.25rem (20px)
- **Space-6**: 1.5rem (24px)
- **Space-8**: 2rem (32px)
- **Space-10**: 2.5rem (40px)
- **Space-12**: 3rem (48px)
- **Space-16**: 4rem (64px)
- **Space-20**: 5rem (80px)

## Layout

### Container
- **Max Width**: 1280px
- **Padding**: 1rem on mobile, 2rem on desktop
- **Centered**: Always center containers

### Grid System
- **12-column grid** for complex layouts
- **Responsive breakpoints**:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

### Components Layout
- **Card padding**: 1.5rem
- **Section spacing**: 4rem
- **Component spacing**: 2rem

## Components

### Buttons
```typescript
// Primary Button
<Button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors">

// Secondary Button
<Button variant="outline" className="border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors">

// Icon Button
<Button size="icon" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
```

### Cards
```typescript
<Card className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
  <CardHeader>
    <CardTitle className="text-xl font-semibold text-gray-900">Title</CardTitle>
    <CardDescription className="text-gray-600">Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Forms
```typescript
<div className="space-y-4">
  <div>
    <Label className="block text-sm font-medium text-gray-700 mb-1">Label</Label>
    <Input className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
  </div>
</div>
```

### Alerts
```typescript
<Alert className="p-4 rounded-lg border">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription className="text-sm">
    Alert message
  </AlertDescription>
</Alert>
```

## Animations

### Transitions
- **Duration**: 150ms for simple, 300ms for complex
- **Easing**: `ease-in-out` for most transitions
- **Properties**: transform, opacity, color

### Hover Effects
```css
/* Button hover */
hover:scale-105 hover:shadow-lg transition-all duration-200

/* Card hover */
hover:shadow-xl hover:-translate-y-1 transition-all duration-300
```

### Loading States
```typescript
// Spinner
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>

// Skeleton
<div className="animate-pulse bg-gray-200 h-4 rounded"></div>
```

### Page Transitions
```typescript
// Fade in
className="animate-fade-in"

// Slide up
className="animate-slide-up"
```

## Responsive Design

### Mobile First Approach
- Design for mobile first, then enhance for larger screens
- Use Tailwind's responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`

### Breakpoints
- **sm**: 640px (small tablets)
- **md**: 768px (tablets)
- **lg**: 1024px (laptops)
- **xl**: 1280px (desktops)

### Typography Scale
- Mobile: smaller base font size
- Desktop: larger headings and more spacing

## Accessibility

### Color Contrast
- Ensure WCAG AA compliance (4.5:1 for normal text)
- Use tools to verify contrast ratios
- Provide alternatives for color-only information

### Keyboard Navigation
- All interactive elements keyboard accessible
- Visible focus indicators
- Logical tab order

### Screen Readers
- Semantic HTML5 elements
- ARIA labels where needed
- Alt text for images

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable animations */
}
```

## Dark Mode

### Implementation
- Use CSS custom properties for theming
- Store preference in localStorage
- Respect system preference

### Color Adjustments
- Dark backgrounds: `#1F2937` (Gray-800)
- Light text: `#F9FAFB` (Gray-50)
- Adjust borders and shadows for dark theme

## Iconography

### Icon Library
- **Primary**: Lucide React
- **Size**: 16px, 20px, 24px, 32px
- **Consistent**: Use consistent stroke width (2px)

### Usage Guidelines
- Icons should support, not replace, text
- Use tooltips for icon-only buttons
- Maintain consistent style throughout

## Illustrations & Graphics

### Style
- Clean, minimalist illustrations
- Consistent color palette
- Support light/dark themes

### Usage
- Landing page hero illustrations
- Empty state illustrations
- Onboarding graphics

## Micro-interactions

### Button Press
- Subtle scale effect on click
- Visual feedback for all interactions

### Form Validation
- Real-time validation feedback
- Clear error messages
- Success states

### Loading
- Progress indicators for async operations
- Skeleton screens for content loading
- Smooth transitions between states

## Page Specific Guidelines

### Landing Page
- Hero section with clear value proposition
- Call-to-action prominently displayed
- Smooth scroll animations
- Mobile-optimized layout

### Login/Signup
- Clean, focused layout
- Social login options
- Clear error messages
- Password strength indicators

### Analysis Pages
- Clear progress indicators
- Real-time status updates
- Results visualization
- Export/share options

### Reports
- Data visualization
- Print-friendly layout
- Share functionality
- Filter and search options

## Performance Considerations

### Image Optimization
- WebP format when possible
- Responsive images
- Lazy loading for below-fold images

### Animation Performance
- Use transform and opacity for smooth animations
- Avoid layout thrashing
- Test on lower-end devices

### Bundle Size
- Code splitting for large components
- Lazy load non-critical components
- Optimize imports

## Brand Guidelines

### Logo Usage
- Minimum size: 24px height
- Clear space: 0.5x logo height
- Don't distort or alter proportions

### Voice & Tone
- Professional but approachable
- Clear and concise
- Action-oriented
- Inclusive language

## Testing

### Visual Regression
- Automated screenshot testing
- Cross-browser testing
- Responsive design testing

### User Testing
- Usability testing with real users
- A/B testing for critical flows
- Accessibility testing with screen readers