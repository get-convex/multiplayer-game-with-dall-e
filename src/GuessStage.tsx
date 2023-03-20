import { useState } from "react";
import { GuessState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { useSessionMutation } from "./hooks/sessionsClient";
import { Submissions } from "./Submissions";

export function GuessStage({
  round,
  roundId,
}: {
  round: GuessState;
  roundId: Id<"rounds">;
}) {
  const submitGuess = useSessionMutation("round:guess");
  const [error, setError] = useState<string>();
  return (
    <div>
      <img
        src={round.imageUrl}
        alt=""
        className="w-full max-w-xl border border-neutral-600 rounded overflow-hidden my-4"
      />
      <fieldset>
        <legend className="text-2xl mb-2">
          {round.mine
            ? "This was your image."
            : "What prompt was responsible for this image?"}
        </legend>
        <ul className="mb-6">
          {round.options.map((option) => (
            <li key={option} className="mb-2">
              <span className="text-orange-300">
                {option === round.myGuess && error}
              </span>
              <label className="flex gap-2 items-center text-lg">
                <button
                  onClick={async () => {
                    setError(undefined);
                    const result = await submitGuess({
                      roundId,
                      prompt: option,
                    });
                    if (!result.success) setError(result.reason);
                  }}
                  disabled={round.mine || option === round.myPrompt}
                  title={
                    round.mine
                      ? "You can't vote on your own image"
                      : option === round.myPrompt
                      ? "You can't vote for your own prompt"
                      : ""
                  }
                  className="border border-blue-200 text-lg py-2 px-4 disabled:border-neutral-400 disabled:text-neutral-400 disabled:cursor-not-allowed cursor-pointer text-blue-200 hover:text-blue-400 hover:border-blue-400 transition-colors"
                  aria-invalid={option === round.myGuess && !!error}
                >
                  {option} {option === round.myGuess && "✅"}
                </button>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {(round.mine || round.submitted.find((submission) => submission.me)) && (
        <Submissions submitted={round.submitted} title="Submissions" />
      )}
    </div>
  );
}
