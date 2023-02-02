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
          {gameId ? (
            <Game gameId={gameId} />
          ) : roundId ? (
            <GameRound roundId={roundId} />
          ) : (
            <article aria-busy="true"></article>
          )}
        </section>
        <section>
          <button
            onClick={async () => {
              setGameId(await hostGame());
            }}
          >
            Host Game
          </button>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setGameId(await joinGame(gameCode));
            }}
          >
            <input
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.substring(0, 4))}
            />
            <button type="submit">Join Game</button>
          </form>
        </section>
      </main>
    </>
  );
}

export default App;
