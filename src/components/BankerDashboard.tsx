/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, Room } from '../types';
import { playCoinSound, playDebitSound, playUpgradeSound } from '../utils/audio';
import { ShieldCheck, UserMinus, Plus, Minus, RefreshCw, X, CircleAlert, Landmark } from 'lucide-react';

interface BankerDashboardProps {
  room: Room;
  players: Player[];
  onBankGive: (playerIdTo: string, amount: number) => void;
  onBankTake: (playerIdFrom: string, amount: number) => void;
  onBankSet: (playerId: string, exactAmount: number) => void;
  onResetGame: () => void;
}

export default function BankerDashboard({
  room,
  players,
  onBankGive,
  onBankTake,
  onBankSet,
  onResetGame
}: BankerDashboardProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [amountStr, setAmountStr] = useState('');
  const [actionType, setActionType] = useState<'give' | 'take' | 'set'>('give');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setAmountStr('');
    } else if (val === '00') {
      if (amountStr) setAmountStr(amountStr + '00');
    } else {
      setAmountStr(amountStr + val);
    }
  };

  const applyShortcut = (shortcutVal: number) => {
    setAmountStr(String(shortcutVal));
    if (shortcutVal === 2000) {
      setActionType('give'); // Standard GO Pass
    }
  };

  const handleConfirm = () => {
    if (!selectedPlayer) return;
    const amountVal = Number(amountStr);
    
    if (actionType !== 'set' && (isNaN(amountVal) || amountVal <= 0)) {
      alert("請輸入有效的交易金額！");
      return;
    }

    if (actionType === 'give') {
      onBankGive(selectedPlayer.id, amountVal);
      playCoinSound();
    } else if (actionType === 'take') {
      onBankTake(selectedPlayer.id, amountVal);
      playDebitSound();
    } else if (actionType === 'set') {
      onBankSet(selectedPlayer.id, amountVal);
      playUpgradeSound();
    }

    // Reset controls
    setAmountStr('');
    setSelectedPlayer(null);
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    onResetGame();
    playUpgradeSound();
    setShowResetConfirm(false);
  };

  return (
    <div className="space-y-6">
      {/* Active banker header */}
      <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4 flex items-center space-x-3 shadow-[2px_2px_0px_0px_#000]">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center border border-rose-300">
          <ShieldCheck className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-extrabold text-rose-700 uppercase tracking-widest block bg-rose-100 px-1.5 py-0.2 rounded w-fit">
            電子銀行首長控制台
          </span>
          <span className="text-xs text-rose-950 font-bold block mt-0.5">
            您可以在此為個別大亨調整金額，或隨時執行金庫重設。
          </span>
        </div>
      </div>

      {/* Grid of players */}
      <div className="space-y-2">
        <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest px-1">
          第一步：點擊選擇服務對象
        </h3>
        
        <div className="grid grid-cols-2 gap-2">
          {players.map((plr) => {
            const isSelected = selectedPlayer?.id === plr.id;
            return (
              <button
                id={`btn-banker-target-${plr.name}`}
                key={plr.id}
                type="button"
                onClick={() => {
                  setSelectedPlayer(plr);
                  setAmountStr('');
                  setActionType('give');
                }}
                className={`text-left p-3 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between transition-all bg-white relative ${
                  isSelected ? 'bg-amber-50 ring-2 ring-rose-500 translate-y-[2px] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'hover:translate-y-[-1px]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded bg-gradient-to-br ${plr.color} border-2 border-black flex items-center justify-center text-lg`}>
                    {plr.avatar}
                  </div>
                  <span className="font-black text-xs text-black block truncate">
                    {plr.name}
                  </span>
                </div>

                <div className="mt-3 w-full flex items-end justify-between">
                  <span className="text-[9px] text-gray-400 font-mono">
                    {plr.isBanker ? '【銀行行員】' : '【參賽者】'}
                  </span>
                  <span className="font-extrabold font-mono text-xs text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                    ${plr.balance.toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Teller Service Calculator Panel */}
      {selectedPlayer ? (
        <div id="banker-keypad-panel" className="bg-white border-4 border-black p-5 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <div className="flex justify-between items-center pb-2 border-b-2 border-dashed border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{selectedPlayer.avatar}</span>
              <span className="font-black text-sm text-black">對 {selectedPlayer.name} 執行記帳</span>
            </div>
            <button
              id="btn-cancel-keypad"
              type="button"
              onClick={() => setSelectedPlayer(null)}
              className="text-gray-400 hover:text-black hover:bg-gray-100 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action types selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              id="btn-act-give"
              type="button"
              onClick={() => setActionType('give')}
              className={`py-2 px-3 border-2 border-black rounded-lg text-xs font-black transition-colors ${
                actionType === 'give' ? 'bg-[#008F4C] text-white' : 'bg-gray-50 hover:bg-gray-150'
              }`}
            >
              給錢 (+)
            </button>
            <button
              id="btn-act-take"
              type="button"
              onClick={() => setActionType('take')}
              className={`py-2 px-3 border-2 border-black rounded-lg text-xs font-black transition-colors ${
                actionType === 'take' ? 'bg-[#E52521] text-white' : 'bg-gray-50 hover:bg-gray-150'
              }`}
            >
              扣錢 (-)
            </button>
            <button
              id="btn-act-set"
              type="button"
              onClick={() => setActionType('set')}
              className={`py-2 px-3 border-2 border-black rounded-lg text-xs font-black transition-colors ${
                actionType === 'set' ? 'bg-amber-500 text-white' : 'bg-gray-50 hover:bg-gray-150'
              }`}
            >
              自訂金額 (=)
            </button>
          </div>

          {/* Display Amount Box */}
          <div className="bg-gray-100 border-2 border-black p-3 rounded-xl flex items-center justify-between font-mono text-center relative overflow-hidden">
            <span className="text-gray-400 font-bold font-sans text-xs shrink-0 bg-white/80 border border-gray-200 px-1.5 py-0.5 rounded">
              {actionType === 'give' ? '金庫發放' : actionType === 'take' ? '金庫扣除' : '設定為'}
            </span>
            <span className="text-2xl font-black tracking-wide text-black ml-2 block truncate">
              {actionType === 'give' ? '+' : actionType === 'take' ? '-' : ''}
              ${(Number(amountStr) || 0).toLocaleString()}
            </span>
          </div>

          {/* Preset Shortcuts Grid */}
          <div className="space-y-1">
            <span className="text-[10px] text-gray-400 font-mono font-bold block">大富翁精選快捷額</span>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                id="btn-sc-go"
                type="button"
                onClick={() => applyShortcut(2000)}
                className="py-1.5 bg-yellow-50 hover:bg-yellow-100 ring-1 ring-yellow-400 rounded-lg text-[10px] font-black text-yellow-800"
              >
                +2000 起點
              </button>
              <button
                id="btn-sc-500"
                type="button"
                onClick={() => applyShortcut(500)}
                className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg text-[10px] font-black"
              >
                500 有獎
              </button>
              <button
                id="btn-sc-1000"
                type="button"
                onClick={() => applyShortcut(1000)}
                className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg text-[10px] font-black"
              >
                1000 租金
              </button>
              <button
                id="btn-sc-5000"
                type="button"
                onClick={() => applyShortcut(5000)}
                className="py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg text-[10px] font-black"
              >
                5000 急需
              </button>
            </div>
          </div>

          {/* Calculator Visual Keypad */}
          <div className="grid grid-cols-3 gap-1.5 font-mono">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', 'C'].map((char) => (
              <button
                id={`btn-kp-${char}`}
                key={char}
                type="button"
                onClick={() => handleKeypadPress(char)}
                className={`py-2 text-sm font-extrabold rounded-lg border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all ${
                  char === 'C' ? 'bg-orange-100 hover:bg-orange-200 text-orange-800' : 'bg-gray-50 hover:bg-gray-100 text-black'
                }`}
              >
                {char}
              </button>
            ))}
          </div>

          {/* Confirm Button */}
          <button
            id="btn-confirm-transaction"
            type="button"
            onClick={handleConfirm}
            className={`w-full font-black text-base py-3 rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1.5px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all ${
              actionType === 'give' ? 'bg-[#008F4C] text-white' : actionType === 'take' ? 'bg-[#E52521] text-white' : 'bg-amber-500 text-white'
            }`}
          >
            記帳寫入 ➔ 立即同步
          </button>
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 text-gray-500 text-xs">
          <Landmark className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="font-bold">尚未選擇服務對象</p>
          <p className="text-[10px] text-gray-400 mt-0.5">點擊上方大亨卡，即可開取金庫會計調整控制台</p>
        </div>
      )}

      {/* Admin Reset Box */}
      <div className="pt-4 border-t border-gray-200 space-y-3">
        <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest px-1">
          系統危險管制區
        </h4>

        {showResetConfirm ? (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 space-y-3">
            <div className="flex items-start space-x-2">
              <CircleAlert className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-extrabold text-orange-950 block">確定重設大富翁遊戲？</span>
                <span className="text-[10px] text-orange-850 block mt-0.5 leading-relaxed">
                  這將把所有玩家餘額恢復為最初始資金 (${room.initialBalance.toLocaleString()})，並永久清除所有的交易對帳 ledger，這是一項無法復原的操作。
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                id="btn-reset-confirm"
                type="button"
                onClick={confirmReset}
                className="bg-orange-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-orange-700 active:scale-95 transition-all shadow-[1px_1px_0px_0px_#000]"
              >
                是，確定重設！
              </button>
              <button
                id="btn-reset-cancel"
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            id="btn-lobby-reset-trigger"
            type="button"
            onClick={handleResetClick}
            className="w-full bg-white hover:bg-amber-50 text-amber-800 font-extrabold text-xs py-3.5 px-4 rounded-xl border-2 border-dashed border-amber-300 flex items-center justify-center space-x-2 transition-all active:translate-y-[1px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>重設大金庫 (重回初始預算並清除記錄)</span>
          </button>
        )}
      </div>
    </div>
  );
}
