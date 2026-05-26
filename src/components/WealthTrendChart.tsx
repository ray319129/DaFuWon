/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Player, Room, Transaction } from '../types';
import { TrendingUp, Clock, UserCheck } from 'lucide-react';

interface WealthTrendChartProps {
  room: Room;
  players: Player[];
  transactions: Transaction[];
}

interface DataPoint {
  timestamp: number;
  timeLabel: string;
  balances: { [playerId: string]: number };
}

export default function WealthTrendChart({ room, players, transactions }: WealthTrendChartProps) {
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // 1. Reconstruct wealth history chronologically
  const chartData = useMemo(() => {
    // Collect all players (even offline ones)
    const playerIds = players.map(p => p.id);
    
    // Sort transactions from oldest to newest (ascending)
    const sortedTxs = [...transactions].reverse();
    
    // Init state tracking balances
    const currentBalances: { [id: string]: number } = {};
    players.forEach(p => {
      currentBalances[p.id] = room.initialBalance;
    });

    const points: DataPoint[] = [];

    // Add starting point
    points.push({
      timestamp: room.createdAt,
      timeLabel: '開局',
      balances: { ...currentBalances }
    });

    // Run transactions chronological walk
    sortedTxs.forEach((tx, idx) => {
      if (tx.type === 'reset') {
        // Reset wipes balances back to initial target
        const amount = tx.amount || room.initialBalance;
        playerIds.forEach(id => {
          currentBalances[id] = amount;
        });
      } else {
        // P2P or Bank transaction
        if (tx.fromId && tx.fromId !== 'bank' && currentBalances[tx.fromId] !== undefined) {
          currentBalances[tx.fromId] -= tx.amount;
        }
        if (tx.toId && tx.toId !== 'bank' && tx.toId !== 'all' && currentBalances[tx.toId] !== undefined) {
          currentBalances[tx.toId] += tx.amount;
        }
      }

      points.push({
        timestamp: tx.timestamp || Date.now(),
        timeLabel: new Date(tx.timestamp || Date.now()).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
        balances: { ...currentBalances }
      });
    });

    // Return list of history points
    return points;
  }, [room, players, transactions]);

  // Helper to map player color style class to SVG stroke hex color
  const getStrokeHex = (colorClass: string): string => {
    // Resolve standard app custom colors
    if (colorClass.includes('from-rose-500') || colorClass.includes('bg-rose-500') || colorClass.includes('rose')) return '#F43F5E';
    if (colorClass.includes('from-sky-500') || colorClass.includes('bg-sky-500') || colorClass.includes('sky')) return '#0EA5E9';
    if (colorClass.includes('from-emerald-500') || colorClass.includes('bg-[#008F4C]') || colorClass.includes('emerald') || colorClass.includes('green')) return '#10B981';
    if (colorClass.includes('from-amber-500') || colorClass.includes('bg-[#D97706]') || colorClass.includes('amber') || colorClass.includes('yellow')) return '#F59E0B';
    if (colorClass.includes('from-indigo-500') || colorClass.includes('bg-indigo-500') || colorClass.includes('indigo')) return '#6366F1';
    if (colorClass.includes('from-orange-500') || colorClass.includes('bg-orange-500') || colorClass.includes('orange')) return '#F97316';
    if (colorClass.includes('from-violet-500') || colorClass.includes('violet')) return '#8B5CF6';
    if (colorClass.includes('from-fuchsia-500') || colorClass.includes('fuchsia')) return '#D946EF';
    
    return '#4B5563'; // fallback dark zinc
  };

  // 2. Plot configuration dimensions
  const width = 500;
  const height = 260;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Determine Min and Max balance values to scale SVG coordinate projection range
  const { minVal, maxVal } = useMemo(() => {
    let min = 0;
    let max = room.initialBalance;

    chartData.forEach(p => {
      Object.values(p.balances).forEach(val => {
        const numVal = Number(val);
        if (!isNaN(numVal)) {
          if (numVal < min) min = numVal;
          if (numVal > max) max = numVal;
        }
      });
    });

    // Provide buffer paddings
    const range = max - min;
    const padding = range === 0 ? 500 : range * 0.15;
    return {
      minVal: min - padding,
      maxVal: max + padding
    };
  }, [chartData, room]);

  // Convert (index, value) to SVG exact Cartesian coordinate systems
  const getX = (idx: number) => {
    if (chartData.length <= 1) return paddingLeft;
    return paddingLeft + (idx / (chartData.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    if (maxVal === minVal) return paddingTop + chartHeight / 2;
    // Invert because SVG y-0 coordinates start from top down
    return paddingTop + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
  };

  // Generate vertical split division lines
  const gridLinesY = useMemo(() => {
    const list: number[] = [];
    // 4 lines
    for (let i = 0; i <= 4; i++) {
      const val = minVal + (i / 4) * (maxVal - minVal);
      list.push(val);
    }
    return list;
  }, [minVal, maxVal]);

  return (
    <div className="bg-white border-4 border-black rounded-2xl p-4 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] space-y-4">
      {/* Title block */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <h3 className="text-sm font-black text-black flex items-center">
          <TrendingUp className="w-4 h-4 mr-1 text-[#008F4C]" />
          大富翁財富趨勢曲線圖 (Cash Trends)
        </h3>
        <span className="text-[10px] bg-gray-100 px-2 py-0.5 border border-black font-bold text-gray-600 rounded">
          時點記錄: {chartData.length}
        </span>
      </div>

      {chartData.length <= 1 ? (
        <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2 animate-pulse" />
          <p className="text-xs text-gray-500 font-bold">尚待進行交易，曲線圖將隨著金庫互轉或提款逐漸成型！</p>
          <p className="text-[9px] text-gray-400 mt-1">進行至少一次手機轉帳或銀行收付，隨即繪製資產曲線。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* SVG Frame holding full width */}
          <div className="relative w-full overflow-x-auto select-none touch-pan-y">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto font-mono text-[9px] font-bold text-gray-400 min-w-[320px]"
            >
              {/* Background horizontal grid gridlines */}
              {gridLinesY.map((level, i) => (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={getY(level)}
                    x2={width - paddingRight}
                    y2={getY(level)}
                    stroke="#E5E7EB"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={getY(level) + 3}
                    textAnchor="end"
                    fill="#9CA3AF"
                    className="font-mono"
                  >
                    ${Math.round(level).toLocaleString()}
                  </text>
                </g>
              ))}

              {/* Vertical guideline for active hover index */}
              {hoveredPointIdx !== null && (
                <line
                  x1={getX(hoveredPointIdx)}
                  y1={paddingTop}
                  x2={getX(hoveredPointIdx)}
                  y2={height - paddingBottom}
                  stroke="#111827"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              )}

              {/* Draw Plot Lines for each player */}
              {players.map((p) => {
                const hexColor = getStrokeHex(p.color);
                
                // Generate path string
                const pointsStr = chartData
                  .map((point, idx) => {
                    const bal = point.balances[p.id] !== undefined ? point.balances[p.id] : room.initialBalance;
                    return `${getX(idx)},${getY(bal)}`;
                  })
                  .join(' ');

                return (
                  <g key={p.id}>
                    {/* Thin glow background polyline */}
                    <polyline
                      fill="none"
                      stroke={hexColor}
                      strokeWidth="5"
                      strokeOpacity="0.12"
                      points={pointsStr}
                    />
                    {/* Primary sharp path line */}
                    <polyline
                      fill="none"
                      stroke={hexColor}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={pointsStr}
                    />

                    {/* Interactive nodes at each point */}
                    {chartData.map((point, idx) => {
                      const bal = point.balances[p.id] !== undefined ? point.balances[p.id] : room.initialBalance;
                      const isHovered = hoveredPointIdx === idx;
                      return (
                        <circle
                          key={idx}
                          cx={getX(idx)}
                          cy={getY(bal)}
                          r={isHovered ? 5 : 2}
                          fill={isHovered ? '#111827' : hexColor}
                          stroke={isHovered ? '#FFF' : 'none'}
                          strokeWidth="2"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Bottom dynamic X time ticks label */}
              {chartData.map((point, idx) => {
                // Show label on start, end, first few, or if hovered
                const isStart = idx === 0;
                const isEnd = idx === chartData.length - 1;
                const shouldShowTick = isStart || isEnd || hoveredPointIdx === idx;

                if (!shouldShowTick) return null;

                return (
                  <text
                    key={idx}
                    x={getX(idx)}
                    y={height - paddingBottom + 16}
                    textAnchor={idx === 0 ? 'start' : idx === chartData.length - 1 ? 'end' : 'middle'}
                    fill={hoveredPointIdx === idx ? '#111827' : '#9CA3AF'}
                    className={hoveredPointIdx === idx ? 'font-black' : ''}
                  >
                    {point.timeLabel}
                  </text>
                );
              })}

              {/* Invisible touch/mouse event columns */}
              {chartData.map((_, idx) => {
                const xCoord = getX(idx);
                const colWidth = chartWidth / Math.max(1, chartData.length - 1);
                return (
                  <rect
                    key={idx}
                    x={xCoord - colWidth / 2}
                    y={paddingTop}
                    width={colWidth}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPointIdx(idx)}
                    onMouseLeave={() => setHoveredPointIdx(null)}
                    onTouchStart={() => setHoveredPointIdx(idx)}
                  />
                );
              })}
            </svg>
          </div>

          {/* Interactive Inspection Box */}
          <div className="bg-gray-50 border-2 border-black rounded-xl p-3">
            <h4 className="text-[10px] font-mono uppercase bg-neutral-200 text-neutral-800 font-extrabold px-1.5 py-0.5 rounded w-max mb-2 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {hoveredPointIdx === null
                ? '時點核賬對比：當前/最近期末餘額'
                : `歷史交易時點對賬：${chartData[hoveredPointIdx].timeLabel}`}
            </h4>

            <div className="grid grid-cols-2 gap-2 mt-1">
              {players.map(p => {
                const hexColor = getStrokeHex(p.color);
                const activeBalances = hoveredPointIdx === null 
                  ? chartData[chartData.length - 1].balances 
                  : chartData[hoveredPointIdx].balances;
                
                const balValue = activeBalances[p.id] !== undefined ? activeBalances[p.id] : room.initialBalance;

                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 bg-white border border-gray-300 rounded-lg shadow-sm"
                  >
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="text-lg shrink-0">{p.avatar}</span>
                      <span className="text-xs font-black text-black truncate">{p.name}</span>
                    </div>
                    <span
                      className="font-mono text-xs font-extrabold"
                      style={{ color: hexColor }}
                    >
                      ${balValue.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
