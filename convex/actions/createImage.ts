import fetch from "node-fetch";
import { Configuration, OpenAIApi } from "openai";
import { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";

export default action(
  async ({ runMutation }, prompt: string, submissionId: Id<"submissions">) => {
    const start = Date.now();
    const elapsedMs = () => Date.now() - start;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Add your OPENAI_API_KEY as an env variable in the " +
          "[dashboard](https://dasboard.convex.dev)"
      );
    }
    const openai = new OpenAIApi(new Configuration({ apiKey }));

    const fail = (reason: string): Promise<never> =>
      runMutation("submissions:update", submissionId, {
        status: "failed",
        elapsedMs: elapsedMs(),
        reason,
      }).then(() => {
        throw new Error(reason);
      });

    runMutation("submissions:update", submissionId, {
      status: "generating",
      details: "Moderating prompt...",
    });
    // Check if the prompt is offensive.
    const modResponse = await openai.createModeration({
      input: prompt,
    });
    const modResult = modResponse.data.results[0];
    if (modResult.flagged) {
      await fail(
        `Your prompt was flagged: ${JSON.stringify(modResult.categories)}`
      );
    }

    runMutation("submissions:update", submissionId, {
      status: "generating",
      details: "Generating image...",
    });
    // Query OpenAI for the image.
    const opanaiResponse = await openai.createImage({
      prompt,
      size: "512x512",
    });
    const dallEImageUrl = opanaiResponse.data.data[0]["url"];
    if (!dallEImageUrl) return await fail("No image URL returned from OpenAI");

    runMutation("submissions:update", submissionId, {
      status: "generating",
      details: "Storing image...",
    });
    // Download the image
    const imageResponse = await fetch(dallEImageUrl);
    if (!imageResponse.ok) {
      await fail(`failed to download: ${imageResponse.statusText}`);
    }
    const image = Buffer.from(await imageResponse.arrayBuffer());

    // Create a Convex url to upload the image to.
    const postUrl = await runMutation("submissions:generateUploadUrl");

    // Upload the image to Convex storage.
    const postImageResponse = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": imageResponse.headers.get("content-type")! },
      body: image,
    });
    if (!postImageResponse.ok) await fail(postImageResponse.statusText);
    // Get the storageId for the upload.
    const { storageId } = (await postImageResponse.json()) as {
      storageId: string;
    };

    // Write storageId as the body of the message to the Convex database.
    await runMutation("submissions:update", submissionId, {
      status: "saved",
      imageStorageId: storageId,
      elapsedMs: elapsedMs(),
    });
  }
);
