/**
 * File shared between client & server.
 * Do not import any client-specific or server-specific code
 */

import { Id } from "./_generated/dataModel";

export const MaxPlayers = 8;

export type ClientGameState = {
  gameCode: string;
  hosting: boolean;
  players: {
    me: boolean;
    name: string;
    pictureUrl: string;
    submitted: boolean;
    score: number;
    likes: number;
  }[];
  playing: boolean;
  state:
    | {
        stage: "lobby" | "generate";
      }
    | {
        stage: "rounds";
        roundId: Id<"rounds">;
      }
    | {
        stage: "recap";
      };
  nextGameId: null | Id<"games">;
};

export type LabelState = {
  stage: "label";
  mine: boolean;
  imageUrl: string;
  stageStart: number;
  stageEnd: number;
  submitted: {
    me: boolean;
    name: string;
    pictureUrl: string;
  }[];
};

export type GuessState = {
  stage: "guess";
  mine: boolean;
  imageUrl: string;
  stageStart: number;
  stageEnd: number;
  myPrompt?: string;
  myGuess?: string;
  submitted: {
    me: boolean;
    name: string;
    pictureUrl: string;
  }[];
  options: string[];
};

type userIdString = string;
export type RevealState = {
  stage: "reveal";
  me: userIdString;
  authorId: userIdString;
  imageUrl: string;
  stageStart: number;
  stageEnd: number;
  users: Map<
    string,
    {
      me: boolean;
      name: string;
      pictureUrl: string;
    }
  >;
  results: {
    authorId: userIdString;
    prompt: string;
    votes: userIdString[];
    likes: userIdString[];
    // userid to score
    scoreDeltas: Map<userIdString, number>;
  }[];
};

export const MaxPromptLength = 100;
