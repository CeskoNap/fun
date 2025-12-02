# API Reference - Frontend Integration (MVP)

## Auth (MVP)

- Le route protette usano per ora l'header `X-User-Id` per identificare l'utente.
- In futuro sarà sostituito da OAuth/JWT.

---

## Levels

### GET `/levels/me`

**Descrizione:** Ritorna livello corrente, XP e XP verso il prossimo livello.

**Headers:**
- `X-User-Id: <userId>`

**Response 200:**
```json
{
  "level": 12,
  "xp": "345.00",
  "totalXpEarned": "1345.00",
  "xpToNextLevel": "155.00"
}
```

---

## Bets (MVP one-shot)

### POST `/bets`

**Descrizione:** Crea e risolve una bet (Mines o Plinko) in un’unica chiamata.

**Headers:**
- `X-User-Id: <userId>`

**Body (Mines):**
```json
{
  "gameType": "MINES",
  "amount": 100.0,
  "clientSeed": "optional-client-seed",
  "params": {
    "rows": 5,
    "cols": 5,
    "minesCount": 5
  }
}
```

**Body (Plinko):**
```json
{
  "gameType": "PLINKO",
  "amount": 50.0,
  "clientSeed": "optional-client-seed",
  "params": {
    "plinkoRows": 12,
    "risk": "medium"
  }
}
```

**Response 200:**
```json
{
  "betId": "bet_123",
  "gameType": "MINES",
  "status": "WON",
  "amount": "100.00000000",
  "payout": "250.00000000",
  "multiplier": 2.5,
  "xpEarned": "10.00",
  "newLevel": 13,
  "levelsGained": 1,
  "balance": "5000.00000000",
  "gameData": {
    "rows": 5,
    "cols": 5,
    "minesCount": 5,
    "minePositions": [1, 7, 12, 18, 23],
    "safeRevealed": 4,
    "finalMultiplier": 2.5,
    "hitMine": false
  }
}
```

Per **Plinko**:
```json
"gameData": {
  "rows": 12,
  "risk": "medium",
  "path": ["L", "R", "R", "..."],
  "finalSlot": 7,
  "finalMultiplier": 1.6
}
```

**Errori comuni:**
- `400` – amount non valido, game non attivo, min/max violati, saldo insufficiente.
- `401` – header `X-User-Id` mancante (non autenticato).

---

## Rewards

### POST `/rewards/daily`

**Descrizione:** Claim del daily reward (1 volta al giorno, reset 02:00 server time).

**Headers:**
- `X-User-Id`

**Response 200:**
```json
{
  "amount": "550.00000000",
  "streak": 8,
  "level": 42
}
```

**Errori:**
- `400` – daily già riscattato.

---

### POST `/rewards/faucet`

**Descrizione:** Claim del faucet orario (cooldown 1 ora, limite giornaliero).

**Headers:**
- `X-User-Id`

**Response 200:**
```json
{
  "amount": "35.00000000",
  "nextAvailableAt": "2025-01-15T15:00:00.000Z",
  "claimsToday": 3,
  "dailyLimit": 12
}
```

**Errori:**
- `400` – cooldown attivo o limite giornaliero raggiunto.

---

### POST `/rewards/ads`

**Descrizione:** Reward per ad completata (max 5/h, max 30/giorno di default).

**Headers:**
- `X-User-Id`

**Body:**
```json
{
  "provider": "admob"
}
```

**Response 200:**
```json
{
  "amount": "50.00000000",
  "adsThisHour": 2,
  "adsToday": 10,
  "hourlyLimit": 5,
  "dailyLimit": 30
}
```

**Errori:**
- `400` – limite orario o giornaliero superato.
- `404` – ad rewards disabilitati.

---

### POST `/rewards/quiz/start`

**Descrizione:** Avvia il quiz giornaliero, restituisce 3 domande nella lingua utente.

**IMPORTANTE:**  
Non viene mai inviato `correctAnswerIndex` nel response, per evitare cheat.

**Headers:**
- `X-User-Id`

**Response 200:**
```json
{
  "attemptId": "quiz_123",
  "questions": [
    {
      "id": "q1",
      "questionText": "What is Bitcoin?",
      "options": ["A cryptocurrency", "A bank", "A company", "A country"]
    },
    {
      "id": "q2",
      "questionText": "What is Ethereum?",
      "options": ["...", "...", "...", "..."]
    },
    {
      "id": "q3",
      "questionText": "What is a smart contract?",
      "options": ["...", "...", "...", "..."]
    }
  ]
}
```

**Errori:**
- `400` – quiz già completato oggi, o domande insufficienti.

---

### POST `/rewards/quiz/submit`

**Descrizione:** Invia le risposte al quiz giornaliero.

**Headers:**
- `X-User-Id`

**Body:**
```json
{
  "attemptId": "quiz_123",
  "answers": [0, 1, 2]
}
```

**Response 200:**
```json
{
  "correctCount": 2,
  "amount": "150.00000000",
  "questions": [
    {
      "questionId": "q1",
      "userAnswer": 0,
      "correctAnswer": 0,
      "isCorrect": true
    },
    {
      "questionId": "q2",
      "userAnswer": 1,
      "correctAnswer": 3,
      "isCorrect": false
    },
    {
      "questionId": "q3",
      "userAnswer": 2,
      "correctAnswer": 2,
      "isCorrect": true
    }
  ]
}
```

**Errori:**
- `400` – numero risposte diverso da 3, tentativo non del giorno corrente, già completato.
- `404` – attempt non trovato.

---

## Admin (solo backend / pannello)

**NB:** Non esporre queste API al frontend pubblico.

- `GET /admin/config/xp`
- `PUT /admin/config/xp`
- `GET /admin/config/levels`
- `PUT /admin/config/levels/:level`
- `GET /admin/config/rewards/:type`  (`daily`, `faucet`, `quiz`, `streak`)
- `PUT /admin/config/rewards/:type`
- `GET /admin/config/ads`
- `PUT /admin/config/ads`
- `GET /admin/config/races/:name`
- `PUT /admin/config/races/:name`
- `GET /admin/emission-estimate`

---

## WebSocket Events (namespace `/user`)

Il frontend si connette a:

- `ws://<BACKEND_URL>/user`

e joina la stanza `user:{userId}`.

**Eventi:**

- `balance:update`
  ```json
  {
    "balance": "5000.00000000",
    "timestamp": "2025-01-15T12:00:00.000Z"
  }
  ```

- `bet:resolved`
  ```json
  {
    "betId": "bet_123",
    "gameType": "MINES",
    "status": "WON",
    "payout": "250.00000000",
    "multiplier": 2.5,
    "xpEarned": "10.00",
    "newLevel": 13,
    "levelsGained": 1,
    "balance": "5000.00000000",
    "gameData": { "...": "..." }
  }
  ```

- `level:up`
  ```json
  {
    "oldLevel": 12,
    "newLevel": 13,
    "levelsGained": 1,
    "rewards": [
      { "level": 13, "amount": "1000.00000000" }
    ],
    "totalXP": "1355.00"
  }
  ```

- `reward:claimed`
  ```json
  {
    "type": "daily",        // 'daily' | 'faucet' | 'ad' | 'quiz' | ...
    "amount": "550.00000000",
    "timestamp": "2025-01-15T12:05:00.000Z"
  }
  ```


