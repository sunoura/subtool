# Subtitler

A professional web-based video subtitle editor built with SvelteKit and TypeScript. Create, edit, and export subtitles for your videos with an intuitive interface and automatic session management.

## Features

-   **Video Upload & Playback**: Support for multiple video formats with HTML5 video player
-   **Real-time Subtitle Editing**: Add, edit, and synchronize subtitles while watching your video
-   **Session Management**: Automatic saving and resuming of subtitle projects
-   **SRT Export**: Export completed subtitles in standard SRT format
-   **Responsive Design**: Modern, mobile-friendly interface built with Tailwind CSS
-   **Database Persistence**: SQLite database with Drizzle ORM for reliable data storage

## Technology Stack

-   **Frontend**: SvelteKit 2, TypeScript, Tailwind CSS
-   **Backend**: SvelteKit API routes
-   **Database**: SQLite with Drizzle ORM
-   **UI Components**: bits-ui, Lucide icons
-   **Build Tool**: Vite

## Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   pnpm (recommended) or npm

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd subtitler-3
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up the database:

```bash
pnpm run db:push
```

4. Start the development server:

```bash
pnpm run dev
```

The application will be available at `http://localhost:5173`

## Usage

1. **Create a Session**: Start a new subtitle project or resume an existing one
2. **Upload Video**: Select your video file for subtitle editing
3. **Add Subtitles**: Use the "Quick Add" feature while playing the video to create subtitle entries
4. **Edit Content**: Modify subtitle text and timing as needed
5. **Export**: Download your completed subtitles in SRT format

## Scripts

-   `pnpm run dev` - Start development server
-   `pnpm run build` - Build for production
-   `pnpm run preview` - Preview production build
-   `pnpm run check` - Run type checking
-   `pnpm run db:push` - Push database schema changes
-   `pnpm run db:migrate` - Run database migrations
-   `pnpm run db:studio` - Open Drizzle Studio for database management

## Project Structure

```
src/
├── lib/
│   ├── components/          # Svelte components
│   │   ├── ui/             # Reusable UI components
│   │   ├── VideoPlayer.svelte
│   │   ├── SubtitleEditor.svelte
│   │   └── ...
│   ├── server/
│   │   └── db/             # Database schema and connection
│   ├── state/              # Application state management
│   └── stores/             # Svelte stores
├── routes/
│   ├── api/                # API endpoints
│   └── video/[id]/         # Video viewing routes
└── static/                 # Static assets
```

## API Endpoints

-   `GET/POST /api/sessions` - Manage subtitle sessions
-   `GET/POST /api/subtitles` - CRUD operations for subtitles
-   `GET /api/health` - Health check endpoint

## Database Schema

The application uses two main entities:

-   **Sessions**: Store video project information and metadata
-   **Subtitles**: Store individual subtitle entries with timing and text

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the repository.
