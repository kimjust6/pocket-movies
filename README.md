# Dank Movies

**Dank Movies** is a modern, self-hosted movie watchlist application that lets you discover films, curate personal collections, and share them with friends. Built for movie lovers who want control over their data with a premium user experience.

![Dank Movies Hero](https://via.placeholder.com/800x400?text=Dank+Movies+UI)

## Features

-   **Movie Discovery**: Instantly search for millions of movies powered by the **TMDB API**.
-   **Smart Watchlists**: Create unlimited public or private watchlists to organize your movie backlog.
-   **Collaboration**: Share private watchlists with specific users for collaborative planning.
-   **Secure & Private**: Built-in User Authentication (Email/Password & Google OAuth) keeps your lists secure.
-   **Modern Design**: Stunning UI features glassmorphism, smooth animations, and a responsive layout powered by Tailwind CSS & DaisyUI.
-   **Dark Mode**: Easy on the eyes with a sleek dark theme.

## Tech Stack

This project is built on a robust and simple stack designed for performance and ease of deployment.

-   **Backend**: [PocketBase](https://pocketbase.io/) (Golang + SQLite embedded DB) - Handles Auth, Database, and API.
-   **Frontend**: [PocketPages](https://github.com/pocketpages/pocketpages) - Server-side rendering using **EJS**.
-   **Interactivity**: [Alpine.js](https://alpinejs.dev/) - For lightweight, reactive UI components (Modals, Search).
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI](https://daisyui.com/).

## Getting Started

Follow these steps to get your own instance running locally.

### Prerequisites

-   **Node.js** (LTS version recommended)
-   **PocketBase**: Download the binary for your OS from [pocketbase.io/docs](https://pocketbase.io/docs/) and ensure it's in your PATH (or placed in the project root).
-   **TMDB API Key**: Get a free API key from [The Movie Database](https://www.themoviedb.org/documentation/api).

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/pocket-movies.git
    cd pocket-movies
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set Environment Variables**:
    Create a `.env` file or export the variable in your shell:
    ```bash
    export TMDB_API_KEY="your_tmdb_api_key_here"
    ```

4.  **Run the App**:
    This command starts the Tailwind watcher and the PocketBase server in dev mode.
    ```bash
    npm run dev
    ```

5.  **Visit the App**:
    Open [http://localhost:8090](http://localhost:8090) in your browser.

## Project Structure

-   `pb_hooks/` - Server-side logic and templates.
    -   `pages/` - EJS templates and route handlers (PocketPages).
    -   `*.pb.js` - PocketBase hooks and extensions.
-   `pb_public/` - Static assets (compiled CSS, images).
-   `pb_data/` - Local database and storage (created after first run).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open-source and available under the [MIT License](LICENSE).
