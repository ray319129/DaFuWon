/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, Room, Transaction } from '../types';
import Leaderboard from './Leaderboard';
import TransactionHistory from './TransactionHistory';
import BankerDashboard from './BankerDashboard';
import { playCoinSound, playDebitSound } from '../utils/audio';
import { Landmark, Send, ArrowDownUp, Trophy, ShieldAlert, LogOut } from 'lucide-react';

interface GameViewProps {
  room: Room;
  players: Player[];
  transactions: Transaction[];
  currentPlayerId: string;
  onTransfer: (toPlayerId: string, amount: number) => void;
  // Banker pass-throughs
  onBankGive: (playerIdTo: string, amount: number) => void;
  onBankTake: (playerIdFrom: string, amount: number) => void;
  onBankSet: (playerId: string, exactAmount: number) => void;
  onResetGame: () => void;
  onLeaveRoom: () => void;
  isFirebaseReady: boolean;
}

export default function GameView({
  room,
  players,
  transactions,
  currentPlayerId,
  onTransfer,
  onBankGive,
  onBankTake,
  onBankSet,
  onResetGame,
  onLeaveRoom,
  isFirebaseReady
}: GameViewProps) {
  const [activeTab, setActiveTab] = useState<'account' | 'leaderboard' | 'banker'>('account');
  
  // Transfer form state
  const [payeeId, setPayeeId] = useState('');
  const [transferAmountStr, setTransferAmountStr] = useState('');
  const [txNote, setTxNote] = useState('');

  const me = players.find(p => p.id === currentPlayerId);
  if (!me) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-10 bg-white border-2 border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6">
        <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h3 className="text-lg font-black text-black">查無任何與您相關的大亨玩家資料</h3>
        <p className="text-xs text-gray-500 mt-1">
          系統正在檢索或是連結中，若長期未載入，請嘗試重新點擊加入。
        </p>
        <button
          id="btn-error-reboot"
          onClick={onLeaveRoom}
          className="mt-4 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 border-2 border-black font-bold text-xs rounded-xl"
        >
          返回大富翁登入
        </button>
      </div>
    );
  }

  const otherPlayers = players.filter(p => p.id !== currentPlayerId);
  const isBanker = me.isBanker;

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = Number(transferAmountStr);
    if (!payeeId) {
      alert("請選擇收款對象！");
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("請輸入合法的轉帳金！");
      return;
    }
    if (me.balance < amountVal) {
      if (!confirm("餘額不足，確定要把帳戶扣至負債 (透支模式)？")) {
        return;
      }
    }

    onTransfer(payeeId, amountVal);
    playDebitSound();
    
    // Clear state
    setTransferAmountStr('');
    setPayeeId('');
  };

  const addShortcutValue = (val: number) => {
    setTransferAmountStr(String((Number(transferAmountStr) || 0) + val));
  };

  return (
    <div className="w-full max-w-md mx-auto px-3 py-4 space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div className="truncate">
          <h2 className="text-base font-black text-black truncate flex items-center">
            <Landmark className="w-4 h-4 mr-1.5 text-rose-600" />
            {room.name}
          </h2>
          <span className="text-[9px] font-semibold text-gray-400 font-mono tracking-tight block">
            房代碼: {room.id} • {isFirebaseReady ? '● 雲端即時連線' : '▲ 本機實裝模式'}
          </span>
        </div>
        
        <button
          id="btn-game-leave"
          onClick={() => {
            if (confirm("確定要離開此遊戲代碼房？（您的資料與金額仍會被保留在此房間編號中）")) {
              onLeaveRoom();
            }
          }}
          className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
          title="退出登出"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs list (Neubrutalist style) */}
      <div className="grid grid-cols-3 gap-1 bg-gray-100 border-2 border-black p-1 rounded-xl shadow-[1px_1px_0px_0px_#000]">
        <button
          id="tab-account"
          onClick={() => setActiveTab('account')}
          className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center space-x-1 ${
            activeTab === 'account' 
              ? 'bg-white border-2 border-black text-black scale-102 shadow-[1px_2px_0px_0px_rgba(0,0,0,1)]' 
              : 'text-gray-500 hover:text-black hover:bg-gray-50'
          }`}
        >
          <ArrowDownUp className="w-3.5 h-3.5" />
          <span>金庫轉帳</span>
        </button>

        <button
          id="tab-leaderboard"
          onClick={() => setActiveTab('leaderboard')}
          className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center space-x-1 ${
            activeTab === 'leaderboard' 
              ? 'bg-white border-2 border-black text-black scale-102 shadow-[1px_2px_0px_0px_rgba(0,0,0,1)]' 
              : 'text-gray-500 hover:text-black hover:bg-gray-50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>排行榜</span>
        </button>

        <button
          id="tab-banker"
          onClick={() => setActiveTab('banker')}
          className={`py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center space-x-1 relative ${
            activeTab === 'banker' 
              ? 'bg-white border-2 border-black text-black scale-102 shadow-[1px_2px_0px_0px_rgba(0,0,0,1)]' 
              : 'text-gray-500 hover:text-black hover:bg-gray-50'
          }`}
        >
          <Landmark className="w-3.5 h-3.5 text-rose-500" />
          <span>銀行櫃檯</span>
          {!isBanker && (
            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-gray-400 rounded-full" title="僅限銀行員開啓"></span>
          )}
        </button>
      </div>

      {/* View Details */}

      {/* Tab 1: Player Balance Drawer & Transfer form */}
      {activeTab === 'account' && (
        <div className="space-y-4">
          {/* Card style player panel */}
          <div className={`p-6 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-white relative overflow-hidden bg-gradient-to-br ${me.color}`}>
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-white/5 pointer-events-none" />
            
            {/* Header detail with big token icon */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono font-black tracking-widest bg-white/20 border border-white/20 px-2 py-0.5 rounded-md text-white">
                  {isPlayingBanker(me) ? '房主行長金卡' : '大富翁地產帳戶'}
                </span>
                <h3 className="text-xl font-black block mt-2 text-white drop-shadow-sm">{me.name}</h3>
              </div>
              <div className="w-14 h-14 bg-white/10 border-2 border-white/30 rounded-2xl flex items-center justify-center text-4xl shadow-inner transform rotate-[6deg]">
                {me.avatar}
              </div>
            </div>

            {/* Oversized Balance Display */}
            <div className="mt-8">
              <span className="block text-[10px] font-mono uppercase text-white/70 tracking-widest font-extrabold mb-1">
                目前帳戶餘額 (CURRENT BALANCE)
              </span>
              <div className="text-4xl font-black font-mono tracking-tight text-white drop-shadow-md">
                ${me.balance.toLocaleString()}
              </div>
            </div>

            {/* Status indicator footer */}
            <div className="mt-6 flex justify-between items-center pt-3 border-t border-white/10 text-[10px] font-mono text-white/65">
              <span>DEPOSIT CREDIT STATUS</span>
              <span className="font-bold flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                ACTIVE TRUST
              </span>
            </div>
          </div>

          {/* Peer to Peer Transfer Form */}
          <div className="bg-white border-4 border-black rounded-2xl p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
            <h3 className="text-sm font-black text-black border-b-2 border-dashed border-gray-100 pb-2 mb-3 flex items-center">
              <Send className="w-4 h-4 mr-1 text-[#008F4C]" />
              手機即時互轉帳 (匯款玩家)
            </h3>

            {otherPlayers.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                <p className="text-xs text-gray-400 font-bold">房間中尚無其他玩家</p>
                <p className="text-[9px] text-gray-400 mt-0.5">點擊頂部複製網址分享，等朋友進房！</p>
              </div>
            ) : (
              <form onSubmit={handleTransferSubmit} className="space-y-3.5">
                {/* Payee selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-700">1. 選擇接收大亨</label>
                  <select
                    id="select-payee"
                    required
                    value={payeeId}
                    onChange={(e) => setPayeeId(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-black rounded-xl py-2.5 px-3 font-bold text-xs focus:outline-none focus:bg-white"
                  >
                    <option value="">-- 點擊選擇房內玩家 --</option>
                    {otherPlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatar} {p.name} (帳戶: ${p.balance.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-700">2. 轉出金額</label>
                    <span className="text-[10px] text-gray-400 font-mono">餘額: ${me.balance.toLocaleString()}</span>
                  </div>
                  <div className="relative">
                    <input
                      id="input-transfer-amount"
                      type="number"
                      required
                      min="1"
                      placeholder="請輸入匯出額"
                      value={transferAmountStr}
                      onChange={(e) => setTransferAmountStr(e.target.value)}
                      className="w-full font-mono font-extrabold text-base bg-gray-50 border-2 border-black rounded-xl py-2 px-3 pl-8 focus:outline-none focus:bg-white text-black"
                    />
                    <span className="absolute left-3 top-3 font-mono text-sm font-bold text-gray-400">$</span>
                  </div>

                  {/* Increment Quick buttons */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[500, 1000, 2000, 5000].map((v) => (
                      <button
                        id={`btn-add-shortcut-${v}`}
                        key={v}
                        type="button"
                        onClick={() => addShortcutValue(v)}
                        className="py-1 bg-gray-50 hover:bg-gray-100 border border-gray-300 text-[10px] font-bold rounded-lg text-gray-700 shadow-sm active:translate-y-[0.5px]"
                      >
                        +{v.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  id="btn-transfer-submit"
                  type="submit"
                  className="w-full bg-[#008F4C] text-white font-black text-sm py-3 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center space-x-1.5 cursor-pointer mt-3"
                >
                  <Send className="w-4 h-4" />
                  <span>立刻安全轉出</span>
                </button>
              </form>
            )}
          </div>

          {/* Audit log for Ledger logs */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest px-1">
              最近對帳日誌歷史紀錄
            </h3>
            <TransactionHistory transactions={transactions} currentPlayerId={currentPlayerId} />
          </div>
        </div>
      )}

      {/* Tab 2: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-3">
          <div className="px-1 flex justify-between items-center">
            <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">
              大富翁資產即時排行榜
            </h3>
            <span className="text-[10px] text-[#008F4C] font-black bg-emerald-50 border border-emerald-200 px-1.5 rounded">
              總盤金: ${players.reduce((sum, p) => sum + p.balance, 0).toLocaleString()}
            </span>
          </div>
          <Leaderboard players={players} currentPlayerId={currentPlayerId} />
        </div>
      )}

      {/* Tab 3: Restricted Banker console view */}
      {activeTab === 'banker' && (
        <div>
          {isBanker ? (
            <BankerDashboard
              room={room}
              players={players}
              onBankGive={onBankGive}
              onBankTake={onBankTake}
              onBankSet={onBankSet}
              onResetGame={onResetGame}
            />
          ) : (
            <div className="bg-white border-4 border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] text-center py-10 space-y-3">
              <div className="w-12 h-12 bg-rose-50 border-2 border-rose-200 rounded-full flex items-center justify-center mx-auto">
                <Landmark className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-base font-black text-black">【金庫權限不足】</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                本頁面為遊戲安全「銀行櫃檯」，僅有建立房間的大富翁房主（銀行行長）可以進行給錢、扣錢或變更初始資產。
              </p>
              <div className="pt-2">
                <button
                  id="btn-return-my-account"
                  onClick={() => setActiveTab('account')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 border-2 border-black font-bold text-xs rounded-xl"
                >
                  返回我的大亨帳戶
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function isPlayingBanker(p: Player) {
  return p.isBanker;
}
