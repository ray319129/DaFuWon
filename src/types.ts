/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Player {
  id: string;
  name: string;
  avatar: string; // Emoji representing token e.g. 🎩, 🚗, 🐕, 🦖
  color: string;  // Hex or Tailwind class colors
  balance: number;
  isBanker: boolean;
  isOnline: boolean;
  joinedAt: number; // UTC timestamp
}

export interface Room {
  id: string; // 6-digit room code, e.g. "123456"
  name: string;
  initialBalance: number;
  status: 'lobby' | 'playing';
  bankerPlayerId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  fromId: string; // "bank" or playerId
  fromName: string; // "銀行" or PlayerName
  toId: string;   // "bank" or playerId
  toName: string;   // "銀行" or PlayerName
  amount: number;
  type: 'bank_give' | 'bank_take' | 'transfer' | 'reset';
  timestamp: number;
}

export type ViewState = 'home' | 'create_room' | 'join_room' | 'lobby' | 'game' | 'banker_panel';
