import { useState } from "react";
import { useQuery } from "../convex/_generated/react";
import "./App.css";
import Game from "./Game";
import GameRound from "./GameRound";
import { useSessionMutation } from "./hooks/sessionsClient";

function App() {
  const hostGame = useSessionMutation("game:create");
  const [gameCode, setGameCode] = useState("");
  const joinGame = useSessionMutation("game:join");
  const roundId = useQuery("publicGame:get");

  return (
    <>
      <header>
        <h1>Name That Prompt! by Convex</h1>
      </header>
      <main>
        <section>
          {gameCode ? (
            <Game gameCode={gameCode} />
          ) : roundId ? (
            <GameRound roundId={roundId} />
          ) : (
            <article aria-busy="true"></article>
          )}
        </section>
        <section></section>
      </main>
    </>
  );
}

export default App;
