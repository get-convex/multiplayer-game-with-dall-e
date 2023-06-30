import { ConvexProvider, ConvexReactClient } from "convex/react";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SessionProvider } from "./hooks/useServerSession";
import "./index.css";

const client = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConvexProvider client={client}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ConvexProvider>
  </React.StrictMode>
);
