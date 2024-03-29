"use node";
import { internal } from "./_generated/api";
import {
  Configuration,
  CreateModerationResponseResultsInner,
  OpenAIApi,
} from "openai";
import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { OptionResult } from "./round";

export const addOption = action({
  args: {
    gameId: v.optional(v.id("games")),
    roundId: v.id("rounds"),
    prompt: v.string(),
    sessionId: v.id("sessions"),
  },
  handler: async (
    ctx,
    { gameId, roundId, prompt, sessionId }
  ): Promise<OptionResult> => {
    const openai = makeOpenAIClient();
    // Check if the prompt is offensive.
    const modResponse = await openai.createModeration({
      input: prompt,
    });
    const modResult = modResponse.data.results[0];
    if (modResult.flagged) {
      return {
        success: false,
        retry: false,
        reason: `Your prompt was flagged: ${flaggedCategories(modResult).join(
          ", "
        )}`,
      } as const;
    }
    const status = (await ctx.runMutation(internal.round.addOption, {
      sessionId,
      gameId,
      roundId,
      prompt,
    })) as OptionResult; // Casting to avoid circular reference.
    return status;
  },
});

const makeOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Add your OPENAI_API_KEY as an env variable in the " +
        "[dashboard](https://dasboard.convex.dev)"
    );
  }
  return new OpenAIApi(new Configuration({ apiKey }));
};

const flaggedCategories = (
  modResult: CreateModerationResponseResultsInner
): string[] => {
  return Object.entries(modResult.categories)
    .filter(([, flagged]) => flagged)
    .map(([category]) => category);
};

export const createImage = internalAction({
  args: { prompt: v.string(), submissionId: v.id("submissions") },
  handler: async (ctx, { prompt, submissionId }) => {
    const start = Date.now();
    const elapsedMs = () => Date.now() - start;
    const openai = makeOpenAIClient();

    const fail = (reason: string): Promise<never> =>
      ctx
        .runMutation(internal.submissions.update, {
          submissionId,
          result: {
            status: "failed",
            elapsedMs: elapsedMs(),
            reason,
          },
        })
        .then(() => {
          throw new Error(reason);
        });

    await ctx.runMutation(internal.submissions.update, {
      submissionId,
      result: {
        status: "generating",
        details: "Moderating prompt...",
      },
    });
    // Check if the prompt is offensive.
    const modResponse = await openai.createModeration({
      input: prompt,
    });
    const modResult = modResponse.data.results[0];
    if (modResult.flagged) {
      await fail(
        `Your prompt was flagged: ${flaggedCategories(modResult).join(", ")}`
      );
    }

    await ctx.runMutation(internal.submissions.update, {
      submissionId,
      result: {
        status: "generating",
        details: "Generating image...",
      },
    });
    // Query OpenAI for the image.
    const opanaiResponse = await openai.createImage({
      prompt,
      size: "512x512",
    });
    const dallEImageUrl = opanaiResponse.data.data[0]["url"];
    if (!dallEImageUrl) return await fail("No image URL returned from OpenAI");

    await ctx.runMutation(internal.submissions.update, {
      submissionId,
      result: {
        status: "generating",
        details: "Storing image...",
      },
    });
    // Download the image
    const imageResponse = await fetch(dallEImageUrl);
    if (!imageResponse.ok) {
      await fail(`failed to download: ${imageResponse.statusText}`);
    }

    // Store it in Convex storage
    const storageId = await ctx.storage.store(await imageResponse.blob());

    // Write storageId as the body of the message to the Convex database.
    await ctx.runMutation(internal.submissions.update, {
      submissionId,
      result: {
        status: "saved",
        imageStorageId: storageId,
        elapsedMs: elapsedMs(),
      },
    });
  },
});
