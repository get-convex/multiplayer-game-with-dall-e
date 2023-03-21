import { useSessionMutation } from "./hooks/sessionsClient";

export function JoinGame(props: { gameCode: string }) {
  const joinGame = useSessionMutation("game:join");
  return (
    <div>
      <button
        className="h-12 w-48 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400 rounded"
        onClick={() => joinGame(props.gameCode)}
      >
        Join
      </button>
    </div>
  );
}
