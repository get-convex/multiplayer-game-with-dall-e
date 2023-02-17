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
    sessionId: s.id("sessions"),
    game: s.string(),
    updated: s.number(),
    data: s.any(),
  })
    // Index for fetching presence data
    .index("by_game_updated", ["game", "updated"])
    // Index for updating presence data
    .index("by_session_game", ["sessionId", "game"]),
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

  submissions: defineTable({
    prompt: s.string(),
    authorId: s.id("users"),
    result: s.union(
      s.object({
        status: s.literal("generating"),
        details: s.string(),
      }),
      s.object({
        status: s.literal("failed"),
        reason: s.string(),
        elapsedMs: s.number(),
      }),
      s.object({
        status: s.literal("saved"),
        imageStorageId: s.string(),
        elapsedMs: s.number(),
      })
    ),
  }),

  rounds: defineTable({
    authorId: s.id("users"),
    imageStorageId: s.string(),
    stageStart: s.number(),
    stageEnd: s.number(),
    stage: s.union(s.literal("label"), s.literal("guess"), s.literal("reveal")),
    options: s.array(
      s.object({
        authorId: s.id("users"),
        prompt: s.string(),
        votes: s.array(s.id("users")),
        likes: s.array(s.id("users")),
      })
    ),
    // For public games
    lastUsed: s.optional(s.number()),
    publicRound: s.optional(s.boolean()),
  }).index("public_game", ["publicRound", "stage", "lastUsed"]),
});
