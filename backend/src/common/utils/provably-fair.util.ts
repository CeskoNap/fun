/**
 * Provably fair utilities (HMAC-SHA256).
 *
 * NOTE (MVP):
 * - Per l'MVP generiamo un `serverSeed` diverso per ogni bet.
 * - In un modello provably fair classico, il server usa un serverSeed a lungo termine,
 *   ne mostra l'hash (serverSeedHash) agli utenti prima del gioco e rivela il seed
 *   solo dopo un certo numero di round.
 * - L'architettura è pensata per poter passare facilmente a quel modello:
 *   basterà salvare serverSeed + serverSeedHash a livello di sessione/utente,
 *   invece che per singola bet.
 */

import { createHmac, randomBytes } from 'crypto';

/**
 * Generate a random server seed (hex string) for a bet.
 * In futuro potremo generare un serverSeed per "sessione" e memorizzarne l'hash.
 */
export function generateServerSeed(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Deterministic HMAC-SHA256
 * key = serverSeed, message = `${clientSeed}:${nonce}:${cursor}`
 */
export function hmacSha256(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  cursor: number = 0,
): string {
  const hmac = createHmac('sha256', serverSeed);
  hmac.update(`${clientSeed}:${nonce}:${cursor}`);
  return hmac.digest('hex');
}

/**
 * Get a pseudo-random float in [0, 1) from HMAC output.
 */
export function getRandomFloat01(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  cursor: number = 0,
): number {
  const hash = hmacSha256(serverSeed, clientSeed, nonce, cursor);
  // Use first 13 hex chars (~52 bits) for a double-safe fraction
  const slice = hash.substring(0, 13);
  const int = parseInt(slice, 16);
  return int / Math.pow(2, 52);
}

{
  "cells": [],
  "metadata": {
    "language_info": {
      "name": "python"
    }
  },
  "nbformat": 4,
  "nbformat_minor": 2
}