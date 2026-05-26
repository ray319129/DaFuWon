/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player } from '../types';
import { Trophy, Medal, Sparkles } from 'lucide-react';

interface LeaderboardProps {
  players: Player[];
  currentPlayerId: string;
}

export default function Leaderboard({ players, currentPlayerId }: LeaderboardProps) {
  // Sort players by balance (descending)
  const sortedPlayers = [...players].sort((a, b) => b.balance - a.balance);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 0:
        return <Trophy className="w-5 h-5 text-amber-500 fill-amber-100" />;
      case 1:
        return <Medal className="w-5 h-5 text-slate-400 fill-slate-50" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-700 fill-orange-50" />;
      default:
        return <span className="text-xs font-mono font-black text-gray-400 w-5 text-center">#{rank + 1}</span>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2">
        {sortedPlayers.map((plr, idx) => {
          const isMe = plr.id === currentPlayerId;
          const maxBalance = Math.max(...players.map(p => p.balance), 1);
          const pct = Math.max(0, Math.min(100, (plr.balance / maxBalance) * 100));

          return (
            <div
              key={plr.id}
              className={`bg-white border-2 border-black rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative transition-all overflow-hidden ${
                isMe ? 'ring-2 ring-amber-400' : ''
              }`}
            >
              {/* Subtle wealth visual progress bar in the card background */}
              <div 
                className="absolute left-0 bottom-0 top-0 bg-emerald-500/5 transition-all duration-500 ease-out pointer-events-none"
                style={{ width: `${pct}%` }}
              />

              <div className="relative flex items-center justify-between z-10">
                <div className="flex items-center space-x-2.5">
                  <div className="flex items-center justify-center w-6 h-6">
                    {getRankBadge(idx)}
                  </div>
                  
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${plr.color} border-2 border-black flex items-center justify-center text-xl shadow-[1px_1px_0px_0px_#000]`}>
                    {plr.avatar}
                  </div>

                  <div>
                    <span className="font-black text-sm text-black block truncate max-w-[120px]">
                      {plr.name}
                      {isMe && <span className="ml-1 text-[9px] bg-blue-100 text-blue-700 px-1 py-0.2 rounded font-mono">我</span>}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono block">
                      {plr.isOnline ? '● 線上' : '○ 離線'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-base font-extrabold font-mono ${plr.balance < 0 ? 'text-rose-600' : 'text-[#008F4C]'}`}>
                    ${plr.balance.toLocaleString()}
                  </span>
                  {plr.isBanker && (
                    <span className="block text-[8px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200 px-1 rounded text-center ml-auto w-fit">
                      銀行
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
