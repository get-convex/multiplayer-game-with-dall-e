import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { useSessionMutation } from "./hooks/sessionsClient";

export function LabelStage({
  round,
  roundId,
}: {
  round: {
    stage: "label";
    stageEnd: number;
    submitted: { name: string; pictureUrl: string; me: boolean }[];
    mine: boolean;
    imageUrl: string;
  };
  roundId: Id<"rounds">;
}) {
  const [error, setError] = useState<string>();
  const [prompt, setPrompt] = useState("");
  const addPrompt = useSessionMutation("round:addOption");
  return (
    <div>
      <img
        src={round.imageUrl}
        alt=""
        className="w-full max-w-xl border border-neutral-600 rounded overflow-hidden my-4"
      />
      {round.mine ? (
        "This was your image."
      ) : round.submitted.find((submission) => submission.me) ? (
        <section>
          Submitted. Waiting for everyone to finish...
          <ul>
            {round.submitted.map((player) => (
              <li key={player.pictureUrl}>
                <img src={player.pictureUrl} />
                {player.name} ✅
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await addPrompt({ roundId, prompt });
            if (!result.success) setError(result.reason);
          }}
          className="flex"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="bg-transparent border border-neutral-400 p-2 focus:outline-none placeholder:text-neutral-400 text-blue-400 focus:border-blue-400 h-12 basis-0 grow"
          />
          <label className="basis-0">
            {error}
            <input
              type="submit"
              value="Submit prompt"
              aria-invalid={!!error}
              className="h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400"
            />
          </label>
        </form>
      )}
    </div>
  );
}
