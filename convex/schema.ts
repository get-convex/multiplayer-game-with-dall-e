import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    pictureUrl: v.string(),
    tokenIdentifier: v.optional(v.string()),
    claimedByUserId: v.optional(v.id("users")),
  }).index("by_token", ["tokenIdentifier"]),

  // For sessions:
  sessions: defineTable({
    userId: v.id("users"),
    submissionIds: v.array(v.id("submissions")),
    gameIds: v.array(v.id("games")),
  }), // Make as specific as you want
  // End sessions

  games: defineTable({
    hostId: v.id("users"),
    playerIds: v.array(v.id("users")),
    slug: v.string(),
    roundIds: v.array(v.id("rounds")),
    state: v.union(
      v.object({
        stage: v.union(
          v.literal("lobby"),
          v.literal("generate"),
          v.literal("recap")
        ),
      }),
      v.object({
        stage: v.literal("rounds"),
        roundId: v.id("rounds"),
      })
    ),
    nextGameId: v.optional(v.id("games")),
  }).index("s", ["slug"]),

  publicGame: defineTable({
    roundId: v.id("rounds"),
  }),

  submissions: defineTable({
    prompt: v.string(),
    authorId: v.id("users"),
    result: v.union(
      v.object({
        status: v.literal("generating"),
        details: v.string(),
      }),
      v.object({
        status: v.literal("failed"),
        reason: v.string(),
        elapsedMs: v.number(),
      }),
      v.object({
        status: v.literal("saved"),
        imageStorageId: v.string(),
        elapsedMs: v.number(),
      })
    ),
  }),

  rounds: defineTable({
    authorId: v.id("users"),
    imageStorageId: v.string(),
    stageStart: v.number(),
    stageEnd: v.number(),
    stage: v.union(v.literal("label"), v.literal("guess"), v.literal("reveal")),
    options: v.array(
      v.object({
        authorId: v.id("users"),
        prompt: v.string(),
        votes: v.array(v.id("users")),
        likes: v.array(v.id("users")),
      })
    ),
    // For public games
    lastUsed: v.optional(v.number()),
    publicRound: v.optional(v.boolean()),
  }).index("public_game", ["publicRound", "stage", "lastUsed"]),
});
