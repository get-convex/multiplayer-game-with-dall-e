import { useState } from "react";
import { MaxPromptLength } from "../convex/shared";
import { Id } from "../convex/_generated/dataModel";
import { useQuery } from "../convex/_generated/react";
import { useSessionMutation, useSessionQuery } from "./hooks/sessionsClient";

export const Health = () => {
  const health = useQuery("submissions:health") ?? null;
  return (
    health && (
      <section>
        <strong>
          Dall-E status {health[1] > 0.8 ? "✅" : health[1] > 0.5 ? "⚠️" : "❌"}
        </strong>
        <span>
          Image generation time: {(health[0] / 1000).toFixed(1)} seconds
        </span>
      </section>
    )
  );
};

const Submission = (props: { submissionId: Id<"submissions"> }) => {
  const result = useSessionQuery("submissions:get", props.submissionId);
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
        <figure>
          <img src={result.url} />
          Generated in {result.elapsedMs / 1000} seconds.
        </figure>
      );
  }
  return null;
};

export const CreateImage = ({
  onSubmit,
}: {
  onSubmit: (submissionId: Id<"submissions">) => any;
}) => {
  const [prompt, setPrompt] = useState("");
  const startSubmission = useSessionMutation("submissions:start");
  const [submissionId, setSubmissionId] = useState<Id<"submissions">>();
  return (
    <>
      <Health />
      Describe an image:
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmissionId(await startSubmission(prompt));
        }}
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) =>
            setPrompt(e.target.value.substring(0, MaxPromptLength))
          }
        />
        <input type="submit" value="Preview" />
      </form>
      {submissionId && (
        <>
          <Submission submissionId={submissionId} />
          <button type="submit" onClick={(e) => onSubmit(submissionId)}>
            Submit
          </button>
        </>
      )}
    </>
  );
};
