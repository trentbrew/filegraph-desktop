// import React from "react"; // Commented out with StrictMode
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./components/themeProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  // Temporarily disabled Strict Mode due to remounting issues with async operations
  // TODO: Re-enable after fixing async initialization race conditions
  // <React.StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <App />
    </ThemeProvider>
  // </React.StrictMode>
);
