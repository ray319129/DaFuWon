/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Landmark, ArrowLeft, ArrowRight, Sparkles, Check, RefreshCw, UserCheck } from 'lucide-react';
import { Player } from '../types';

interface CreateJoinViewProps {
  onJoin: (name: string, avatar: string, color: string, roomIdStr: string) => void;
  onCreate: (name: string, avatar: string, color: string, roomName: string, initialBalance: number) => void;
  onTakeover: (roomId: string, playerId: string) => void;
  getRoomPlayers: (roomId: string) => Promise<Player[]>;
  initialRoomCode?: string;
  isFirebaseReady: boolean;
}

const AVATARS = [
  { emoji: '🎩', label: '禮帽' },
  { emoji: '🚗', label: '賽車' },
  { emoji: '🐕', label: '德地犬' },
  { emoji: '🦖', label: '恐龍' },
  { emoji: '🚢', label: '戰艦' },
  { emoji: '🦆', label: '金鴨' },
  { emoji: '🐈', label: '小貓' },
  { emoji: '🚂', label: '火車' }
];

const COLORS = [
  { name: '紅', value: 'from-rose-500 to-rose-600', ring: 'ring-rose-400', hex: '#F43F5E' },
  { name: '綠', value: 'from-emerald-500 to-emerald-600', ring: 'ring-emerald-400', hex: '#10B981' },
  { name: '藍', value: 'from-blue-500 to-blue-600', ring: 'ring-blue-400', hex: '#3B82F6' },
  { name: '黃', value: 'from-amber-400 to-amber-500', ring: 'ring-amber-300', hex: '#F59E0B' },
  { name: '紫', value: 'from-purple-500 to-purple-600', ring: 'ring-purple-400', hex: '#8B5CF6' },
  { name: '橙', value: 'from-orange-500 to-orange-600', ring: 'ring-orange-400', hex: '#F97316' }
];

