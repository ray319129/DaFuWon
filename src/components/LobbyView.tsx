/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, Room } from '../types';
import { Sparkles, Users, User, ShieldCheck, Share2, Copy, Play } from 'lucide-react';
import { playCoinSound, playUpgradeSound } from '../utils/audio';

interface LobbyViewProps {
  room: Room;
  players: Player[];
  currentPlayerId: string;
  onStartGame: () => void;
}

export default function LobbyView({ room, players, currentPlayerId, onStartGame }: LobbyViewProps) {
  const [copied, setCopied] = useState(false);
  
  // Custom join link
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${room.id}`;
  
  // Custom QR API link
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}&color=000000&bgcolor=fdfbf7&ecc=M`;

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    playCoinSound();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    playUpgradeSound();
    onStartGame();
  };

  const isBanker = room.bankerPlayerId === currentPlayerId;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Room metadata card */}
      <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
        {/* Playful Monopoly Grid Decor */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 border-b-2 border-black" />
        
        <div className="pt-2">
          <span className="text-xs font-mono font-bold bg-[#FFD700] text-black border border-black px-2.5 py-0.5 rounded-md shadow-[1px_1px_0px_0px_#000]">
            金庫籌備中
          </span>
          <h2 className="text-2xl font-black text-black mt-2 mb-1">{room.name}</h2>
          <p className="text-xs text-gray-500 font-mono flex items-center">
            初始發放金: 
            <span className="ml-1 text-[#008F4C] font-bold font-sans text-sm">${room.initialBalance.toLocaleString()}</span>
          </p>
        </div>

        {/* Big Code and QR section */}
        <div className="mt-5 grid grid-cols-2 gap-4 bg-[#FDFBF7] p-4 rounded-xl border-2 border-dashed border-gray-300 items-center">
          <div>
            <span className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">房號 / 邀請碼</span>
            <span className="text-3xl font-black font-mono tracking-wider text-rose-600 block my-1">
              {room.id}
            </span>
            <button
              id="btn-copy-invite"
              type="button"
              onClick={copyLink}
              className="mt-2 inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg border-2 border-black bg-white hover:bg-yellow-50 active:translate-y-[1px] transition-all"
            >
              {copied ? '已複製連結！' : '複製邀請網址'}
              <Copy className="w-3.5 h-3.5 ml-1.5 text-gray-700" />
            </button>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            <div className="bg-white p-1 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <img 
                src={qrCodeUrl} 
                alt="QR Code Joint" 
                className="w-24 h-24"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="text-[9px] text-gray-400 font-bold mt-1 font-mono uppercase tracking-tight">手機掃描加入</span>
          </div>
        </div>
      </div>

      {/* Players List Grid */}
      <div className="space-y-3">
        <h3 className="text-base font-black text-black flex items-center justify-between px-1">
          <span className="flex items-center">
            <Users className="w-5 h-5 mr-1.5 text-blue-600" />
            現有參賽大亨
          </span>
          <span className="font-mono text-xs bg-gray-200 px-2 py-0.5 border border-black rounded-md">
            {players.length} 人
          </span>
        </h3>

        <div className="grid grid-cols-1 gap-2.5">
          {players.map((plr) => {
            const isMe = plr.id === currentPlayerId;
            return (
              <div 
                key={plr.id} 
                className={`bg-white border-2 border-black rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between transition-all hover:translate-y-[-1px] ${
                  isMe ? 'ring-2 ring-[#FFD700]' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${plr.color} border-2 border-black flex items-center justify-center text-2xl shadow-[1px_1px_0px_0px_#000]`}>
                    {plr.avatar}
                  </div>
                  <div>
                    <div className="font-black text-sm text-black flex items-center">
                      {plr.name}
                      {isMe && (
                        <span className="ml-1.5 text-[10px] font-mono bg-blue-50 text-blue-600 border border-blue-200 px-1 py-0.1 rounded">
                          我
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                      {plr.isBanker ? (
                        <span className="flex items-center text-rose-600 font-bold bg-rose-50 px-1 py-0.2 rounded">
                          <ShieldCheck className="w-3 h-3 mr-0.5" /> 銀行房主
                        </span>
                      ) : (
                        <span className="text-gray-400">大富翁選手</span>
                      )}
                      
                      <span className={`w-2 h-2 rounded-full ${plr.isOnline ? 'bg-emerald-500' : 'bg-gray-300'} inline-block ml-1`}></span>
                      <span className="text-[9px]">{plr.isOnline ? '在線上' : '斷線'}</span>
                    </div>
                  </div>
                </div>

                <div className="font-bold text-gray-700 text-sm bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-lg">
                  ${plr.balance.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Start Button Container */}
      <div className="pt-4 border-t-2 border-dotted border-gray-200">
        {isBanker ? (
          <div className="space-y-2">
            <button
              id="btn-lobby-start"
              onClick={handleStart}
              className="w-full bg-[#E52521] text-white font-black text-xl py-4 rounded-xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>所有人立即開局！</span>
            </button>
            <p className="text-center text-[11px] text-gray-500 leading-relaxed font-bold">
              您是房主（銀行員）。點擊後將帶領所有玩家進入大富翁電子銀行！
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-dashed border-amber-300 p-4 rounded-xl text-center">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block animate-ping mr-2"></span>
            <span className="text-xs font-bold text-amber-900">
              等待房主 (銀行官) 點擊「一鍵開局」...
            </span>
            <p className="text-[10px] text-amber-700/80 mt-1 max-w-xs mx-auto">
              開局後系統會自動即時同步。關掉網頁重開資料、交易紀錄及金額均會完全保留！
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
