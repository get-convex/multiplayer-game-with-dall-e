import { useCallback, useEffect, useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useQuery } from "../../convex/_generated/react";
import Game from "./Game";
import GameRound from "./GameRound";
import { useSessionMutation, useSessionQuery } from "../hooks/sessionsClient";
import useSingleFlight from "../hooks/useSingleFlight";
import styles from "./App.module.scss";
import Hero from "./Hero";
import Username from "./Username";

const ConvexIdLength = 22;

function App() {
  const hostGame = useSessionMutation("game:create");
  const [gameId, setGameId] = useState(() => {
    if (typeof window === "undefined") return null;
    const id = window.location.hash.substring(1);
    if (!id || id.length !== ConvexIdLength) return null;
    return new Id("games", id);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (gameId) window.location.hash = gameId.id;
    else window.location.hash = "";
  }, [gameId]);
  const [gameCode, setGameCode] = useState("");
  const joinGame = useSessionMutation("game:join");
  const publicRoundId = useQuery("publicGame:get");
  const done = useCallback((gameId: Id<"games"> | null) => {
    setGameId(gameId);
  }, []);

  return (
    <div className={styles.root}>
      <Hero />
      <div className={styles.usernameWrapper}>
        <Username />
      </div>
      {!gameId && (
        <>
          <section>
            <button
              onClick={async () => {
                setGameId(await hostGame());
              }}
            >
              Host Game
            </button>
          </section>
          <section>
            <form
              onSubmit={async e => {
                e.preventDefault();
                setGameId(await joinGame(gameCode));
              }}
            >
              <input
                type="text"
                value={gameCode}
                placeholder="Game Code"
                onChange={e => setGameCode(e.target.value.substring(0, 4))}
              />
              <button type="submit">Join Game</button>
            </form>
          </section>
        </>
      )}
      <section>
        {gameId ? (
          <Game gameId={gameId} done={done} />
        ) : (
          <>
            <h2 className={styles.subtitle}>Public game</h2>
            {publicRoundId ? (
              <GameRound roundId={publicRoundId} />
            ) : (
              <p>Loading...</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default App;
