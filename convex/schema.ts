import { defineSchema, defineTable, s } from "convex/schema";

export default defineSchema({
  // For withUser:
  users: defineTable({
    name: s.string(),
    emoji: s.string(),
    email: s.optional(s.string()),
    profPicUrl: s.optional(s.string()),
    tokenIdentifier: s.optional(s.string()),
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
  }).index("s", ["slug"]),
  publicGame: defineTable({
    roundId: s.id("rounds"),
  }),
  submissions: defineTable({
    imageStorageId: s.string(),
    prompt: s.string(),
    author: s.id("users"),
  }),
  rounds: defineTable({
    submissionId: s.id("submissions"),
    stageStart: s.number(),
    stageEnd: s.number(),
    stage: s.union(s.literal("label"), s.literal("guess"), s.literal("reveal")),
    maxOptions: s.number(),
    options: s.array(
      s.object({
        author: s.id("users"),
        prompt: s.string(),
        votes: s.array(s.id("users")),
        likes: s.array(s.id("users")),
      })
    ),
  }),
});
