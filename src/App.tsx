import { useState } from "react";
import { useQuery } from "../convex/_generated/react";
import "./App.css";
import GameRound from "./GameRound";
import { useSessionMutation } from "./hooks/sessionsClient";

function App() {
  const [count, setCount] = useState(0);
  //const hostGame = useSessionMutation("game:create");
  //const [gameCode, setGameCode] = useState("");
  //const joinGame = useSessionMutation("game:join");
  const roundId = useQuery("publicGame:get");

  return (
    <div className="App">
      <header>
        <h1>Name That Prompt! by Convex</h1>
      </header>
      <div className="card">
        {roundId ? (
          <GameRound roundId={roundId} />
        ) : (
          <article aria-busy="true"></article>
        )}
      </div>
    </div>
  );
}

export default App;
