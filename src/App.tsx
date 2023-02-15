import { useCallback, useEffect, useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { useQuery } from "../convex/_generated/react";
import Game from "./Game";
import GameRound from "./GameRound";
import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";
import useSingleFlight from "./hooks/useSingleFlight";

const ConvexIdLength = 22;

function App() {
  const hostGame = useSessionMutation("game:create");
  const [gameId, setGameId] = useState(() => {
    if (typeof window === "undefined") return null;
    const id = window.location.hash.substring(1);
    if (!id || id.length !== ConvexIdLength) return null;
    return new Id("games", id);
  });
  const profile = useSessionQuery("users:getMyProfile");
  const setName = useSingleFlight(useSessionMutation("users:setName"));
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
    <div className="flex flex-col p-5 pt-20 lg:flex-row lg:gap-28">
      <div>
        <header>
          <img src="/faces.svg" alt="Cartoon faces" />
          <h1 className="font-display uppercase">
            Whose Prompt is it Anyways?
          </h1>
          <span>
            by <img src="/convex.svg" width="28" height="28" />{" "}
            <a href="https://convex.dev">Convex</a>
          </span>
        </header>
        {!gameId && (
          <div>
            <div>Play with friends!</div>
            <div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setGameId(await joinGame(gameCode));
                }}
              >
                <input
                  type="text"
                  value={gameCode}
                  placeholder="Game code"
                  onChange={(e) => setGameCode(e.target.value.substring(0, 4))}
                />
                <button type="submit">Join</button>
              </form>
              <div>or</div>
              <button
                onClick={async () => {
                  setGameId(await hostGame());
                }}
              >
                Host a game
              </button>
            </div>
          </div>
        )}
      </div>
      <div>
        {profile && (
          <input
            className="fixed left-0 top-0 right-0 h-16 border-b border-b-neutral-400 bg-neutral-900 px-5 focus:outline-none"
            name="name"
            defaultValue={profile.name}
            type="text"
            onChange={(e) => setName(e.target.value)}
            placeholder="Type Name"
          />
        )}
        {gameId ? (
          <Game gameId={gameId} done={done} />
        ) : (
          <>
            <h2>Public Game</h2>
            {publicRoundId ? (
              <GameRound roundId={publicRoundId} />
            ) : (
              <article aria-busy="true"></article>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
