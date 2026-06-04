import { HAIR_META } from '../data/suspects';

const SKIN = {
  F: { young: "#F5CBA0", mid: "#E8A870", older: "#C8885A" },
  M: { young: "#E8B88A", mid: "#D4966A", older: "#B87850" },
};

const OUTFIT_COLORS = {
  dress:   "#2C2C3A",
  suit:    "#1A2535",
  trench:  "#5C4A2A",
  coat:    "#2A3525",
  uniform: "#1A2040",
  vest:    "#3A2A1A",
  leather: "#1A1510",
};

function getSkin(s) {
  const t = SKIN[s.gender];
  if (s.age < 35) return t.young;
  if (s.age < 52) return t.mid;
  return t.older;
}

export function drawFace(s, size = 80) {
  const W = size, H = size;
  const cx = W / 2;
  const skin = getSkin(s);
  const hairColor = HAIR_META[s.hair].color;
  const outfitColor = OUTFIT_COLORS[s.outfit];
  const isF = s.gender === 'F';

  const faceW = isF ? W * 0.46 : W * 0.48;
  const faceH = isF ? H * 0.44 : H * 0.46;
  const faceY = H * 0.36;

  let d = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;

  // Background
  d += `<rect width="${W}" height="${H}" rx="6" fill="#0D0D18"/>`;

  // Outfit / shoulders
  const sW = W * 0.72;
  d += `<ellipse cx="${cx}" cy="${H}" rx="${sW/2}" ry="${H*0.28}" fill="${outfitColor}"/>`;
  if (s.outfit === 'suit') {
    d += `<polygon points="${cx},${H*0.78} ${cx-sW*0.1},${H} ${cx+sW*0.1},${H}" fill="#0A1525" opacity="0.6"/>`;
    d += `<rect x="${cx-1.5}" y="${H*0.78}" width="3" height="${H*0.14}" rx="1" fill="#C0A030" opacity="0.6"/>`;
  }
  if (s.outfit === 'trench') {
    d += `<rect x="${cx-sW*0.12}" y="${H*0.76}" width="${sW*0.24}" height="${H*0.16}" rx="2" fill="#3A2A0A" opacity="0.6"/>`;
  }
  if (s.outfit === 'uniform') {
    d += `<rect x="${cx-sW*0.28}" y="${H*0.77}" width="${sW*0.56}" height="${H*0.04}" rx="1" fill="#C0A030" opacity="0.4"/>`;
  }

  // Face ellipse
  d += `<ellipse cx="${cx}" cy="${faceY}" rx="${faceW}" ry="${faceH}" fill="${skin}"/>`;

  // Jaw
  const jawY = faceY + faceH * 0.72;
  const chinY = faceY + faceH * 1.05;
  if (isF) {
    d += `<path d="M${cx-faceW*0.55},${jawY} Q${cx},${chinY+H*0.04} ${cx+faceW*0.55},${jawY}" fill="${skin}"/>`;
  } else {
    d += `<path d="M${cx-faceW*0.6},${jawY} L${cx-faceW*0.28},${chinY} L${cx+faceW*0.28},${chinY} L${cx+faceW*0.6},${jawY}" fill="${skin}"/>`;
  }

  // Ears
  const eS = faceH * 0.28;
  d += `<ellipse cx="${cx-faceW-eS*0.1}" cy="${faceY+faceH*0.1}" rx="${eS*0.32}" ry="${eS*0.45}" fill="${skin}"/>`;
  d += `<ellipse cx="${cx+faceW+eS*0.1}" cy="${faceY+faceH*0.1}" rx="${eS*0.32}" ry="${eS*0.45}" fill="${skin}"/>`;

  // Hair
  const hairTop = faceY - faceH * 0.92;
  const hS = faceW * 1.05;
  if (isF) {
    d += `<ellipse cx="${cx}" cy="${hairTop+faceH*0.3}" rx="${hS*1.02}" ry="${faceH*0.7}" fill="${hairColor}"/>`;
    d += `<path d="M${cx-hS},${faceY} Q${cx-hS*1.2},${faceY+faceH*0.9} ${cx-hS*0.65},${faceY+faceH*1.4}" stroke="${hairColor}" stroke-width="${faceW*0.36}" fill="none" stroke-linecap="round"/>`;
    d += `<path d="M${cx+hS},${faceY} Q${cx+hS*1.2},${faceY+faceH*0.9} ${cx+hS*0.65},${faceY+faceH*1.4}" stroke="${hairColor}" stroke-width="${faceW*0.36}" fill="none" stroke-linecap="round"/>`;
  } else {
    d += `<ellipse cx="${cx}" cy="${hairTop+faceH*0.28}" rx="${hS*0.98}" ry="${faceH*0.62}" fill="${hairColor}"/>`;
    d += `<rect x="${cx-hS*0.98}" y="${hairTop+faceH*0.28}" width="${hS*1.96}" height="${faceH*0.22}" fill="${hairColor}"/>`;
    if (s.hair === 'blonde') {
      d += `<path d="M${cx-hS*0.6},${faceY-faceH*0.4} Q${cx-hS*0.2},${hairTop-faceH*0.1} ${cx+hS*0.3},${faceY-faceH*0.55}" stroke="${hairColor}" stroke-width="${faceW*0.18}" fill="none" stroke-linecap="round"/>`;
    }
  }

  // Eyes
  const eyeY  = faceY - faceH * 0.08;
  const eyeOX = faceW * 0.42;
  const eRx   = isF ? faceW * 0.14 : faceW * 0.13;
  const eRy   = isF ? faceH * 0.11 : faceH * 0.095;

  [-1, 1].forEach(side => {
    const ex = cx + side * eyeOX;
    d += `<ellipse cx="${ex}" cy="${eyeY}" rx="${eRx}" ry="${eRy}" fill="white"/>`;
    d += `<ellipse cx="${ex}" cy="${eyeY}" rx="${eRx*0.58}" ry="${eRy*0.78}" fill="#2A1A0A"/>`;
    d += `<circle cx="${ex+eRx*0.2}" cy="${eyeY-eRy*0.2}" r="${eRx*0.2}" fill="white" opacity="0.8"/>`;
  });

  // Eyebrows
  const browY = eyeY - eRy - faceH * 0.07;
  const bT    = isF ? faceH*0.045 : faceH*0.065;
  d += `<path d="M${cx-eyeOX-eRx*0.9},${browY} Q${cx-eyeOX},${browY-faceH*0.04} ${cx-eyeOX+eRx*0.9},${browY+(isF?faceH*0.01:0)}" stroke="${hairColor}" stroke-width="${bT}" fill="none" stroke-linecap="round"/>`;
  d += `<path d="M${cx+eyeOX-eRx*0.9},${browY+(isF?faceH*0.01:0)} Q${cx+eyeOX},${browY-faceH*0.04} ${cx+eyeOX+eRx*0.9},${browY}" stroke="${hairColor}" stroke-width="${bT}" fill="none" stroke-linecap="round"/>`;

  // Nose
  const nX = cx, nTop = faceY + faceH*0.1, nBot = faceY + faceH*0.38;
  d += `<path d="M${nX},${nTop} C${nX-faceW*0.05},${nBot-faceH*0.1} ${nX-faceW*0.15},${nBot} ${nX},${nBot}" stroke="${skin}" stroke-width="${faceW*0.06}" fill="none" opacity="0.5"/>`;
  d += `<path d="M${nX},${nBot} C${nX+faceW*0.15},${nBot} ${nX+faceW*0.05},${nBot-faceH*0.1} ${nX},${nTop}" stroke="${skin}" stroke-width="${faceW*0.06}" fill="none" opacity="0.5"/>`;

  // Mouth
  const mY = faceY + faceH * 0.62;
  const mW = isF ? faceW*0.38 : faceW*0.44;
  d += `<path d="M${cx-mW},${mY} Q${cx},${mY+faceH*0.12} ${cx+mW},${mY}" stroke="#8B4040" stroke-width="${faceH*0.045}" fill="none" stroke-linecap="round"/>`;
  if (isF) {
    d += `<path d="M${cx-mW*0.9},${mY} Q${cx},${mY-faceH*0.04} ${cx+mW*0.9},${mY}" stroke="#A05050" stroke-width="${faceH*0.025}" fill="none" stroke-linecap="round" opacity="0.6"/>`;
  }

  // Accessories
  if (s.acc === 'hat') {
    const brimY = hairTop + faceH*0.15;
    const topY  = hairTop - faceH*0.38;
    d += `<rect x="${cx-faceW*0.72}" y="${topY}" width="${faceW*1.44}" height="${brimY-topY}" rx="3" fill="#08080F"/>`;
    d += `<rect x="${cx-faceW*0.95}" y="${brimY}" width="${faceW*1.9}" height="${faceH*0.11}" rx="2" fill="#08080F"/>`;
    d += `<rect x="${cx-faceW*0.72}" y="${brimY-faceH*0.01}" width="${faceW*1.44}" height="${faceH*0.035}" fill="#1A1A2A"/>`;
  }

  if (s.acc === 'glasses') {
    const gY = eyeY;
    const gR = eRx * 1.25;
    d += `<rect x="${cx-eyeOX-gR}" y="${gY-eRy*1.3}" width="${gR*2}" height="${eRy*2.6}" rx="${eRy*0.8}" fill="none" stroke="#8B7040" stroke-width="${faceW*0.045}"/>`;
    d += `<rect x="${cx+eyeOX-gR}" y="${gY-eRy*1.3}" width="${gR*2}" height="${eRy*2.6}" rx="${eRy*0.8}" fill="none" stroke="#8B7040" stroke-width="${faceW*0.045}"/>`;
    d += `<line x1="${cx-eyeOX+gR}" y1="${gY}" x2="${cx+eyeOX-gR}" y2="${gY}" stroke="#8B7040" stroke-width="${faceW*0.035}"/>`;
    d += `<line x1="${cx-eyeOX-gR}" y1="${gY}" x2="${cx-faceW}" y2="${gY+eRy*0.3}" stroke="#8B7040" stroke-width="${faceW*0.03}"/>`;
    d += `<line x1="${cx+eyeOX+gR}" y1="${gY}" x2="${cx+faceW}" y2="${gY+eRy*0.3}" stroke="#8B7040" stroke-width="${faceW*0.03}"/>`;
  }

  if (s.acc === 'mustache') {
    const mstY = mY - faceH*0.06;
    d += `<path d="M${cx-faceW*0.34},${mstY} Q${cx-faceW*0.18},${mstY+faceH*0.08} ${cx},${mstY+faceH*0.02} Q${cx+faceW*0.18},${mstY+faceH*0.08} ${cx+faceW*0.34},${mstY}" fill="${hairColor}" opacity="0.9"/>`;
  }

  if (s.acc === 'beard') {
    d += `<ellipse cx="${cx}" cy="${mY+faceH*0.28}" rx="${faceW*0.48}" ry="${faceH*0.24}" fill="${hairColor}" opacity="0.75"/>`;
    d += `<ellipse cx="${cx}" cy="${mY+faceH*0.1}" rx="${faceW*0.36}" ry="${faceH*0.12}" fill="${hairColor}" opacity="0.6"/>`;
  }

  if (s.acc === 'scar') {
    d += `<path d="M${cx+faceW*0.2},${eyeY-faceH*0.2} L${cx+faceW*0.08},${eyeY+faceH*0.35}" stroke="#7A3030" stroke-width="${faceW*0.055}" fill="none" stroke-linecap="round" opacity="0.85"/>`;
  }

  if (s.acc === 'cigarette') {
    d += `<rect x="${cx+faceW*0.18}" y="${mY-faceH*0.025}" width="${faceW*0.38}" height="${faceH*0.05}" rx="${faceH*0.025}" fill="#F0EBD8"/>`;
    d += `<rect x="${cx+faceW*0.48}" y="${mY-faceH*0.025}" width="${faceW*0.08}" height="${faceH*0.05}" rx="1" fill="#C04020" opacity="0.9"/>`;
    d += `<path d="M${cx+faceW*0.56},${mY-faceH*0.025} Q${cx+faceW*0.62},${mY-faceH*0.12} ${cx+faceW*0.58},${mY-faceH*0.22}" stroke="#888" stroke-width="${faceW*0.022}" fill="none" opacity="0.4"/>`;
  }

  if (s.acc === 'earring') {
    d += `<circle cx="${cx+faceW+eS*0.1}" cy="${faceY+faceH*0.28}" r="${faceH*0.055}" fill="#D4A020" opacity="0.9"/>`;
  }

  d += `</svg>`;
  return d;
}
