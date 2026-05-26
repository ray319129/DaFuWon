/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Property } from '../types';

const INITIAL_PROPERTIES_SEED: Property[] = [
  // Brown Group (order 1-2)
  {
    id: 'prop_01',
    name: '圓山露營區',
    group: 'brown',
    groupColor: 'from-amber-800 to-amber-950',
    price: 600,
    houseCost: 500,
    baseRent: 20,
    rentWithHouses: [20, 100, 300, 900, 1600, 2500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 1
  },
  {
    id: 'prop_02',
    name: '萬華夜市街',
    group: 'brown',
    groupColor: 'from-amber-800 to-amber-950',
    price: 600,
    houseCost: 500,
    baseRent: 40,
    rentWithHouses: [40, 200, 600, 1800, 3200, 4500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 2
  },

  // Railroad 1
  {
    id: 'prop_03',
    name: '台北火車站',
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

  // Light Blue Group (order 4-6)
  {
    id: 'prop_04',
    name: '三重天台地',
    group: 'lightblue',
    groupColor: 'from-sky-300 to-sky-400',
    price: 1000,
    houseCost: 500,
    baseRent: 60,
    rentWithHouses: [60, 300, 900, 2700, 4000, 5500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 4
  },
  {
    id: 'prop_05',
    name: '板橋體育場',
    group: 'lightblue',
    groupColor: 'from-sky-300 to-sky-400',
    price: 1000,
    houseCost: 500,
    baseRent: 60,
    rentWithHouses: [60, 300, 900, 2700, 4000, 5500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 5
  },
  {
    id: 'prop_06',
    name: '中和工業區',
    group: 'lightblue',
    groupColor: 'from-sky-300 to-sky-400',
    price: 1200,
    houseCost: 500,
    baseRent: 80,
    rentWithHouses: [80, 400, 1000, 3000, 4500, 6000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 6
  },

  // Pink Group (order 7-9)
  {
    id: 'prop_07',
    name: '永和樂華街',
    group: 'pink',
    groupColor: 'from-fuchsia-400 to-fuchsia-500',
    price: 1400,
    houseCost: 1000,
    baseRent: 100,
    rentWithHouses: [100, 500, 1500, 4500, 6250, 7500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 7
  },
  {
    id: 'prop_08',
    name: '新莊副都心',
    group: 'pink',
    groupColor: 'from-fuchsia-400 to-fuchsia-500',
    price: 1400,
    houseCost: 1000,
    baseRent: 100,
    rentWithHouses: [100, 500, 1500, 4500, 6250, 7500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 8
  },
  {
    id: 'prop_09',
    name: '淡水老街角',
    group: 'pink',
    groupColor: 'from-fuchsia-400 to-fuchsia-500',
    price: 1600,
    houseCost: 1000,
    baseRent: 120,
    rentWithHouses: [120, 600, 1800, 5000, 7000, 8750],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 9
  },

  // Utility 1
  {
    id: 'prop_10',
    name: '自來水淨水廠',
    group: 'utility',
    groupColor: 'from-purple-500 to-purple-600',
    price: 1500,
    houseCost: 0,
    baseRent: 400,
    rentWithHouses: [400, 400, 400, 400, 400, 400],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 10
  },

  // Orange Group (order 11-13)
  {
    id: 'prop_11',
    name: '新店碧潭灣',
    group: 'orange',
    groupColor: 'from-orange-450 to-orange-550',
    price: 1800,
    houseCost: 1000,
    baseRent: 140,
    rentWithHouses: [140, 700, 2000, 5500, 7500, 9500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 11
  },
  {
    id: 'prop_12',
    name: '基隆廟口攤',
    group: 'orange',
    groupColor: 'from-orange-450 to-orange-550',
    price: 1800,
    houseCost: 1000,
    baseRent: 140,
    rentWithHouses: [140, 700, 2000, 5500, 7500, 9500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 12
  },
  {
    id: 'prop_13',
    name: '汐止科學園',
    group: 'orange',
    groupColor: 'from-orange-450 to-orange-550',
    price: 2000,
    houseCost: 1000,
    baseRent: 160,
    rentWithHouses: [160, 800, 2200, 6000, 8000, 10000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 13
  },

  // Railroad 2
  {
    id: 'prop_14',
    name: '台中火車站',
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

  // Red Group (order 15-17)
  {
    id: 'prop_15',
    name: '桃園航空特區',
    group: 'red',
    groupColor: 'from-red-500 to-red-600',
    price: 2200,
    houseCost: 1500,
    baseRent: 180,
    rentWithHouses: [180, 900, 2500, 7000, 8750, 10500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 15
  },
  {
    id: 'prop_16',
    name: '新竹科學園區',
    group: 'red',
    groupColor: 'from-red-500 to-red-600',
    price: 2200,
    houseCost: 1500,
    baseRent: 180,
    rentWithHouses: [180, 900, 2500, 7000, 8750, 10500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 16
  },
  {
    id: 'prop_17',
    name: '苗栗明德湖',
    group: 'red',
    groupColor: 'from-red-500 to-red-600',
    price: 2400,
    houseCost: 1500,
    baseRent: 200,
    rentWithHouses: [200, 1000, 3000, 7500, 9250, 11000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 17
  },

  // Yellow Group (order 18-20)
  {
    id: 'prop_18',
    name: '台中逢甲街',
    group: 'yellow',
    groupColor: 'from-yellow-500 to-yellow-650',
    price: 2600,
    houseCost: 1500,
    baseRent: 220,
    rentWithHouses: [220, 1100, 3300, 8000, 9750, 11500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 18
  },
  {
    id: 'prop_19',
    name: '彰化八卦山',
    group: 'yellow',
    groupColor: 'from-yellow-500 to-yellow-650',
    price: 2600,
    houseCost: 1500,
    baseRent: 220,
    rentWithHouses: [220, 1100, 3300, 8000, 9750, 11500],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 19
  },
  {
    id: 'prop_20',
    name: '南投日月潭',
    group: 'yellow',
    groupColor: 'from-yellow-500 to-yellow-650',
    price: 2800,
    houseCost: 1500,
    baseRent: 240,
    rentWithHouses: [240, 1200, 3600, 8500, 10250, 12000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 20
  },

  // Utility 2
  {
    id: 'prop_21',
    name: '風力發電電力公司',
    group: 'utility',
    groupColor: 'from-purple-500 to-purple-600',
    price: 1500,
    houseCost: 0,
    baseRent: 400,
    rentWithHouses: [400, 400, 400, 400, 400, 400],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 21
  },

  // Green Group (order 22-24)
  {
    id: 'prop_22',
    name: '雲林古坑地',
    group: 'green',
    groupColor: 'from-emerald-600 to-emerald-700',
    price: 3000,
    houseCost: 2000,
    baseRent: 260,
    rentWithHouses: [260, 1300, 3900, 9000, 11000, 12750],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 22
  },
  {
    id: 'prop_23',
    name: '嘉義阿里山',
    group: 'green',
    groupColor: 'from-emerald-600 to-emerald-700',
    price: 3000,
    houseCost: 2000,
    baseRent: 260,
    rentWithHouses: [260, 1300, 3900, 9000, 11000, 12750],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 23
  },
  {
    id: 'prop_24',
    name: '台南安平古堡',
    group: 'green',
    groupColor: 'from-emerald-600 to-emerald-700',
    price: 3200,
    houseCost: 2000,
    baseRent: 280,
    rentWithHouses: [280, 1500, 4500, 10000, 12000, 14000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 24
  },

  // Railroad 3
  {
    id: 'prop_25',
    name: '高雄火車站',
    group: 'railroad',
    groupColor: 'from-zinc-700 to-zinc-900',
    price: 2000,
    houseCost: 0,
    baseRent: 250,
    rentWithHouses: [250, 500, 1000, 2000, 2000, 2000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 25
  },

  // Blue Group (order 26-27)
  {
    id: 'prop_26',
    name: '高雄愛河特區',
    group: 'blue',
    groupColor: 'from-blue-750 to-blue-850',
    price: 3500,
    houseCost: 2000,
    baseRent: 350,
    rentWithHouses: [350, 1750, 5000, 11000, 13000, 15000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 26
  },
  {
    id: 'prop_27',
    name: '台北信義豪宅',
    group: 'blue',
    groupColor: 'from-blue-750 to-blue-850',
    price: 4000,
    houseCost: 2000,
    baseRent: 500,
    rentWithHouses: [500, 2000, 6000, 14000, 17000, 20000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 27
  },

  // Railroad 4
  {
    id: 'prop_28',
    name: '花蓮港口站',
    group: 'railroad',
    groupColor: 'from-zinc-700 to-zinc-900',
    price: 2000,
    houseCost: 0,
    baseRent: 250,
    rentWithHouses: [250, 500, 1000, 2000, 2000, 2000],
    ownerId: null,
    houses: 0,
    isMortgaged: false,
    order: 28
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
