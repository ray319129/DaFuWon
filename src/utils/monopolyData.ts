/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Property } from '../types';

const INITIAL_PROPERTIES_SEED: Property[] = [
  // 1. Brown Group (order 1-2)
  {
    id: 'prop_01',
    name: '奧地利',
    group: 'brown',
    groupColor: 'from-amber-800 to-amber-950',
    price: 1000,
    houseCost: 500,
    baseRent: 80,
    rentWithHouses: [80, 400, 1200, 3600, 6400, 8000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 1
  },
  {
    id: 'prop_02',
    name: '波士尼亞',
    group: 'brown',
    groupColor: 'from-amber-800 to-amber-950',
    price: 1200,
    houseCost: 500,
    baseRent: 100,
    rentWithHouses: [100, 500, 1500, 4500, 8000, 10000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 2
  },

  // Railroad 1 (order 3)
  {
    id: 'prop_03',
    name: '柏林火車站',
    group: 'railroad',
    groupColor: 'from-zinc-700 to-zinc-900',
    price: 2000,
    houseCost: 0,
    baseRent: 250,
    rentWithHouses: [250, 500, 1000, 2000, 2000, 2000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 3
  },

  // 2. Light Blue Group (order 4-6)
  {
    id: 'prop_04',
    name: '義大利',
    group: 'lightblue',
    groupColor: 'from-sky-300 to-sky-400',
    price: 1400,
    houseCost: 500,
    baseRent: 120,
    rentWithHouses: [120, 600, 1800, 5400, 9600, 12000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 4
  },
  {
    id: 'prop_05',
    name: '西班牙',
    group: 'lightblue',
    groupColor: 'from-sky-300 to-sky-400',
    price: 1400,
    houseCost: 500,
    baseRent: 120,
    rentWithHouses: [120, 600, 1800, 5400, 9600, 12000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 5
  },
  {
    id: 'prop_06',
    name: '希臘',
    group: 'lightblue',
    groupColor: 'from-sky-300 to-sky-400',
    price: 1600,
    houseCost: 500,
    baseRent: 140,
    rentWithHouses: [140, 700, 2100, 6300, 11200, 14000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 6
  },

  // 3. Pink Group (order 7-9)
  {
    id: 'prop_07',
    name: '盧森堡',
    group: 'pink',
    groupColor: 'from-fuchsia-400 to-fuchsia-500',
    price: 1800,
    houseCost: 1000,
    baseRent: 160,
    rentWithHouses: [160, 800, 2400, 7200, 12800, 16000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 7
  },
  {
    id: 'prop_08',
    name: '挪威',
    group: 'pink',
    groupColor: 'from-fuchsia-400 to-fuchsia-500',
    price: 1800,
    houseCost: 1000,
    baseRent: 160,
    rentWithHouses: [160, 800, 2400, 7200, 12800, 16000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 8
  },
  {
    id: 'prop_09',
    name: '摩納哥',
    group: 'pink',
    groupColor: 'from-fuchsia-400 to-fuchsia-500',
    price: 1800,
    houseCost: 1000,
    baseRent: 160,
    rentWithHouses: [160, 800, 2400, 7200, 12800, 16000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 9
  },

  // Railroad 2 (order 10)
  {
    id: 'prop_10',
    name: '布拉格中央火車站',
    group: 'railroad',
    groupColor: 'from-zinc-700 to-zinc-900',
    price: 2000,
    houseCost: 0,
    baseRent: 250,
    rentWithHouses: [250, 500, 1000, 2000, 2000, 2000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 10
  },

  // 4. Orange Group (order 11-13)
  {
    id: 'prop_11',
    name: '捷克',
    group: 'orange',
    groupColor: 'from-orange-400 to-orange-500',
    price: 1800,
    houseCost: 1000,
    baseRent: 160,
    rentWithHouses: [160, 800, 2400, 7200, 12800, 16000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 11
  },
  {
    id: 'prop_12',
    name: '葡萄牙',
    group: 'orange',
    groupColor: 'from-orange-400 to-orange-500',
    price: 2000,
    houseCost: 1000,
    baseRent: 180,
    rentWithHouses: [180, 900, 2700, 8100, 14400, 18000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 12
  },
  {
    id: 'prop_13',
    name: '羅馬尼亞',
    group: 'orange',
    groupColor: 'from-orange-400 to-orange-500',
    price: 2000,
    houseCost: 1000,
    baseRent: 180,
    rentWithHouses: [180, 900, 2700, 8100, 14400, 18000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 13
  },

  // Railroad 3 (order 14)
  {
    id: 'prop_14',
    name: '雅典火車站',
    group: 'railroad',
    groupColor: 'from-zinc-700 to-zinc-900',
    price: 2000,
    houseCost: 0,
    baseRent: 250,
    rentWithHouses: [250, 500, 1000, 2000, 2000, 2000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 14
  },

  // 5. Red Group (order 15-17)
  {
    id: 'prop_15',
    name: '比利時',
    group: 'red',
    groupColor: 'from-red-500 to-red-600',
    price: 2200,
    houseCost: 1500,
    baseRent: 200,
    rentWithHouses: [200, 1000, 3000, 9000, 16000, 20000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 15
  },
  {
    id: 'prop_16',
    name: '英國',
    group: 'red',
    groupColor: 'from-red-500 to-red-600',
    price: 2200,
    houseCost: 1500,
    baseRent: 200,
    rentWithHouses: [200, 1000, 3000, 9000, 16000, 20000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 16
  },
  {
    id: 'prop_17',
    name: '荷蘭',
    group: 'red',
    groupColor: 'from-red-500 to-red-600',
    price: 2400,
    houseCost: 1500,
    baseRent: 220,
    rentWithHouses: [220, 1100, 3300, 9900, 17600, 22000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 17
  },

  // 6. Yellow Group (order 18-20)
  {
    id: 'prop_18',
    name: '芬蘭',
    group: 'yellow',
    groupColor: 'from-yellow-500 to-yellow-600',
    price: 2600,
    houseCost: 1500,
    baseRent: 240,
    rentWithHouses: [240, 1200, 3600, 10800, 19200, 24000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 18
  },
  {
    id: 'prop_19',
    name: '法國',
    group: 'yellow',
    groupColor: 'from-yellow-500 to-yellow-600',
    price: 2600,
    houseCost: 1500,
    baseRent: 240,
    rentWithHouses: [240, 1200, 3600, 10800, 19200, 24000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 19
  },
  {
    id: 'prop_20',
    name: '瑞典',
    group: 'yellow',
    groupColor: 'from-yellow-500 to-yellow-600',
    price: 2600,
    houseCost: 1500,
    baseRent: 240,
    rentWithHouses: [240, 1200, 3600, 10800, 19200, 24000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 20
  },

  // Railroad 4 (order 21)
  {
    id: 'prop_21',
    name: '日內瓦火車站',
    group: 'railroad',
    groupColor: 'from-zinc-700 to-zinc-900',
    price: 2000,
    houseCost: 0,
    baseRent: 250,
    rentWithHouses: [250, 500, 1000, 2000, 2000, 2000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 21
  },

  // 7. Green Group (order 22-24)
  {
    id: 'prop_22',
    name: '丹麥',
    group: 'green',
    groupColor: 'from-emerald-600 to-emerald-700',
    price: 2800,
    houseCost: 2000,
    baseRent: 260,
    rentWithHouses: [260, 1300, 3900, 11700, 20800, 26000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 22
  },
  {
    id: 'prop_23',
    name: '匈牙利',
    group: 'green',
    groupColor: 'from-emerald-600 to-emerald-700',
    price: 2800,
    houseCost: 2000,
    baseRent: 260,
    rentWithHouses: [260, 1300, 3900, 11700, 20800, 26000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 23
  },
  {
    id: 'prop_24',
    name: '愛爾蘭',
    group: 'green',
    groupColor: 'from-emerald-600 to-emerald-700',
    price: 2800,
    houseCost: 2000,
    baseRent: 260,
    rentWithHouses: [260, 1300, 3900, 11700, 20800, 26000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 24
  },

  // 8. Blue Group (order 25-26)
  {
    id: 'prop_25',
    name: '德國',
    group: 'blue',
    groupColor: 'from-blue-750 to-blue-850',
    price: 3000,
    houseCost: 2000,
    baseRent: 300,
    rentWithHouses: [300, 1500, 4500, 13500, 24000, 30000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 25
  },
  {
    id: 'prop_26',
    name: '瑞士',
    group: 'blue',
    groupColor: 'from-blue-750 to-blue-850',
    price: 3200,
    houseCost: 2000,
    baseRent: 350,
    rentWithHouses: [350, 1750, 5000, 15000, 26000, 32000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 26
  }
];

export function getInitialProperties(): Property[] {
  // Return deep copy so mutating state doesn't overwrite constant of templates
  return JSON.parse(JSON.stringify(INITIAL_PROPERTIES_SEED));
}

/**
 * Calculates current actual rent of a property.
 * Includes dynamic count multipliers for Railroad and Utilities.
 */
export function calculateRent(property: Property, ownedProperties: Property[]): number {
  if (property.isMortgaged) return 0;
  
  if (property.group === 'railroad') {
    // Count how many railroads the owner owns in total
    const railroadsOwnedCount = ownedProperties.filter(
      p => p.group === 'railroad' && p.ownerId === property.ownerId && !p.isMortgaged
    ).length;
    
    // Rent doubles per railroad: 1->250, 2->500, 3->1000, 4->2000
    if (railroadsOwnedCount <= 1) return 250;
    if (railroadsOwnedCount === 2) return 500;
    if (railroadsOwnedCount === 3) return 1000;
    return 2000;
  }
  
  if (property.group === 'utility') {
    const utilitiesOwnedCount = ownedProperties.filter(
      p => p.group === 'utility' && p.ownerId === property.ownerId && !p.isMortgaged
    ).length;
    
    // Standard utility rule: 1 owned = $400 flat, 2 owned = $1200 flat (simulated)
    return utilitiesOwnedCount === 2 ? 1200 : 400;
  }
  
  // Standard street property: rent matches its current house level index
  const houseLevel = property.houses || 0;
  return property.rentWithHouses[houseLevel] || property.baseRent;
}
