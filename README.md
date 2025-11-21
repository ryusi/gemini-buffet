# Gemini Buffett 📈

Gemini Buffett is a real-time stock analyst web application powered by **Google's Gemini 2.5 Flash** model. It adopts the persona of the legendary investor Warren Buffett to provide witty, insightful, and data-driven investment opinions.

![Gemini Buffett Persona](public/geminibuffett.png)

## Features

-   **Real-time Analysis**: Utilizes Gemini's `googleSearch` tool to fetch the latest stock prices, news, and financial data.
-   **Warren Buffett Persona**: AI responds with the wisdom and tone of the Oracle of Omaha.
-   **Fintech Dark Mode**: A premium, responsive UI built with Tailwind CSS.
-   **Live Market Data**: Displays current price, market status, key financials, and latest news.

## Tech Stack

-   **Framework**: Next.js 14 (App Router)
-   **AI Model**: Google Gemini 2.5 Flash (via `@google/generative-ai`)
-   **Styling**: Tailwind CSS, `lucide-react`
-   **Language**: TypeScript

## Getting Started

### Prerequisites

-   Node.js 18+ installed.
-   A Google AI Studio API Key.

### Installation

1.  Clone the repository:

    ```bash
    git clone https://github.com/melocream/gemini-buffet.git
    cd gemini-buffet
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Set up environment variables:

    Create a `.env.local` file in the root directory and add your Google API key:

    ```env
    GOOGLE_API_KEY=your_api_key_here
    ```

4.  Run the development server:

    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) (or the port specified in your terminal) to use the app.

## License

This project is open source and available under the [MIT License](LICENSE).
