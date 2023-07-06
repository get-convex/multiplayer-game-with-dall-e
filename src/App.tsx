import { api } from "../convex/_generated/api";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import Game from "./Game";
import GameRound from "./GameRound";
import { useSessionMutation } from "./hooks/useServerSession";

const ConvexIdLength = 31;

function App() {
  const hostGame = useSessionMutation(api.game.create);
  const [gameId, setGameId] = useState(() => {
    if (typeof window === "undefined") return null;
    const id = window.location.hash.substring(1);
    if (!id || id.length !== ConvexIdLength) return null;
    return id as Id<"games">;
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (gameId) window.location.hash = gameId;
    else window.location.hash = "";
  }, [gameId]);
  const [gameCode, setGameCode] = useState("");
  const joinGame = useSessionMutation(api.game.join);
  const publicRoundId = useQuery(api.publicGame.get);
  const done = useCallback((gameId: Id<"games"> | null) => {
    setGameId(gameId);
  }, []);

  return (
    <div className="flex flex-col p-5 pt-20 pb-64 lg:flex-row lg:gap-28 max-w-7xl mx-auto lg:pt-5 lg:pb-5">
      <div className="grow basis-0">
        <header className="mb-20">
          <img className="w-full" src="/faces.svg" alt="Cartoon faces" />
          <h1 className="stretch-min my-4 font-display text-6xl font-extrabold uppercase tracking-tighter md:text-8xl">
            Whose Prompt is it Anyways?
          </h1>
          <div className="flex items-center gap-2 text-lg">
            by{" "}
            <a
              href="https://convex.dev"
              className="flex items-center gap-2 hover:underline"
            >
              <img src="/convex.svg" width="28" height="28" alt="Convex logo" />
              Convex
            </a>
          </div>
        </header>
        {!gameId && (
          <div className="fixed bottom-0 left-0 right-0 flex flex-col gap-4 border-t border-t-neutral-400 bg-neutral-900 p-5 lg:static lg:border-t-0 lg:p-0">
            <div className="stretch-min font-display text-4xl font-extrabold tracking-tight">
              Play with friends!
            </div>
            <div className="my-2">
              Try to guess what text prompt generated the image. Fool your
              friends to score points!
            </div>
            <div className="flex items-center lg:flex-col">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setGameId(await joinGame({ gameCode }));
                }}
                className="flex grow basis-0 lg:w-full"
              >
                <input
                  type="text"
                  value={gameCode}
                  placeholder="Game code"
                  onChange={(e) => setGameCode(e.target.value.substring(0, 4))}
                  className="h-12 w-0 grow border border-blue-200 bg-transparent p-2 text-blue-200 placeholder:text-blue-200"
                />
                <button
                  type="submit"
                  className="h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400"
                >
                  Join
                </button>
              </form>
              <span className="z-10 -m-2 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-neutral-900 text-sm">
                or
              </span>
              <button
                onClick={async () => {
                  setGameId(await hostGame());
                }}
                className="h-12 grow basis-0 bg-blue-200 text-neutral-black hover:bg-blue-400 lg:w-full lg:py-3"
              >
                Host a game
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="grow basis-0">
        {gameId ? (
          <Game gameId={gameId} done={done} />
        ) : (
          <>
            <h2 className="text-4xl font-display stretch-min tracking-tight font-extrabold">
              Try it out:
            </h2>
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
