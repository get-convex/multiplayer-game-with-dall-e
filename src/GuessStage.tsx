import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { useSessionMutation } from "./hooks/sessionsClient";

export function GuessStage({
  round,
  roundId,
}: {
  round: {
    myPrompt?: string | undefined;
    myGuess?: string | undefined;
    stage: "guess";
    stageEnd: number;
    options: string[];
    submitted: { name: string; pictureUrl: string; me: boolean }[];
    mine: boolean;
    imageUrl: string;
  };
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
            : "What text prompt was responsible for this image?"}
        </legend>
        <ul className="mb-6">
          {round.options.map((option) => (
            <li key={option} className="mb-2">
              <label className="flex gap-2 items-center text-lg">
                {error}
                <button
                  onClick={async () => {
                    const result = await submitGuess({
                      roundId,
                      prompt: option,
                    });
                    if (!result.success) setError(result.reason);
                  }}
                  disabled={round.mine || option === round.myPrompt}
                  className="border border-blue-200 text-lg py-2 px-4 disabled:border-neutral-400 disabled:text-neutral-400 disabled:cursor-not-allowed cursor-pointer text-blue-200 hover:text-blue-400 hover:border-blue-400 transition-colors"
                  aria-invalid={option === round.myGuess && !!error}
                >
                  {option}
                </button>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      {(round.mine || round.submitted.find((submission) => submission.me)) && (
        <fieldset>
          <legend className="text-2xl mb-2">Submissions</legend>
          <ul>
            {round.submitted.map((player) => (
              <li key={player.pictureUrl} className="flex items-center gap-3">
                <img
                  src={player.pictureUrl}
                  width="48"
                  height="48"
                  className="rounded"
                />
                <span className="text-lg">{player.name}</span>
                {/* TODO: Replace emoji with icon. */}
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  );
}
