# GMShooter v2 - Component Specifications

## Core Components

### 1. LandingPage
- **Purpose**: Entry point of the application with Digital Serenity design
- **Location**: `/src/components/LandingPage.tsx`
- **Dependencies**: None
- **Props**: None
- **Features**:
  - Animated gradient background
  - Large logo display
  - Call-to-action button to navigate to login
  - Smooth transitions

### 2. LoginScreen
- **Purpose**: User authentication interface
- **Location**: `/src/components/LoginScreen.tsx`
- **Dependencies**: Firebase Auth
- **Props**: None
- **Features**:
  - Email/password authentication
  - Google OAuth integration
  - Back button to landing page
  - Error handling for authentication failures

### 3. VideoAnalysis
- **Purpose**: Video upload and analysis interface
- **Location**: `/src/components/VideoAnalysis.tsx`
- **Dependencies**: useVideoAnalysis hook, Supabase
- **Props**: None
- **Features**:
  - Drag-and-drop video upload
  - Progress tracking
  - Test functionality with sample frames
  - Results display with accuracy metrics

### 4. CameraAnalysis
- **Purpose**: Real-time camera analysis
- **Location**: `/src/components/CameraAnalysis.tsx`
- **Dependencies**: useCameraAnalysis hook, WebRTC API
- **Props**: None
- **Features**:
  - Camera access and display
  - Real-time frame analysis
  - Results overlay
  - Capture functionality

### 5. ReportList
- **Purpose**: Display list of analysis reports
- **Location**: `/src/components/ReportList.tsx`
- **Dependencies**: Supabase
- **Props**: None
- **Features**:
  - Paginated list of reports
  - Filter and search functionality
  - Report preview
  - Navigation to detailed report

### 6. Report
- **Purpose**: Detailed view of analysis report
- **Location**: `/src/components/Report.tsx`
- **Dependencies**: None
- **Props**: 
  - `reportId`: string - ID of the report to display
- **Features**:
  - Frame-by-frame analysis
  - Accuracy metrics
  - Export functionality
  - Share options

### 7. IconBadge
- **Purpose**: Reusable icon badge component
- **Location**: `/src/components/IconBadge.tsx`
- **Dependencies**: None
- **Props**:
  - `icon`: ReactNode - Icon to display
  - `label`: string - Badge label
  - `variant`: 'success' | 'warning' | 'error' | 'info' - Badge style
- **Features**:
  - Customizable styling
  - Animated transitions
  - Responsive design

## UI Components (shadcn/ui)

### Button
- **Location**: `/src/components/ui/button.tsx`
- **Variants**: default, destructive, outline, secondary, ghost, link
- **Sizes**: default, sm, lg, icon

### Card
- **Location**: `/src/components/ui/card.tsx`
- **Sub-components**: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter

### Input
- **Location**: `/src/components/ui/input.tsx`
- **Types**: text, password, email, file

### Table
- **Location**: `/src/components/ui/table.tsx`
- **Sub-components**: Table, TableHeader, TableRow, TableHead, TableBody, TableCell, TableFooter

### Alert
- **Location**: `/src/components/ui/alert.tsx`
- **Variants**: default, destructive

### Progress
- **Location**: `/src/components/ui/progress.tsx`
- **Features**: Animated progress bar with customizable value

### Tabs
- **Location**: `/src/components/ui/tabs.tsx`
- **Sub-components**: Tabs, TabsList, TabsTrigger, TabsContent

## Custom Hooks

### useVideoAnalysis
- **Location**: `/src/hooks/useVideoAnalysis.ts`
- **Purpose**: Handle video upload and processing logic
- **Returns**: State and functions for video analysis

### useCameraAnalysis
- **Location**: `/src/hooks/useCameraAnalysis.ts`
- **Purpose**: Handle camera access and real-time analysis
- **Returns**: State and functions for camera analysis

## Utility Functions

### supabase.ts
- **Location**: `/src/utils/supabase.ts`
- **Purpose**: Supabase client configuration and helper functions
- **Exports**: supabase client, createSession, endSession

## Component Development Guidelines

1. **TypeScript**: All components must be written in TypeScript
2. **Props Interface**: Define clear interfaces for all props
3. **Default Exports**: Use default exports for components
4. **Styling**: Use Tailwind CSS for styling
5. **Error Handling**: Implement proper error boundaries
6. **Loading States**: Show loading indicators during async operations
7. **Responsive Design**: Ensure components work on all screen sizes
8. **Accessibility**: Follow WCAG 2.1 guidelines

## Component Testing

1. **Unit Tests**: Test component rendering and interactions
2. **Integration Tests**: Test component integration with hooks and APIs
3. **Visual Regression**: Ensure UI consistency
4. **Accessibility Tests**: Verify screen reader compatibility