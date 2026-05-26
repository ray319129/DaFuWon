/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Transaction } from '../types';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, Landmark } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: Transaction[];
  currentPlayerId: string;
}

export default function TransactionHistory({ transactions, currentPlayerId }: TransactionHistoryProps) {
  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 10000) return '剛剛';
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds} 秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    return `${hours} 小時前`;
  };

  const getTransactionVisuals = (tx: Transaction) => {
    const isMeSender = tx.fromId === currentPlayerId;
    const isMeReceiver = tx.toId === currentPlayerId;

    if (tx.type === 'reset') {
      return {
        icon: <Landmark className="w-4 h-4 text-amber-600" />,
        bgColor: 'bg-amber-50 border-amber-300 text-amber-900',
        text: '重設遊戲餘額',
        amountText: `重新設定`,
        isNeutral: true
      };
    }

    if (tx.type === 'bank_give') {
      if (isMeReceiver) {
        return {
          icon: <ArrowDownLeft className="w-4 h-4 text-emerald-600" />,
          bgColor: 'bg-emerald-50 border-emerald-300 text-emerald-900',
          text: `銀行 給您`,
          amountText: `+$${tx.amount.toLocaleString()}`,
          isPositive: true
        };
      }
      return {
        icon: <Landmark className="w-4 h-4 text-gray-500" />,
        bgColor: 'bg-gray-50 border-gray-200 text-gray-700',
        text: `銀行給 ${tx.toName}`,
        amountText: `+$${tx.amount.toLocaleString()}`,
        isNeutral: true
      };
    }

    if (tx.type === 'bank_take') {
      if (isMeSender) {
        return {
          icon: <ArrowUpRight className="w-4 h-4 text-rose-600" />,
          bgColor: 'bg-rose-50 border-rose-300 text-rose-900',
          text: `銀行 扣除您`,
          amountText: `-$${tx.amount.toLocaleString()}`,
          isNegative: true
        };
      }
      return {
        icon: <Landmark className="w-4 h-4 text-gray-500" />,
        bgColor: 'bg-gray-50 border-gray-200 text-gray-700',
        text: `銀行收取 ${tx.fromName}`,
        amountText: `-$${tx.amount.toLocaleString()}`,
        isNeutral: true
      };
    }

    // Standard transfer
    if (isMeSender) {
      return {
        icon: <ArrowUpRight className="w-4 h-4 text-red-600" />,
        bgColor: 'bg-rose-50 border-rose-200 text-rose-900',
        text: `給 ${tx.toName}`,
        amountText: `-$${tx.amount.toLocaleString()}`,
        isNegative: true
      };
    }

    if (isMeReceiver) {
      return {
        icon: <ArrowDownLeft className="w-4 h-4 text-emerald-600" />,
        bgColor: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        text: `收到 ${tx.fromName}`,
        amountText: `+$${tx.amount.toLocaleString()}`,
        isPositive: true
      };
    }

    // Third-party transfer
    return {
      icon: <ArrowRight className="w-3.5 h-3.5 text-gray-400" />,
      bgColor: 'bg-gray-50 border-gray-200 text-gray-600',
      text: `${tx.fromName} ➔ ${tx.toName}`,
      amountText: `$${tx.amount.toLocaleString()}`,
      isNeutral: true
    };
  };

  // Sort logs by timestamp descending
  const sortedTx = [...transactions].sort((a, b) => b.timestamp - a.timestamp);

  if (sortedTx.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
        <Landmark className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-xs text-gray-400 font-bold">目前尚無任何交易紀錄</p>
        <p className="text-[10px] text-gray-400 mt-0.5">匯款、轉帳、或銀行收支均會記錄於此</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
      {sortedTx.slice(0, 40).map((tx) => {
        const style = getTransactionVisuals(tx);
        return (
          <div
            key={tx.id}
            className={`flex items-center justify-between p-2.5 rounded-xl border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${style.bgColor} text-xs`}
          >
            <div className="flex items-center space-x-2 truncate">
              <div className="p-1 bg-white border border-black rounded-lg">
                {style.icon}
              </div>
              <div className="truncate">
                <span className="font-extrabold">{style.text}</span>
                <span className="block text-[8px] text-gray-500 font-mono font-bold mt-0.5">
                  {getRelativeTime(tx.timestamp)}
                </span>
              </div>
            </div>

            <div className="font-mono font-extrabold text-right ml-2 shrink-0">
              <span className={style.isPositive ? 'text-[#008F4C]' : style.isNegative ? 'text-rose-600' : 'text-gray-700'}>
                {style.amountText}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
