import { ApiError } from "./apiClient";

export type EndpointKey =
  | "bets"
  | "rewards.daily"
  | "rewards.faucet"
  | "rewards.ads"
  | "rewards.quiz.start"
  | "rewards.quiz.submit"
  | "transfers"
  | "races";

export function mapErrorKey(endpoint: EndpointKey, error: ApiError): string {
  const status = error.status;

  switch (endpoint) {
    case "rewards.daily":
      if (status === 400) return "errors.dailyAlreadyClaimed";
      return "errors.generic";
    case "rewards.faucet":
      if (status === 400) return "errors.faucetUnavailable";
      return "errors.generic";
    case "rewards.ads":
      if (status === 400) return "errors.adsUnavailable";
      return "errors.generic";
    case "rewards.quiz.start":
      if (status === 400) return "errors.quizUnavailable";
      return "errors.generic";
    case "rewards.quiz.submit":
      if (status === 400) return "errors.quizSubmitFailed";
      return "errors.generic";
    case "bets":
      return "errors.betFailed";
    case "transfers":
      if (status === 400) return "errors.transferLimit";
      return "errors.transferFailed";
    case "races":
      if (status === 400) return "errors.raceNotAvailable";
      return "errors.raceJoinFailed";
    default:
      return "errors.generic";
  }
}

