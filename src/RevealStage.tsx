import classNames from "classnames";
import { RevealState } from "../convex/shared";
import { ProfilePicture } from "./ProfilePicture";

export function RevealStage({ round }: { round: RevealState }) {
  return (
    <div className="flex flex-col">
      <img
        src={round.imageUrl}
        alt=""
        className="w-full max-w-xl border border-neutral-600 rounded overflow-hidden my-4"
      />
      <ul className="max-w-xl">
        {round.results.map((option) => (
          <li
            key={option.authorId}
            className={classNames(
              "border-b border-b-neutral-500 py-4 flex flex-col items-start gap-1",
              "w-full border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black  disabled:border-neutral-400 disabled:text-neutral-500 ",
              {
                "bg-blue-400": round.authorId === option.authorId,
              }
            )}
          >
            <label className="flex">
              <span className="text-lg flex mr-2">{option.prompt} </span>
            </label>
            <div className="pl-2 flex gap-1 text-sm items-center">
              by
              <ProfilePicture
                url={round.users.get(option.authorId)!.pictureUrl}
                me={round.users.get(option.authorId)!.me}
                small
              />
              {round.users.get(option.authorId)!.name}
              {!!option.scoreDeltas.get(option.authorId) && (
                <span className="rounded-full px-2 bg-orange-400 text-neutral-black ">
                  +{option.scoreDeltas.get(option.authorId)}
                </span>
              )}
              {option.likes.length
                ? option.likes.map((userId) => (
                    <label key={userId} className="flex">
                      👍
                    </label>
                  ))
                : null}
            </div>
            {option.votes.length ? (
              <div className="pl-6">
                <span className="text-sm font-semibold">
                  {option.votes.length} Vote{option.votes.length > 1 && "s"}{" "}
                </span>
                <ol>
                  {option.votes.map((userId) => (
                    <li key={userId} className="flex py-1 gap-1">
                      <ProfilePicture
                        url={round.users.get(userId)!.pictureUrl}
                        me={round.users.get(userId)!.me}
                        small
                      />
                      {round.users.get(userId)!.name || "(Anonymous)"}

                      {option.scoreDeltas.has(userId) ? (
                        <span className="px-2 rounded-full bg-purple-400 text-neutral-black">
                          +{option.scoreDeltas.get(userId)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
