import { Configuration, OpenAIApi } from "openai";
import { action } from "../_generated/server";

export default action(async ({}, prompt: string) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Add your OPENAI_API_KEY as an env variable in the " +
        "[dashboard](https://dasboard.convex.dev)"
    );
  }
  const openai = new OpenAIApi(new Configuration({ apiKey }));
  const modResponse = await openai.createModeration({
    input: prompt,
  });
  return modResponse.data.results[0];
});
