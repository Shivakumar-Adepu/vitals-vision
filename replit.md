# Vitals-Vision AI

## Overview
Vitals-Vision AI is a full-stack healthcare monitoring dashboard developed to provide AI-powered, non-invasive patient monitoring with a strong emphasis on privacy. The system utilizes client-side AI processing (MediaPipe Pose, COCO-SSD, CNN-LSTM) on device camera feeds to enable real-time detection of critical events like falls, seizures, and stumbles, alongside respiratory rate estimation and body position classification. The primary goal is to facilitate rapid "Golden Hour" emergency response by alerting caregivers promptly, while ensuring patient privacy by rendering only skeleton overlays and never transmitting raw video data. The project aims to enhance patient safety in healthcare settings through innovative AI applications.

## User Preferences
I prefer iterative development, so please break down tasks into smaller, manageable steps.
Please ask for my confirmation before making any significant changes to the core architecture or implementing new features.
I value clear and concise communication. Provide detailed explanations for complex technical decisions or new concepts.
I prefer to see progress frequently, even if it's just small updates or partial implementations.
Do not make changes to the folder `node_modules`.
Do not make changes to the file `package-lock.json`.

## System Architecture

### UI/UX Decisions
The frontend is built with React 18, TypeScript, Vite 5, Tailwind CSS, and shadcn/ui. It supports a full light/dark theme with a toggle and persisted setting. UI components are designed for responsiveness and accessibility, adapting to different devices.

### Technical Implementations
- **Frontend**: React 18 with TypeScript and Vite.
- **Backend**: Express.js server providing REST APIs and a WebSocket server for real-time communication.
- **Database**: PostgreSQL managed with Drizzle ORM for data persistence.
- **Real-time Communication**: WebSocket server at `/ws` for live alert broadcasting and camera-to-dashboard communication.
- **AI Models**:
    - **MediaPipe Pose**: Client-side 33-keypoint pose detection for fall detection and body position classification.
    - **COCO-SSD (TensorFlow.js)**: Client-side person detection (YOLO-equivalent) for redundant detection.
    - **CNN-LSTM**: Client-side pattern recognition for seizure/stumble detection from pose landmark sequences, utilizing a 60-frame sliding window.
- **Alert System**: Audio alerts (Web Audio API), device vibration, real-time alerts persisted to PostgreSQL, and WebSocket broadcasts to connected clients.
- **Vitals Monitoring**: AI-derived respiratory rate estimation from micro-movement analysis, displayed via real-time charts.
- **Authentication**: Replit Auth (OpenID Connect) with session management via a PostgreSQL-backed session store.
- **Wearable Integration**: Web Bluetooth API for connecting and monitoring vitals from BLE GATT heart rate devices.

### Feature Specifications
- **User Authentication**: Replit Auth integration, protected routes, user profile display.
- **Dark Mode**: Toggleable theme with localStorage persistence.
- **Historical Analytics**: `/analytics` page with charts (pie, bar, line) for alert data visualization.
- **Real-Time Fall Detection**: Multi-criteria scoring algorithm based on MediaPipe Pose, with consecutive frame confirmation and body position classification.
- **Seizure/Stumble Detection**: CNN-LSTM model analyzing temporal pose features with weighted scoring and cooldown periods.
- **Emergency Alert Log**: `/alerts` page with real-time WebSocket updates, showing alert details and remote camera feeds.
- **Vitals Monitoring**: Real-time respiratory rate estimation and display.
- **Mobile Camera Streaming**: WebSocket-based video frame streaming from mobile devices to the dashboard for remote monitoring.
- **Wearable Vitals Monitoring**: `/wearables` page for pairing Bluetooth HRMs and displaying real-time vitals.
- **Patient Management**: `/patients` for CRUD operations on patient roster.
- **Staff Directory**: `/staff` for CRUD operations on staff members and duty management.
- **ICU Bed Board**: Dashboard visualization of bed occupancy.
- **Staff On-Duty Panel**: Dashboard sidebar showing active staff.
- **Emergency SOS Button**: One-click critical alert broadcasting.
- **Nurse Notes**: Ability to add clinical notes and responder details upon alert resolution.

### System Design Choices
- **Privacy-first**: All video processing for AI models occurs client-side in the browser; no raw video data is sent to servers. Only skeleton overlays are rendered.
- **Full-stack Integration**: Seamless integration between React frontend, Express backend, and PostgreSQL database.
- **Modularity**: Codebase structured into `server/`, `shared/`, and `src/` directories for clear separation of concerns.
- **Real-time Updates**: Extensive use of WebSockets for immediate alert propagation and data synchronization.

## External Dependencies
- **Replit Auth**: For user authentication (OpenID Connect).
- **PostgreSQL**: Primary database for all persistent data.
- **Drizzle ORM**: Object-relational mapping for PostgreSQL.
- **Express.js**: Backend web framework.
- **WebSocket (ws library)**: For real-time, bi-directional communication.
- **React 18**: Frontend JavaScript library.
- **TypeScript**: For type-safe JavaScript.
- **Vite 5**: Frontend build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: UI component library.
- **MediaPipe Pose (TensorFlow.js)**: Client-side AI model for pose detection.
- **COCO-SSD (TensorFlow.js)**: Client-side AI model for object detection (persons).
- **Recharts**: For data visualization in analytics and vitals charts.
- **Web Audio API**: For audio alerts.
- **Web Bluetooth API**: For wearable device integration.
- **Zod**: For schema validation.