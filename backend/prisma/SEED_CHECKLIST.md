# Seed Update Checklist

Questo documento elenca tutte le modifiche che richiedono un aggiornamento del file `seed.ts`.

## ✅ Checklist - Modifiche che richiedono update del seed:

### 1. Schema Prisma (`schema.prisma`)
- [ ] **Game Model**: Modifiche a `GameType` enum → Aggiungere/aggiornare nel seed
- [ ] **Game Model**: Modifiche a campi `Game` (houseEdge, minBet, maxBet, config) → Aggiornare seed
- [ ] **XpConfig Model**: Qualsiasi modifica → Aggiornare seed
- [ ] **LevelConfig Model**: Modifiche a struttura o valori → Aggiornare seed
- [ ] **RewardConfig Model**: Nuovi tipi o modifiche esistenti → Aggiornare seed
- [ ] **AdRewardConfig Model**: Modifiche a campi → Aggiornare seed
- [ ] **WheelConfig Model**: Modifiche a struttura segments → Aggiornare seed
- [ ] **RaceConfig Model**: Modifiche a entryFee o prizeDistribution → Aggiornare seed
- [ ] **Config Model**: Nuove chiavi di configurazione → Aggiungere al seed
- [ ] **FeatureFlag Model**: Nuove feature flags → Aggiungere al seed
- [ ] **Mission Model**: Nuove missioni di default → Aggiungere al seed (se necessario)
- [ ] **Achievement Model**: Nuovi achievement di default → Aggiungere al seed (se necessario)

### 2. Codice Backend
- [ ] **Nuovo GameType enum**: Aggiungere game nel seed
- [ ] **Modifiche a servizi che usano configurazioni**: Se cambiano valori di default, aggiornare seed
- [ ] **Nuove configurazioni in servizi**: Se richiedono dati iniziali, aggiungere al seed

### 3. Modifiche comuni che richiedono update seed:
- [ ] Aggiunta nuovo gioco
- [ ] Modifica formula XP/Level
- [ ] Modifica bonus iniziale utenti
- [ ] Modifica limiti trasferimenti
- [ ] Modifica reward amounts (daily, faucet, quiz)
- [ ] Modifica house edge giochi
- [ ] Modifica min/max bet giochi
- [ ] Aggiunta nuova feature flag
- [ ] Modifica configurazione wheel/race

## ❌ Modifiche che NON richiedono update seed:
- Modifiche a logica applicativa (services, controllers)
- Modifiche a DTOs
- Modifiche a frontend
- Aggiunta di migrazioni per nuovi campi opzionali
- Modifiche a dati utente (User, Bet, Transaction, ecc.)

## 🔍 Come verificare automaticamente:

Quando modifichi qualcosa, chiediti:
1. "Questa modifica cambia i DATI INIZIALI che tutti devono avere?"
2. "Se qualcuno clona il progetto, avrà bisogno di questi dati per far funzionare la piattaforma?"
3. "Questa è una CONFIGURAZIONE o un DATO UTENTE?"

Se la risposta è "Sì" alle prime due e "CONFIGURAZIONE" alla terza → Aggiorna il seed!

