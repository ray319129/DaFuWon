/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Player, Room, Transaction, Property } from '../types';
import Leaderboard from './Leaderboard';
import TransactionHistory from './TransactionHistory';
import BankerDashboard from './BankerDashboard';
import WealthTrendChart from './WealthTrendChart';
import { playDebitSound, playCoinSound } from '../utils/audio';
import { calculateRent } from '../utils/monopolyData';
import { 
  Landmark, 
  Send, 
  ArrowDownUp, 
  Trophy, 
  ShieldAlert, 
  LogOut, 
  Building2, 
  TrendingUp, 
  HelpCircle, 
  Coins, 
  Check, 
  ChevronRight, 
  ArrowRight,
  Shield,
  Briefcase
} from 'lucide-react';

interface GameViewProps {
  room: Room;
  players: Player[];
  transactions: Transaction[];
  properties: Property[];
  currentPlayerId: string;
  onTransfer: (toPlayerId: string, amount: number) => void;
  // Banker pass-throughs
  onBankGive: (playerIdTo: string, amount: number) => void;
  onBankTake: (playerIdFrom: string, amount: number) => void;
  onBankSet: (playerId: string, exactAmount: number) => void;
  onResetGame: () => void;
  onLeaveRoom: () => void;
  isFirebaseReady: boolean;
  // Real Estate
  onBuyProperty: (propertyId: string) => void;
  onUpgradeProperty: (propertyId: string) => void;
  onMortgageProperty: (propertyId: string) => void;
  onUnmortgageProperty: (propertyId: string) => void;
  onPayRent: (propertyId: string) => void;
  onTransferDeed: (propertyId: string, toPlayerId: string) => void;
}

