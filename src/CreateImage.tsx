import { api } from "../convex/_generated/api";
import { useQuery } from "convex/react";
import { useState } from "react";
import { MaxPromptLength } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { useSessionMutation, useSessionQuery } from "./hooks/useServerSession";

export const Health = () => {
  const health = useQuery(api.submissions.health) ?? null;
  return (
    health && (
      <section className="flex flex-col gap-1 w-full text-neutral-400">
        <span>
          Dall-E status:{" "}
          {health[1] > 0.8 ? "✅" : health[1] > 0.5 ? "⚠️" : "❌"}
        </span>
        <span>
          Image generation time: {(health[0] / 1000).toFixed(1)} seconds
        </span>
      </section>
    )
  );
};

const Submission = (props: { submissionId: Id<"submissions"> }) => {
  const result = useSessionQuery(api.submissions.get, props);
  switch (result?.status) {
    case "generating":
      return (
        <figure>
          <article aria-busy="true"></article>
          {result.details}
        </figure>
      );
    case "failed":
      return <p>❗️{result.reason}</p>;
    case "saved":
      return (
        <figure className="flex flex-col">
          <img
            src={result.url}
            className="w-full max-w-lg border border-neutral-600 rounded overflow-hidden my-4"
          />
          <span className="text-sm text-neutral-400">
            Generated in {result.elapsedMs / 1000} seconds.
          </span>
        </figure>
      );
  }
  return null;
};

export const CreateImage = ({
  onSubmit,
  title,
}: {
  onSubmit: (submissionId: Id<"submissions">) => any;
  title?: string;
}) => {
  const [prompt, setPrompt] = useState("");
  const startSubmission = useSessionMutation(api.submissions.start);
  const [submissionId, setSubmissionId] = useState<Id<"submissions">>();
  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div className="text-5xl font-display stretch-min font-bold">
        {title ?? "Submit an image"}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmissionId(await startSubmission({ prompt }));
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-2">
          Describe an image. This text will be used to generate an image using
          OpenAI's Dall-E. For example, "A cat in space"
          <input
            type="text"
            value={prompt}
            onChange={(e) =>
              setPrompt(e.target.value.substring(0, MaxPromptLength))
            }
            placeholder="Image description"
            className="bg-transparent border border-neutral-400 p-2 focus:outline-none placeholder:text-neutral-400 text-blue-400 focus:border-blue-400"
          />
        </label>
        <input
          type="submit"
          value="Preview"
          className="h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400"
        />
      </form>
      {submissionId && (
        <>
          <Submission submissionId={submissionId} />
          <button
            type="submit"
            onClick={(e) => onSubmit(submissionId)}
            className="h-12 border border-blue-200 bg-blue-200 py-2 px-4 text-neutral-black hover:bg-blue-400"
          >
            Submit
          </button>
        </>
      )}
      <Health />
    </div>
  );
};
