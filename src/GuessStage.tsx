import classNames from "classnames";
import { useState } from "react";
import { GuessState } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { useSessionMutation } from "./hooks/sessionsClient";
import { Submissions } from "./Submissions";

export function GuessStage({
  round,
  roundId,
  gameId,
}: {
  round: GuessState;
  roundId: Id<"rounds">;
  gameId?: Id<"games">;
}) {
  const submitGuess = useSessionMutation("round:guess");
  const addLike = useSessionMutation("round:like");
  const [error, setError] = useState<string>();
  const [likes, setLikes] = useState<Set<string>>(new Set());
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
              <div className="flex gap-2 items-center text-lg">
                <label className="flex-grow ">
                  <button
                    onClick={async () => {
                      setError(undefined);
                      const result = await submitGuess({
                        roundId,
                        gameId,
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
                    className={classNames(
                      "w-full text-left h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400 hover:border-blue-400 disabled:border-neutral-400 disabled:text-neutral-500 disabled:cursor-not-allowed cursor-pointer",
                      {
                        "bg-blue-500": option === round.myGuess,
                      }
                    )}
                    aria-invalid={option === round.myGuess && !!error}
                  >
                    {option}
                  </button>
                </label>
                <button
                  onClick={async () => {
                    console.log([...likes.keys()]);
                    console.log({ option });
                    setLikes((state) => new Set(state.keys()).add(option));
                    console.log([...likes.keys()]);
                    await addLike({
                      roundId,
                      gameId,
                      prompt: option,
                    });
                  }}
                  disabled={option === round.myPrompt}
                  title={
                    option === round.myPrompt
                      ? "You can't like your own prompt"
                      : ""
                  }
                  className={classNames(
                    "w-12 h-12 text-3xl text-neutral-black rounded-full  hover:disabled:bg-none disabled:cursor-default cursor-pointer",
                    {
                      "bg-blue-200": likes.has(option),
                      "hover:bg-blue-400 hover:border-blue-400":
                        option !== round.myPrompt,
                    }
                  )}
                >
                  {option !== round.myPrompt && (
                    <>
                      👍 <span className="sr-only">Like {option}.</span>
                    </>
                  )}
                </button>
              </div>
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