export default function CreateJoinView({ onJoin, onCreate, onTakeover, getRoomPlayers, initialRoomCode, isFirebaseReady }: CreateJoinViewProps) {
  const [mode, setMode] = useState<'decision' | 'create' | 'join'>('decision');
  
  // Player state
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎩');
  const [selectedColor, setSelectedColor] = useState('from-rose-500 to-rose-600');
  
  // Create state
  const [roomName, setRoomName] = useState('大富翁金典賽');
  const [initialBalance, setInitialBalance] = useState(15000);
  
  // Join state
  const [roomIdInput, setRoomIdInput] = useState('');
  const [existingPlayers, setExistingPlayers] = useState<Player[]>([]);
  const [isFetchingPlayers, setIsFetchingPlayers] = useState(false);

  // Auto query existing players when roomIdInput reaches 6 digits
  useEffect(() => {
    if (roomIdInput.length === 6) {
      setIsFetchingPlayers(true);
      getRoomPlayers(roomIdInput)
        .then((plrs) => {
          setExistingPlayers(plrs || []);
          setIsFetchingPlayers(false);
        })
        .catch((err) => {
          console.warn("Error getting player lists for code:", roomIdInput, err);
          setExistingPlayers([]);
          setIsFetchingPlayers(false);
        });
    } else {
      setExistingPlayers([]);
    }
  }, [roomIdInput, getRoomPlayers]);

  // Handle URL auto-fill room query
  useEffect(() => {
    if (initialRoomCode) {
      setRoomIdInput(initialRoomCode);
      setMode('join');
    }
  }, [initialRoomCode]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    onCreate(playerName.trim(), selectedAvatar, selectedColor, roomName || '大富翁金庫', initialBalance);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomIdInput.trim()) return;
    onJoin(playerName.trim(), selectedAvatar, selectedColor, roomIdInput.trim());
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      {/* App Logo Emblem */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 border-4 border-black rounded-2xl shadow-[4px_4px_0px_0px_#000] mb-3 transform rotate-[-3deg]">
          <Landmark className="w-10 h-10 text-rose-600" />
        </div>
        <h1 className="text-3xl font-extrabold text-black tracking-tight font-sans">
          大富翁電子銀行
        </h1>
        <p className="text-sm text-gray-600 mt-2 font-mono">
          MONOPOLY DIGITAL CO-OP BANKING
        </p>
        
        {/* Connection Mode Tag */}
        <div className="mt-3 inline-flex">
          {isFirebaseReady ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-400">
              <span className="w-2.5 h-2.5 mr-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              連線模式 (多人即時同步)
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
              <span className="w-2.5 h-2.5 mr-1.5 rounded-full bg-amber-500"></span>
              本機單機/區域熱點模式
            </span>
          )}
        </div>
      </div>

      {/* Mode selectors */}
      {mode === 'decision' && (
        <div className="space-y-4">
          <button
            id="btn-nav-create"
            onClick={() => setMode('create')}
            className="w-full bg-[#E52521] text-white font-extrabold text-lg py-5 px-6 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-between group"
          >
            <div className="text-left">
              <div className="text-lg">我是房主 (兼銀行員)</div>
              <div className="text-xs text-rose-100 font-normal mt-0.5">創建一個全新大富翁遊戲房</div>
            </div>
            <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            id="btn-nav-join"
            onClick={() => setMode('join')}
            className="w-full bg-[#008F4C] text-white font-extrabold text-lg py-5 px-6 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-between group"
          >
            <div className="text-left">
              <div className="text-lg">我是玩家</div>
              <div className="text-xs text-emerald-100 font-normal mt-0.5">輸入房間代碼加入與朋友同樂</div>
            </div>
            <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      )}

      {/* Create Room Form */}
      {mode === 'create' && (
        <form onSubmit={handleCreateSubmit} className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5">
          <div className="flex items-center justify-between border-b-2 border-dashed border-gray-200 pb-3">
            <h2 className="text-xl font-black text-black">開起專屬遊戲間</h2>
            <button
              id="btn-create-back"
              type="button"
              onClick={() => setMode('decision')}
              className="text-gray-500 hover:text-black hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Player Identity Block */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-800">1. 理事長名字 (您的暱稱)</label>
            <input
              id="input-create-player-name"
              type="text"
              required
              placeholder="請輸入名字 (例: 大阿土)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-gray-50 border-2 border-black rounded-xl py-3 px-4 font-bold text-black focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {/* Token Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-800">2. 選一個代表棋子物件</label>
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((av) => (
                <button
                  id={`btn-avatar-create-${av.label}`}
                  key={av.emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(av.emoji)}
                  className={`py-2 text-2xl rounded-xl border-2 transition-all ${
                    selectedAvatar === av.emoji 
                      ? 'border-black bg-amber-100 scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  title={av.label}
                >
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-800">3. 選擇標誌底色</label>
            <div className="flex items-center space-x-2.5">
              {COLORS.map((col) => (
                <button
                  id={`btn-color-create-${col.name}`}
                  key={col.value}
                  type="button"
                  onClick={() => setSelectedColor(col.value)}
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${col.value} border-2 border-black flex items-center justify-center transition-transform hover:scale-110 ${
                    selectedColor === col.value ? 'scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ring-2 ring-inset ring-white' : ''
                  }`}
                >
                  {selectedColor === col.value && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Room settings */}
          <div className="space-y-4 pt-2 border-t border-gray-100">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-800">4. 房間自訂名稱</label>
              <input
                id="input-create-room-name"
                type="text"
                placeholder="例: 年夜飯大戰"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full bg-gray-50 border-2 border-black rounded-xl py-2.5 px-4 font-bold text-sm focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-800">5. 每位玩家初始資金 (0 - 10萬)</label>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-600 font-bold">$</span>
                <input
                  id="input-create-balance"
                  type="number"
                  min="0"
                  max="100000"
                  value={initialBalance}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val > 100000) {
                      setInitialBalance(100000);
                    } else if (val < 0) {
                      setInitialBalance(0);
                    } else {
                      setInitialBalance(val);
                    }
                  }}
                  className="w-full pl-7 pr-16 py-2 bg-gray-50 border-2 border-black rounded-xl font-mono text-base font-extrabold text-[#008F4C] focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-400"
                  placeholder="0"
                />
                <span className="absolute right-3 text-xs text-gray-500 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {initialBalance >= 10000 ? `${(initialBalance / 10000).toFixed(1)}萬` : `${initialBalance}元`}
                </span>
              </div>
              <input
                id="range-create-balance"
                type="range"
                min="0"
                max="100000"
                step="1000"
                value={initialBalance}
                onChange={(e) => setInitialBalance(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#008F4C] mt-2 block"
              />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                <span>$0 (免費)</span>
                <span>$2.5萬</span>
                <span>$5萬</span>
                <span>$7.5萬</span>
                <span>$10萬</span>
              </div>
            </div>
          </div>

          {/* Create room button */}
          <button
            id="btn-create-submit"
            type="submit"
            className="w-full bg-[#E52521] text-white font-black text-lg py-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all mt-4"
          >
            新置金庫 ➔ 開局！
          </button>
        </form>
      )}

      {/* Join Room Form */}
      {mode === 'join' && (
        <form onSubmit={handleJoinSubmit} className="bg-white border-4 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-5">
          <div className="flex items-center justify-between border-b-2 border-dashed border-gray-200 pb-3">
            <h2 className="text-xl font-black text-black">加入現有金庫</h2>
            <button
              id="btn-join-back"
              type="button"
              onClick={() => setMode('decision')}
              className="text-gray-500 hover:text-black hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          {/* Room ID to Join */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-800">1. 房間大富翁代碼 (6 位數)</label>
            <input
              id="input-join-room-id"
              type="text"
              required
              maxLength={6}
              placeholder="請輸入 6 碼數字 (例: 123456)"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full text-center bg-gray-50 border-2 border-black rounded-xl py-3.5 px-4 font-mono text-2xl font-black tracking-widest text-[#008F4C] focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400"
            />

            {isFetchingPlayers && (
              <div className="flex items-center justify-center py-2 space-x-2 text-xs text-gray-400 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                <span>正在查詢現有玩家名冊...</span>
              </div>
            )}

            {!isFetchingPlayers && existingPlayers.length > 0 && (
              <div className="bg-amber-50/70 border-2 border-dashed border-amber-300 rounded-xl p-3.5 mt-2 space-y-2 transition-all">
                <div className="flex items-center space-x-1.5 text-xs text-amber-850 font-bold">
                  <UserCheck className="w-4 h-4 text-amber-700" />
                  <span>★ 現實中途換人接手 / 重新連線：</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-tight">
                  如果您是中途與朋友換手機、或代碼跑掉需要重連，可以直接點擊「接管」以下玩家，登入並繼承餘額大權：
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {existingPlayers.map((p) => (
                    <button
                      id={`btn-takeover-${p.id}`}
                      key={p.id}
                      type="button"
                      onClick={() => {
                        let msg = `確認要接管玩家「${p.avatar} ${p.name}」嗎？這會直接進入遊戲並接續他的資金餘額！`;
                        if (p.isOnline) {
                          msg = `⚠️ 警告：玩家「${p.avatar} ${p.name}」目前正在另一台手機或裝置上玩（顯示為在線上）！\n\n接管此角色將會直接「強制踢出 / 擠斷線」那個正在玩的人。您確定要將他踢出並取而代之嗎？`;
                        }
                        const confirmTakeover = window.confirm(msg);
                        if (confirmTakeover) {
                          onTakeover(roomIdInput, p.id);
                        }
                      }}
                      className="flex items-center space-x-2 p-2 rounded-xl border-2 border-black bg-white hover:bg-yellow-50 hover:scale-[1.02] active:scale-[0.98] transition-all text-left shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center border border-gray-300 text-lg flex-shrink-0">
                        {p.avatar}
                      </div>
                      <div className="truncate min-w-0 flex-grow">
                        <div className="text-xs font-bold text-black truncate flex items-center justify-between">
                          <span className="truncate">{p.name}</span>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ml-1 ${p.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} title={p.isOnline ? '在線上' : '離線'}></span>
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono tracking-tight flex items-center justify-between mt-0.5">
                          <span>${p.balance.toLocaleString()}</span>
                          {p.isOnline && (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded font-bold scale-90 origin-right">
                              線上
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Player Identity Block */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-gray-800">2. 我的地產大亨暱稱</label>
            <input
              id="input-join-player-name"
              type="text"
              required
              placeholder="請輸入名字 (例: 沙隆巴斯)"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-gray-50 border-2 border-black rounded-xl py-3 px-4 font-bold text-black focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Token Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-800">3. 選一個代表棋子物件</label>
            <div className="grid grid-cols-4 gap-2">
              {AVATARS.map((av) => (
                <button
                  id={`btn-avatar-join-${av.label}`}
                  key={av.emoji}
                  type="button"
                  onClick={() => setSelectedAvatar(av.emoji)}
                  className={`py-2 text-2xl rounded-xl border-2 transition-all ${
                    selectedAvatar === av.emoji 
                      ? 'border-black bg-amber-100 scale-105 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                  title={av.label}
                >
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-800">4. 選擇標誌底色</label>
            <div className="flex items-center space-x-2.5">
              {COLORS.map((col) => (
                <button
                  id={`btn-color-join-${col.name}`}
                  key={col.value}
                  type="button"
                  onClick={() => setSelectedColor(col.value)}
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${col.value} border-2 border-black flex items-center justify-center transition-transform hover:scale-110 ${
                    selectedColor === col.value ? 'scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ring-2 ring-inset ring-white' : ''
                  }`}
                >
                  {selectedColor === col.value && <Check className="w-4 h-4 text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Join button */}
          <button
            id="btn-join-submit"
            type="submit"
            className="w-full bg-[#008F4C] text-white font-black text-lg py-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all mt-4"
          >
            出發買地 ➔ 匯入房間
          </button>
        </form>
      )}
    </div>
  );
}
