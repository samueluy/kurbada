type ModelEntry = { name: string; cc: number };

const brandModels: Record<string, ModelEntry[]> = {
  Honda: [
    { name: 'Click 125', cc: 125 },
    { name: 'Click 150', cc: 150 },
    { name: 'Beat', cc: 110 },
    { name: 'PCX 160', cc: 160 },
    { name: 'ADV 160', cc: 160 },
    { name: 'CBR 150R', cc: 150 },
    { name: 'TMX 125', cc: 125 },
    { name: 'XRM 125', cc: 125 },
    { name: 'Winner X', cc: 150 },
    { name: 'CB150X', cc: 150 },
  ],
  Yamaha: [
    { name: 'Mio i 125', cc: 125 },
    { name: 'Mio Gear', cc: 125 },
    { name: 'Mio Soul i 125', cc: 125 },
    { name: 'Mio Fazzio', cc: 125 },
    { name: 'NMax', cc: 155 },
    { name: 'Aerox', cc: 155 },
    { name: 'Sniper 155', cc: 155 },
    { name: 'XSR 155', cc: 155 },
    { name: 'MT-15', cc: 155 },
    { name: 'PG-1', cc: 114 },
  ],
  Kawasaki: [
    { name: 'Barako 175', cc: 175 },
    { name: 'CT125', cc: 125 },
    { name: 'Dominar 400', cc: 373 },
    { name: 'Ninja 400', cc: 399 },
    { name: 'Z400', cc: 399 },
    { name: 'Z650', cc: 649 },
    { name: 'Ninja 650', cc: 649 },
    { name: 'Versys 650', cc: 649 },
  ],
  Suzuki: [
    { name: 'Raider R150', cc: 150 },
    { name: 'Smash 115', cc: 115 },
    { name: 'Burgman Street', cc: 125 },
    { name: 'GSX-S150', cc: 150 },
    { name: 'GSX-R150', cc: 150 },
    { name: 'Gixxer 155', cc: 155 },
    { name: 'Skydrive Sport', cc: 113 },
  ],
  KTM: [
    { name: 'Duke 200', cc: 200 },
    { name: 'Duke 390', cc: 373 },
    { name: 'RC 200', cc: 200 },
    { name: 'RC 390', cc: 373 },
  ],
  Ducati: [
    { name: 'Monster 797', cc: 803 },
    { name: 'Monster 821', cc: 821 },
    { name: 'Scrambler 800', cc: 803 },
    { name: 'Panigale V2', cc: 955 },
  ],
  BMW: [
    { name: 'G 310 R', cc: 313 },
    { name: 'G 310 GS', cc: 313 },
    { name: 'F 850 GS', cc: 853 },
    { name: 'R 1250 GS', cc: 1254 },
  ],
  'Harley-Davidson': [
    { name: 'Street 750', cc: 749 },
    { name: 'Iron 883', cc: 883 },
    { name: 'Forty-Eight', cc: 1202 },
  ],
  'Royal Enfield': [
    { name: 'Classic 350', cc: 349 },
    { name: 'Hunter 350', cc: 349 },
    { name: 'Interceptor 650', cc: 648 },
    { name: 'Continental GT 650', cc: 648 },
  ],
  CFMoto: [
    { name: '400 NK', cc: 400 },
    { name: '650 NK', cc: 649 },
    { name: '650 MT', cc: 649 },
    { name: '450 SR', cc: 450 },
  ],
  Other: [],
};

export const bikeBrands = Object.keys(brandModels);

export function getModelsForBrand(brand: string): ModelEntry[] {
  return brandModels[brand] ?? [];
}
