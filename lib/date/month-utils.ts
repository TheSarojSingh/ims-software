export const NEPALI_MONTHS = [
  { id: 1,  name: 'Baisakh' },
  { id: 2,  name: 'Jestha'  },
  { id: 3,  name: 'Asar'    },
  { id: 4,  name: 'Shrawan' },
  { id: 5,  name: 'Bhadra'  },
  { id: 6,  name: 'Ashwin'  },
  { id: 7,  name: 'Kartik'  },
  { id: 8,  name: 'Mangsir' },
  { id: 9,  name: 'Poush'   },
  { id: 10, name: 'Magh'    },
  { id: 11, name: 'Falgun'  },
  { id: 12, name: 'Chaitra' },
];

export function getBSMonthBounds(year: number, monthId: number) {
  const paddedMonth = monthId.toString().padStart(2, '0');
  return {
    startString: `${year}-${paddedMonth}-01`,
    endString:   `${year}-${paddedMonth}-32`,
  };
}