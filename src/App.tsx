import { useEffect, useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { useQuery } from "../convex/_generated/react";
import "./App.css";
import Game from "./Game";
import GameRound from "./GameRound";
import { useSessionMutation } from "./hooks/sessionsClient";

const ConvexIdLength = 22;

function App() {
  const hostGame = useSessionMutation("game:create");
  const [gameId, setGameId] = useState(() => {
    if (typeof window === "undefined") return null;
    const id = window.location.hash.substring(1);
    if (!id || id.length !== 22) return null;
    return new Id("games", id);
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (gameId) window.location.hash = gameId.id;
  }, [gameId]);
  const [gameCode, setGameCode] = useState("");
  const joinGame = useSessionMutation("game:join");
  const roundId = useQuery("publicGame:get");

  return (
    <>
      <header>
        <h1>Name That Prompt! by Convex</h1>
      </header>
      <section>
        {gameId ? (
          <Game gameId={gameId} done={(nextGameId) => setGameId(nextGameId)} />
        ) : (
          <>
            {roundId ? (
              <GameRound roundId={roundId} />
            ) : (
              <article aria-busy="true"></article>
            )}
          </>
        )}
      </section>
      {!gameId && (
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
      )}
    </>
  );
}

export default App;