export default function GameView({
  room,
  players,
  transactions,
  properties,
  currentPlayerId,
  onTransfer,
  onBankGive,
  onBankTake,
  onBankSet,
  onResetGame,
  onLeaveRoom,
  isFirebaseReady,
  onBuyProperty,
  onUpgradeProperty,
  onMortgageProperty,
  onUnmortgageProperty,
  onPayRent,
  onTransferDeed
}: GameViewProps) {
  const [activeTab, setActiveTab] = useState<'account' | 'properties' | 'trends' | 'leaderboard' | 'banker'>('account');
  
  // Real Estate state filters
  const [propFilter, setPropFilter] = useState<'all' | 'mine' | 'others' | 'unowned'>('all');
  const [transferTargetId, setTransferTargetId] = useState<{ [propId: string]: string }>({});

  // Transfer form state
  const [payeeId, setPayeeId] = useState('');
  const [transferAmountStr, setTransferAmountStr] = useState('');

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

  // Calculators for Wealth Dashboard Net Worth metrics
  const getPlayerPropertiesValue = (pId: string) => {
    return properties
      .filter(p => p.ownerId === pId)
      .reduce((sum, p) => {
        let val = p.price;
        if (p.isMortgaged) {
          val = Math.floor(p.price / 2); // Mortgaged value is half
        } else {
          val += (p.houses || 0) * p.houseCost; // add built houses value
        }
        return sum + val;
      }, 0);
  };

  const myPropsValue = getPlayerPropertiesValue(me.id);
  const myNetWorth = me.balance + myPropsValue;

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

  // Filter properties base list
  const filteredProperties = properties.filter(p => {
    if (propFilter === 'mine') return p.ownerId === currentPlayerId;
    if (propFilter === 'others') return p.ownerId !== null && p.ownerId !== currentPlayerId;
    if (propFilter === 'unowned') return p.ownerId === null;
    return true; // all
  });

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
          className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
          title="退出登出"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs navigation bar (Compact 5 column neubrutalist style grid) */}
      <div className="grid grid-cols-5 gap-0.5 bg-gray-150 border-2 border-black p-0.5 rounded-xl shadow-[1px_2.5px_0px_0px_#000]">
        {[
          { id: 'account', label: '金庫', icon: ArrowDownUp },
          { id: 'properties', label: '地產', icon: Building2 },
          { id: 'trends', label: '趨勢', icon: TrendingUp },
          { id: 'leaderboard', label: '排行', icon: Trophy },
          { id: 'banker', label: '金庫櫃', icon: Landmark, isBankerIndicator: true }
        ].map(tab => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-1.5 px-0.5 text-[10px] sm:text-xs font-black rounded-lg transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                isActive 
                  ? 'bg-white border-2 border-black text-black scale-102 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                  : 'text-gray-500 hover:text-black hover:bg-gray-100'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5 mb-0.5" />
              <span>{tab.label}</span>
              {tab.isBankerIndicator && !isBanker && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-gray-400 rounded-full" title="僅限行長"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Account Ledger & Transfer page */}
      {activeTab === 'account' && (
        <div className="space-y-4">
          {/* Card style player panel with Net Worth enhancements */}
          <div className={`p-5 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-white relative overflow-hidden bg-gradient-to-br ${me.color}`}>
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-white/5 pointer-events-none" />
            
            {/* Header detail with big token icon */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono font-black tracking-widest bg-white/20 border border-white/20 px-2 py-0.5 rounded-md text-white">
                  {isPlayingBanker(me) ? '房主行長金卡' : '大富翁置產帳戶'}
                </span>
                <h3 className="text-xl font-black block mt-2 text-white drop-shadow-sm">{me.name}</h3>
              </div>
              <div className="w-14 h-14 bg-white/10 border-2 border-white/30 rounded-2xl flex items-center justify-center text-4xl shadow-inner transform rotate-[6deg]">
                {me.avatar}
              </div>
            </div>

            {/* Cash & Assets breakdown */}
            <div className="mt-6 grid grid-cols-2 gap-2 border-b border-white/10 pb-4">
              <div>
                <span className="block text-[8px] font-mono text-white/70 tracking-widest uppercase font-extrabold">
                  現金餘額/CASH
                </span>
                <div className="text-2xl font-black font-mono tracking-tight text-white">
                  ${me.balance.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="block text-[8px] font-mono text-white/70 tracking-widest uppercase font-extrabold">
                  不動產估值/PROPERTIES
                </span>
                <div className="text-2xl font-black font-mono tracking-tight text-white/90">
                  ${myPropsValue.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Total Net Worth display */}
            <div className="mt-4 flex justify-between items-end">
              <div>
                <span className="block text-[9px] font-mono text-white/60 tracking-wider">
                  總淨資產 (TOTAL NET WORTH)
                </span>
                <div className="text-3xl font-black font-mono text-amber-300 drop-shadow-md">
                  ${myNetWorth.toLocaleString()}
                </div>
              </div>
              <span className="text-[9px] font-mono text-white/75 bg-black/15 border border-white/15 px-2 py-1 rounded flex items-center">
                <Briefcase className="w-3.5 h-3.5 mr-1" />
                第 {players.filter(p => p.balance + getPlayerPropertiesValue(p.id) > myNetWorth).length + 1} 名
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
                <p className="text-[9px] text-gray-400 mt-0.5 font-bold">點擊大廳頁網址分享，等朋友進房！</p>
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
                        {p.avatar} {p.name} (資產: ${(p.balance + getPlayerPropertiesValue(p.id)).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-700">2. 轉出金額</label>
                    <span className="text-[10px] text-gray-400 font-mono">現金: ${me.balance.toLocaleString()}</span>
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
                        className="py-1 bg-gray-50 hover:bg-gray-100 border border-gray-300 text-[10px] font-bold rounded-lg text-gray-700 shadow-sm cursor-pointer"
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

      {/* Tab 2: Properties Booking System */}
      {activeTab === 'properties' && (
        <div className="space-y-4">
          {/* Quick Real estate valuation stats helper panel */}
          <div className="bg-white border-4 border-black p-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] grid grid-cols-3 gap-1 divide-x-2 divide-neutral-100">
            <div className="text-center">
              <span className="block text-[8px] font-bold text-neutral-400 font-mono tracking-wider">房地登記份數</span>
              <span className="text-lg font-black text-black">
                {properties.filter(p => p.ownerId === me.id).length} <span className="text-[10px] text-gray-500">契</span>
              </span>
            </div>
            <div className="text-center pl-1">
              <span className="block text-[8px] font-bold text-neutral-400 font-mono tracking-wider">置產總估值</span>
              <span className="text-lg font-black text-emerald-600 font-mono">
                ${myPropsValue.toLocaleString()}
              </span>
            </div>
            <div className="text-center pl-1">
              <span className="block text-[8px] font-bold text-neutral-400 font-mono tracking-wider">抵押產權數</span>
              <span className="text-lg font-black text-rose-500">
                {properties.filter(p => p.ownerId === me.id && p.isMortgaged).length} <span className="text-[10px] text-gray-500">契</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
              地產契約登錄簿
            </h3>
            {/* Properties categorization filters */}
            <div className="flex bg-neutral-100 border-2 border-black p-0.5 rounded-lg space-x-0.5 text-[10px] font-bold text-gray-600 shadow-sm">
              {[
                { id: 'all', n: '所有' },
                { id: 'mine', n: '我的' },
                { id: 'others', n: '他人' },
                { id: 'unowned', n: '待售' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setPropFilter(f.id as any)}
                  className={`px-1.5 py-0.5 rounded-md cursor-pointer transition text-[9px] ${
                    propFilter === f.id ? 'bg-black text-white font-black' : 'hover:bg-neutral-200'
                  }`}
                >
                  {f.n}
                </button>
              ))}
            </div>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-300 py-10 rounded-xl text-center space-y-2">
              <Building2 className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="text-xs text-neutral-400 font-bold">目前無符合此分類的地產契約</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProperties.map(p => {
                const isMine = p.ownerId === currentPlayerId;
                const owner = players.find(x => x.id === p.ownerId);
                const rentVal = calculateRent(p, properties);

                return (
                  <div 
                    key={p.id}
                    className="bg-white border-4 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col relative"
                  >
                    {/* Monopoly classical border style header district color */}
                    <div className={`bg-gradient-to-r ${p.groupColor} h-4.5 border-b-2 border-black w-full`} />
                    
                    <div className="p-4 space-y-3 flex-grow">
                      {/* Title block */}
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-mono tracking-widest text-neutral-400 font-black uppercase">
                            {p.group === 'railroad' ? '🚂 火車鐵路運輸' : p.group === 'utility' ? '⚡ 市政公共事業' : '🏘️ 高級特許地段'}
                          </span>
                          <h4 className="text-sm font-black text-black">{p.name}</h4>
                        </div>
                        <div className="text-right">
                          <span className="block text-[8px] font-mono text-neutral-400 font-bold">地價 / VALUE</span>
                          <span className="text-sm font-mono font-black text-black">${p.price.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Info and current buildings indicators */}
                      <div className="grid grid-cols-2 gap-1 py-2 border-y border-dashed border-neutral-100 text-[10px]">
                        <div>
                          <span className="block text-[8px] text-neutral-400 font-bold">物主登記</span>
                          <span className="font-extrabold flex items-center mt-0.5">
                            {p.ownerId === null ? (
                              <span className="text-zinc-400">🏦 銀行保留</span>
                            ) : (
                              <span className="text-black flex items-center space-x-1">
                                <span>{owner?.avatar || '👤'}</span>
                                <span className="truncate max-w-[80px]">{owner?.name || '未知大亨'}</span>
                              </span>
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[8px] text-neutral-400 font-bold">當前過路費 (RENT)</span>
                          <span className={`font-mono font-extrabold flex items-center mt-0.5 ${p.isMortgaged ? 'text-rose-500' : 'text-neutral-800'}`}>
                            {p.isMortgaged ? (
                              '⚠️ 抵押中免租'
                            ) : (
                              <span className="text-xs text-green-700">${rentVal.toLocaleString()}</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Display build level dots for streets */}
                      {p.group !== 'railroad' && p.group !== 'utility' && !p.isMortgaged && p.ownerId !== null && (
                        <div className="bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                          <div className="flex justify-between items-center text-[8px] font-bold text-neutral-400 uppercase mb-1">
                            <span>當前建設等級 / BUILD LEVEL</span>
                            <span className="text-black">{p.houses === 5 ? '🏩 豪華五星大飯店' : `🏡 增建別墅棟數: ${p.houses}`}</span>
                          </div>
                          
                          <div className="flex space-x-1.5 pt-0.5 justify-center">
                            {[1, 2, 3, 4, 5].map((level) => {
                              const isActive = p.houses >= level;
                              const isHotel = level === 5;
                              return (
                                <div
                                  key={level}
                                  className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center text-xs shadow-sm ${
                                    isActive
                                      ? isHotel
                                        ? 'bg-rose-500 border-black text-white'
                                        : 'bg-emerald-100 border-black text-black'
                                      : 'bg-white border-neutral-200 text-neutral-200'
                                  }`}
                                  title={isHotel ? '別墅五等級: 五星級豪華飯店' : `別墅等級 ${level}`}
                                >
                                  {isHotel ? '🏨' : '🏠'}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Dynamic Action Buttons depending on ownership */}
                      <div className="pt-2 flex flex-wrap gap-1.5">
                        {/* Option 1: Unowned street -> Buy from Banker */}
                        {p.ownerId === null && (
                          <button
                            onClick={() => onBuyProperty(p.id)}
                            className="flex-1 bg-amber-400 text-black font-black text-xs py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>置產購買契約 (-${p.price.toLocaleString()})</span>
                          </button>
                        )}

                        {/* Option 2: Owned by me -> Build development / Mortgage pawn / Transfer deed */}
                        {isMine && (
                          <div className="w-full space-y-2">
                            <div className="grid grid-cols-2 gap-1.5">
                              {/* Build houses upgrade (only for non railroad/utility) */}
                              {p.group !== 'railroad' && p.group !== 'utility' && !p.isMortgaged && (
                                <button
                                  disabled={p.houses >= 5}
                                  onClick={() => onUpgradeProperty(p.id)}
                                  className={`py-2 text-xs font-black rounded-xl border-2 border-black flex items-center justify-center space-x-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] cursor-pointer ${
                                    p.houses >= 5 
                                      ? 'bg-zinc-100 border-zinc-200 text-zinc-400 shadow-none' 
                                      : 'bg-sky-400 hover:bg-sky-300 text-black'
                                  }`}
                                >
                                  <span>🏡 增蓋別墅 (-${p.houseCost})</span>
                                </button>
                              )}

                              {/* Mortgage / Unmortgage */}
                              {p.isMortgaged ? (
                                <button
                                  onClick={() => onUnmortgageProperty(p.id)}
                                  className="col-span-2 py-2 text-xs font-black bg-emerald-400 hover:bg-emerald-300 text-black rounded-xl border-2 border-black flex items-center justify-center space-x-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] cursor-pointer"
                                >
                                  <span>🔓 繳息贖回產權 (-${Math.floor(p.price / 2 * 1.1).toLocaleString()})</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => onMortgageProperty(p.id)}
                                  className={`py-2 text-xs font-black bg-rose-400 hover:bg-rose-300 text-black rounded-xl border-2 border-black flex items-center justify-center space-x-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] cursor-pointer ${
                                    p.group !== 'railroad' && p.group !== 'utility' && p.houses > 0 ? 'col-span-2' : ''
                                  }`}
                                >
                                  <span>🏦 辦理抵押 (+${Math.floor(p.price / 2).toLocaleString()})</span>
                                </button>
                              )}
                            </div>

                            {/* Safe Contract Trade Deed Transfer option */}
                            {otherPlayers.length > 0 && (
                              <div className="bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 flex items-center justify-between space-x-2">
                                <span className="text-[10px] text-gray-500 font-bold shrink-0">產權轉讓：</span>
                                <div className="flex-grow flex space-x-1">
                                  <select
                                    value={transferTargetId[p.id] || ''}
                                    onChange={(e) => setTransferTargetId({ ...transferTargetId, [p.id]: e.target.value })}
                                    className="bg-white border border-gray-300 rounded p-1 text-[10px] font-bold flex-grow"
                                  >
                                    <option value="">-- 選擇轉讓對象 --</option>
                                    {otherPlayers.map(p => (
                                      <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    disabled={!transferTargetId[p.id]}
                                    onClick={() => {
                                      const pId = transferTargetId[p.id];
                                      if (pId) {
                                        onTransferDeed(p.id, pId);
                                        // clear
                                        setTransferTargetId({ ...transferTargetId, [p.id]: '' });
                                      }
                                    }}
                                    className={`p-1 px-2.5 text-[10px] border border-black rounded font-black shadow-sm flex items-center justify-center cursor-pointer ${
                                      transferTargetId[p.id]
                                        ? 'bg-amber-100 text-black hover:bg-amber-200 active:translate-y-[0.5px]'
                                        : 'bg-gray-100 text-gray-300 pointer-events-none'
                                    }`}
                                  >
                                    過戶
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Option 3: Owned by another player -> Pay land rent overpass fee */}
                        {p.ownerId !== null && !isMine && !p.isMortgaged && (
                          <button
                            onClick={() => onPayRent(p.id)}
                            className="flex-1 bg-rose-500 text-white font-black text-xs py-2.5 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-[1px] transition-all flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>支付過路費額 (-${rentVal.toLocaleString()} ➡️ {owner?.name})</span>
                          </button>
                        )}
                        
                        {/* Mention if mortgaged */}
                        {p.ownerId !== null && !isMine && p.isMortgaged && (
                          <div className="flex-1 py-2 bg-neutral-100 border-2 border-neutral-300 border-dashed rounded-xl text-center text-[10px] text-neutral-400 font-bold">
                            🏦 該產權目前正處於「抵押中」，法規免繳過路費
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Wealth Trend Curves Chart */}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          <WealthTrendChart 
            room={room}
            players={players}
            transactions={transactions}
          />
        </div>
      )}

      {/* Tab 4: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-3">
          <div className="px-1 flex justify-between items-center">
            <h3 className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">
              大富翁淨資產即時排行榜
            </h3>
            <span className="text-[10px] text-[#008F4C] font-black bg-emerald-50 border border-emerald-200 px-1.5 rounded">
              總盤金: ${players.reduce((sum, p) => sum + p.balance, 0).toLocaleString()}
            </span>
          </div>
          <Leaderboard players={players} currentPlayerId={currentPlayerId} />
        </div>
      )}

      {/* Tab 5: Restricted Banker console view */}
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
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 border-2 border-black font-bold text-xs rounded-xl cursor-pointer"
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
