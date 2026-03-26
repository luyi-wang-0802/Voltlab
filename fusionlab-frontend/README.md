# Innovation Center Explorer (FusionLab Frontend)

An interactive 3D innovation center explorer application built with React, Three.js, and TypeScript. This application provides immersive experiences for exploring buildings, booking rooms, navigating spaces, and discovering events through various interactive modes.

## Tech Stack

### Core Technologies
- **React 19.2.4** - Modern UI library with latest features
- **TypeScript 5.8.2** - Type-safe development
- **Vite 6.2.0** - Fast build tool and development server
- **Three.js 0.173.0** - 3D graphics and visualization

### Animation & UX Libraries
- **GSAP 3.14.2** - High-performance animations
- **Lenis** - Smooth scrolling and interactions

### Build Tools & Configuration
- **@vitejs/plugin-react 5.0.0** - React Fast Refresh and JSX support
- **Docker** - Containerization support

## Features

### Interactive Experiences

1. **Storytelling Mode**
   - Narrative-driven exploration of the innovation center
   - Immersive visual storytelling

2. **Walkthrough Experience**
   - Guided tours through different floors and rooms
   - Interactive 3D building navigation

3. **Room 360° View**
   - Panoramic views of individual rooms
   - Detailed room information and descriptions

4. **Booking System**
   - Room reservation functionality
   - Event browsing and booking
   - User authentication for bookings

5. **Navigation Experience**
   - Interactive wayfinding system
   - Floor-by-floor navigation
   - Room targeting and highlighting

6. **Event Discovery**
   - Event listings with filtering (Academic/Culture/Social)
   - Event detail modals with comprehensive information
   - Event location integration and room mapping
   - Monthly event organization and search functionality

7. **Where To Go**
   - Personalized space recommendations
   - Location-based suggestions

8. **Viewer Mode**
   - Comprehensive 3D model viewing
   - Interactive camera controls

### User Features
- User authentication and session management
- Comprehensive profile management with booking history
- Personal event reservations and seat/room bookings
- Interactive emoji reactions for past events
- Loading screens with smooth transitions and animations
- Guided space tour introduction for new users
- Responsive design for desktop and mobile devices
- Real-time booking status updates

## Project Structure

```
fusionlab-frontend/
├── components/               # React components
│   ├── BookingExperience.tsx    # Room and seat booking system
│   ├── EmojiReactionsBar.tsx    # Interactive emoji reactions
│   ├── EventDetailModal.tsx     # Event information modal
│   ├── EventExperience.tsx      # Event discovery and browsing
│   ├── LoadingScreen.tsx        # Application loading screen
│   ├── LoginExperience.tsx      # User login interface
│   ├── LoginModal.tsx           # Authentication modal
│   ├── NavigationExperience.tsx # Interactive wayfinding
│   ├── PageTransition.tsx       # Smooth page transitions
│   ├── Profile.tsx              # User profile and bookings
│   ├── ProfileMenu.tsx          # Profile navigation menu
│   ├── Room360View.tsx          # 360° room panoramic views
│   ├── SpaceTour.tsx            # Guided tour introduction
│   ├── StorytellingView.tsx     # Narrative exploration mode
│   ├── StorytellingView.css     # Storytelling styles
│   ├── ViewerView.tsx           # 3D model viewer
│   ├── WalkthroughExperience.tsx # 3D building navigation
│   └── WhereToGoExperience.tsx  # Space recommendations
├── services/                 # API and service integrations
│   └── api.ts               # Backend API communications
├── public/                   # Static assets
│   ├── icon/                # Application icons
│   ├── models/              # 3D models and GLTF files
│   ├── poster/              # Event posters by month/category
│   ├── rooms/               # Room images and 360° views
│   ├── storyframes/         # Storytelling visual frames
│   ├── storytelling/        # Narrative content assets
│   └── videos/              # Video content
├── App.tsx                   # Main application component
├── index.tsx                 # Application entry point
├── index.html               # HTML template
├── index.css                # Global styles
├── metadata.json            # Application metadata
├── Dockerfile               # Docker containerization
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Installation & Setup

### Prerequisites
- **npm** or **yarn** package manager

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fusionlab-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** (Optional)
   Create a `.env.local` file in the root directory if you plan to add API integrations:
   ```env
   # Add your API keys here when needed
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production-ready bundle
- `npm run preview` - Preview production build locally

## Key Components

### Application Flow
The app follows a three-stage flow state:
1. **Loading** - Initial asset loading and setup with progress indicators
2. **Tour** - Optional introductory space tour for first-time users
3. **Main** - Full application with all interactive features

### New Component Features
- **EmojiReactionsBar** - Interactive emoji feedback system for events
- **EventExperience** - Comprehensive event discovery with monthly organization
- **PageTransition** - Smooth transitions between different views and modes
- **Enhanced Profile** - Complete user dashboard with booking management

### Category System
Users can switch between different experience modes:
- **Storytelling** - Narrative-driven exploration with visual storytelling
- **Walkthrough** - Interactive 3D building navigation with floor-by-floor exploration
- **Event** - Event discovery with filtering and detailed information
- **Booking** - Room and seat reservation system with real-time availability
- **Where To Go** - Personalized space recommendations and suggestions
- **Navigation** - Interactive wayfinding with room targeting
- **Viewer** - Comprehensive 3D model viewing with camera controls

### State Management
The application uses React hooks for state management:
- **Flow State** - Loading, tour, and main application phases
- **User Authentication** - Login status and session management
- **Category/View** - Current experience mode and active view
- **Room & Event Selection** - Selected rooms, events, and bookings
- **Navigation State** - Floor focus, hover states, and navigation targets
- **UI State** - Modal visibility, animations, and transitions

## Integration

The frontend integrates with:
- **Backend API** (fusionlab-backend) - Room, event, and booking data management
- **3D Models** - Three.js-based GLTF model rendering and interactions
- **360° Images** - Panoramic room views with interactive controls
- **Real-time Data** - Live booking status and event updates
- **Docker** - Containerized deployment support

## Deployment

### Traditional Deployment
1. Build the production bundle:
   ```bash
   npm run build
   ```

2. The `dist/` folder contains the optimized production files ready for deployment.

3. Deploy to your preferred hosting platform (Vercel, Netlify, etc.)

### Docker Deployment
1. Build the Docker image:
   ```bash
   docker build -t fusionlab-frontend .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:80 fusionlab-frontend
   ```


## License

This project is part of an academic initiative at FusionLab.

---

**Project:** FusionLab WS2025 Group 8  
**Type:** Innovation Center Explorer  
**Framework:** React + TypeScript + Three.js
