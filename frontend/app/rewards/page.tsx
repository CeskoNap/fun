"use client";

import { useState } from "react";
import { useStore } from "../../src/store/useStore";
import { apiClient, ApiError } from "../../src/lib/apiClient";
import { mapErrorKey } from "../../src/lib/errorMapping";
import { useI18n } from "../../src/i18n/useI18n";
import { useToast } from "../../src/components/ToastProvider";

interface DailyResult {
  amount: string;
  streak: number;
  level: number;
}

interface FaucetResult {
  amount: string;
  nextAvailableAt: string;
  claimsToday: number;
  dailyLimit: number;
}

interface AdsResult {
  amount: string;
  adsThisHour: number;
  adsToday: number;
  hourlyLimit: number;
  dailyLimit: number;
}

interface QuizStart {
  attemptId: string;
  questions: {
    id: string;
    questionText: string;
    options: string[];
  }[];
}

interface QuizSubmit {
  correctCount: number;
  amount: string;
  questions: {
    questionId: string;
    userAnswer: number;
    correctAnswer: number;
    isCorrect: boolean;
  }[];
}

export default function RewardsPage() {
  const { balance, setBalance } = useStore();
  const { t } = useI18n();
  const { addToast } = useToast();

  const [daily, setDaily] = useState<DailyResult | null>(null);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);

  const [faucet, setFaucet] = useState<FaucetResult | null>(null);
  const [faucetError, setFaucetError] = useState<string | null>(null);
  const [claimingFaucet, setClaimingFaucet] = useState(false);

  const [ads, setAds] = useState<AdsResult | null>(null);
  const [adsError, setAdsError] = useState<string | null>(null);
  const [claimingAds, setClaimingAds] = useState(false);

  const [quizStart, setQuizStart] = useState<QuizStart | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([0, 0, 0]);
  const [quizResult, setQuizResult] = useState<QuizSubmit | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // DAILY
  const handleClaimDaily = async () => {
    setClaimingDaily(true);
    setDailyError(null);
    try {
      const data = await apiClient.post<DailyResult>("/rewards/daily");
      setDaily(data);
      addToast({
        type: "success",
        message: `Daily reward: +${Math.round(parseFloat(data.amount)).toLocaleString()} FUN`,
      });
    } catch (e: any) {
      if (e instanceof ApiError) {
        const key = mapErrorKey("rewards.daily", e);
        setDailyError(t(key));
      } else {
        setDailyError(t("errors.generic"));
      }
    } finally {
      setClaimingDaily(false);
    }
  };

  // FAUCET
  const handleClaimFaucet = async () => {
    setClaimingFaucet(true);
    setFaucetError(null);
    try {
      const data = await apiClient.post<any>("/rewards/faucet");
      setFaucet({
        amount: data.amount,
        nextAvailableAt: data.nextAvailableAt,
        claimsToday: data.claimsToday,
        dailyLimit: data.dailyLimit,
      });
      addToast({
        type: "success",
        message: `Faucet: +${Math.round(parseFloat(data.amount)).toLocaleString()} FUN`,
      });
    } catch (e: any) {
      if (e instanceof ApiError) {
        const key = mapErrorKey("rewards.faucet", e);
        setFaucetError(t(key));
      } else {
        setFaucetError(t("errors.generic"));
      }
    } finally {
      setClaimingFaucet(false);
    }
  };

  // ADS
  const handleClaimAds = async () => {
    setClaimingAds(true);
    setAdsError(null);
    try {
      const data = await apiClient.post<any>("/rewards/ads", {
        provider: "admob",
      });
      setAds({
        amount: data.amount,
        adsThisHour: data.adsThisHour,
        adsToday: data.adsToday,
        hourlyLimit: data.hourlyLimit,
        dailyLimit: data.dailyLimit,
      });
      addToast({
        type: "success",
        message: `Ad reward: +${Math.round(parseFloat(data.amount)).toLocaleString()} FUN`,
      });
    } catch (e: any) {
      if (e instanceof ApiError) {
        const key = mapErrorKey("rewards.ads", e);
        setAdsError(t(key));
      } else {
        setAdsError(t("errors.generic"));
      }
    } finally {
      setClaimingAds(false);
    }
  };

  // QUIZ
  const handleStartQuiz = async () => {
    setStartingQuiz(true);
    setQuizError(null);
    setQuizResult(null);
    try {
      const data = await apiClient.post<QuizStart>("/rewards/quiz/start");
      setQuizStart(data);
      setQuizAnswers(new Array(data.questions.length).fill(0));
    } catch (e: any) {
      if (e instanceof ApiError) {
        const key = mapErrorKey("rewards.quiz.start", e);
        setQuizError(t(key));
      } else {
        setQuizError(t("errors.generic"));
      }
    } finally {
      setStartingQuiz(false);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizStart) return;
    setSubmittingQuiz(true);
    setQuizError(null);
    try {
      const data = await apiClient.post<QuizSubmit>("/rewards/quiz/submit", {
        attemptId: quizStart.attemptId,
        answers: quizAnswers,
      });
      setQuizResult(data);
      // opzionale: aggiornare balance dal server
      const br = await fetch(`${API_BASE}/me/balance`, {
        headers: { "X-User-Id": USER_ID },
      });
      if (br.ok) {
        const bdata = await br.json();
        const bal = parseFloat(bdata.balance);
        if (!isNaN(bal)) setBalance(bal);
      }
      addToast({
        type: "success",
        message: `Quiz reward: +${Math.round(parseFloat(data.amount)).toLocaleString()} FUN`,
      });
    } catch (e: any) {
      if (e instanceof ApiError) {
        const key = mapErrorKey("rewards.quiz.submit", e);
        setQuizError(t(key));
      } else {
        setQuizError(t("errors.generic"));
      }
    } finally {
      setSubmittingQuiz(false);
    }
  };

  return (
    <section className="py-12 overflow-visible">
      <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Rewards</h1>
      <p className="text-sm text-zinc-400">
        Claim your daily, faucet, ad and quiz rewards.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* DAILY */}
        <section className="bg-card/80 rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold">Daily Reward</h2>
          <button
            onClick={handleClaimDaily}
            disabled={claimingDaily}
            className="px-3 py-2 rounded bg-accent text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {claimingDaily ? "Claiming..." : "Claim Daily"}
          </button>
          {daily && (
            <div className="text-sm text-zinc-300 space-y-1">
              <div>Amount: {Math.round(parseFloat(daily.amount)).toLocaleString()} FUN</div>
              <div>Streak: {daily.streak} days</div>
              <div>Level at claim: {daily.level}</div>
            </div>
          )}
          {dailyError && (
            <div className="text-sm text-red-400">{dailyError}</div>
          )}
        </section>

        {/* FAUCET */}
        <section className="bg-card/80 rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold">Hourly Faucet</h2>
          <button
            onClick={handleClaimFaucet}
            disabled={claimingFaucet}
            className="px-3 py-2 rounded bg-accent text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {claimingFaucet ? "Claiming..." : "Claim Faucet"}
          </button>
          {faucet && (
            <div className="text-sm text-zinc-300 space-y-1">
              <div>Amount: {Math.round(parseFloat(faucet.amount)).toLocaleString()} FUN</div>
              <div>
                Claims today: {faucet.claimsToday} / {faucet.dailyLimit}
              </div>
              <div>
                Next available at:{" "}
                {new Date(faucet.nextAvailableAt).toLocaleTimeString()}
              </div>
            </div>
          )}
          {faucetError && (
            <div className="text-sm text-red-400">{faucetError}</div>
          )}
        </section>

        {/* ADS */}
        <section className="bg-card/80 rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold">Rewarded Ads</h2>
          <button
            onClick={handleClaimAds}
            disabled={claimingAds}
            className="px-3 py-2 rounded bg-accent text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {claimingAds ? "Claiming..." : "Watch Ad & Claim"}
          </button>
          {ads && (
            <div className="text-sm text-zinc-300 space-y-1">
              <div>Amount: {Math.round(parseFloat(ads.amount)).toLocaleString()} FUN</div>
              <div>
                This hour: {ads.adsThisHour} / {ads.hourlyLimit}
              </div>
              <div>
                Today: {ads.adsToday} / {ads.dailyLimit}
              </div>
            </div>
          )}
          {adsError && <div className="text-sm text-red-400">{adsError}</div>}
        </section>

        {/* QUIZ */}
        <section className="bg-card/80 rounded-xl p-4 space-y-3">
          <h2 className="text-lg font-semibold">Daily Quiz</h2>
          {!quizStart && !quizResult && (
            <button
              onClick={handleStartQuiz}
              disabled={startingQuiz}
              className="px-3 py-2 rounded bg-accent text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {startingQuiz ? "Loading..." : "Start Quiz"}
            </button>
          )}

          {quizStart && (
            <div className="space-y-3">
              {quizStart.questions.map((q, idx) => (
                <div key={q.id} className="text-sm space-y-1">
                  <div className="font-semibold">
                    Q{idx + 1}. {q.questionText}
                  </div>
                  <div className="flex flex-col gap-1">
                    {q.options.map((opt, i) => (
                      <label key={i} className="flex items-center gap-2 text-zinc-300">
                        <input
                          type="radio"
                          name={`q-${idx}`}
                          value={i}
                          checked={quizAnswers[idx] === i}
                          onChange={() => {
                            const next = [...quizAnswers];
                            next[idx] = i;
                            setQuizAnswers(next);
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={handleSubmitQuiz}
                disabled={submittingQuiz}
                className="mt-2 px-3 py-2 rounded bg-accent text-black text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submittingQuiz ? "Submitting..." : "Submit Answers"}
              </button>
            </div>
          )}

          {quizResult && (
            <div className="space-y-2 text-sm text-zinc-300">
              <div>Correct answers: {quizResult.correctCount} / 3</div>
              <div>Reward: {Math.round(parseFloat(quizResult.amount)).toLocaleString()} FUN</div>
              <div className="mt-2 space-y-1">
                {quizResult.questions.map((q, idx) => (
                  <div key={q.questionId}>
                    <span>
                      Q{idx + 1}:{" "}
                      <span className={q.isCorrect ? "text-accent" : "text-red-400"}>
                        {q.isCorrect ? "Correct" : "Wrong"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {quizError && (
            <div className="text-sm text-red-400">{quizError}</div>
          )}
        </section>
      </div>
      </div>
    </section>
  );
}


