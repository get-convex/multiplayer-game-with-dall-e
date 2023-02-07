import { defineSchema, defineTable, s } from "convex/schema";

export default defineSchema({
  // For withUser:
  users: defineTable({
    name: s.string(),
    pictureUrl: s.string(),
    tokenIdentifier: s.optional(s.string()),
    claimedByUserId: s.optional(s.id("users")),
  }).index("by_token", ["tokenIdentifier"]),
  // End withUser

  // For presence:
  presence: defineTable({
    userId: s.id("users"),
    game: s.string(),
    updated: s.number(),
    data: s.any(),
  })
    // Index for fetching presence data
    .index("by_game_updated", ["game", "updated"])
    // Index for updating presence data
    .index("by_user_game", ["userId", "game"]),
  // End presence

  // For sessions:
  sessions: defineTable({
    userId: s.id("users"),
    submissionIds: s.array(s.id("submissions")),
    gameIds: s.array(s.id("games")),
  }), // Make as specific as you want
  // End sessions

  games: defineTable({
    hostId: s.id("users"),
    playerIds: s.array(s.id("users")),
    slug: s.string(),
    roundIds: s.array(s.id("rounds")),
    state: s.union(
      s.object({
        stage: s.union(
          s.literal("lobby"),
          s.literal("generate"),
          s.literal("recap")
        ),
      }),
      s.object({
        stage: s.literal("rounds"),
        roundId: s.id("rounds"),
      })
    ),
    nextGameId: s.optional(s.id("games")),
  }).index("s", ["slug"]),
  publicGame: defineTable({
    roundId: s.id("rounds"),
  }),
  submissions: defineTable(
    s.union(
      s.object({
        prompt: s.string(),
        authorId: s.id("users"),
        status: s.literal("generating"),
      }),
      s.object({
        prompt: s.string(),
        authorId: s.id("users"),
        status: s.literal("failed"),
        reason: s.string(),
      }),
      s.object({
        prompt: s.string(),
        authorId: s.id("users"),
        status: s.literal("saved"),
        imageStorageId: s.string(),
        // used for public game
        lastUsed: s.number(),
      })
    )
  ).index("status_by_unused", ["status", "lastUsed"]),
  rounds: defineTable({
    authorId: s.id("users"),
    imageStorageId: s.string(),
    stageStart: s.number(),
    stageEnd: s.number(),
    stage: s.union(s.literal("label"), s.literal("guess"), s.literal("reveal")),
    maxOptions: s.number(),
    options: s.array(
      s.object({
        authorId: s.id("users"),
        prompt: s.string(),
        votes: s.array(s.id("users")),
        likes: s.array(s.id("users")),
      })
    ),
  }),
});
