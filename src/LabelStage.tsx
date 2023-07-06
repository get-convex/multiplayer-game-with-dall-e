import { useState } from "react";
import { LabelState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { useSessionAction } from "./hooks/useServerSession";
import { Submissions } from "./Submissions";
import { api } from "../convex/_generated/api";

export function LabelStage({
  round,
  roundId,
  gameId,
}: {
  round: LabelState;
  roundId: Id<"rounds">;
  gameId?: Id<"games">;
}) {
  const [error, setError] = useState<string>();
  const [prompt, setPrompt] = useState("");
  const addPrompt = useSessionAction(api.openai.addOption);
  return (
    <div className="max-w-lg">
      <img
        src={round.imageUrl}
        alt=""
        className="w-full max-w-lg border border-neutral-600 rounded overflow-hidden my-4"
      />
      {round.mine || round.submitted.find((submission) => submission.me) ? (
        <>
          <Submissions
            submitted={round.submitted}
            title={
              round.mine
                ? "This was your image. Submissions:"
                : "Waiting for everyone to finish..."
            }
          />
        </>
      ) : (
        <fieldset>
          <legend className="text-2xl mb-2">
            {round.mine
              ? "This was your image. Just relax 🏝️"
              : "What prompt was responsible for this image?"}
          </legend>
          <span className="text-orange-300">{error}</span>
          <form
            aria-disabled={
              !!round.submitted.find((submission) => submission.me)
            }
            onSubmit={async (e) => {
              e.preventDefault();
              const result = await addPrompt({ roundId, prompt, gameId });
              if (!result.success) setError(result.reason);
            }}
            className="flex"
            aria-errormessage={error}
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-transparent border border-neutral-400 p-2 focus:outline-none placeholder:text-neutral-400 text-blue-400 focus:border-blue-400 h-12 basis-0 grow"
            />
            <label className="basis-0">
              <input
                type="submit"
                value="Submit prompt"
                aria-invalid={!!error}
                className="h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400"
              />
            </label>
          </form>
          <p className="text-lg m-2">
            (You&rsquo;ll get points if someone thinks yours was the real one)
          </p>
        </fieldset>
      )}
    </div>
  );
}
