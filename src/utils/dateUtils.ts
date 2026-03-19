
function parseYMD(str: string) {
  if (!str || !/\d{4}-\d{2}-\d{2}/.test(str)) return null;
  const [y, m, d] = str.split('-').map(x => parseInt(x, 10));
  return { y, m, d };
}

function formatDMY(d: number, m: number, y: number) {
  const day = String(d).padStart(2, '0');
  const month = String(m).padStart(2, '0');
  const year2 = String(y).slice(-2);
  return `${day}/${month}/${year2}`;
}

export function formatDateDMY(str: string) {
  if (!str) return '____';
  const parsed = parseYMD(str);
  if (!parsed) return '____';
  return formatDMY(parsed.d, parsed.m, parsed.y);
}

export function calcEdadY(birthStr: string, refStr?: string): string {
  const birthParsed = parseYMD(birthStr);
  if (!birthParsed) return '';
  
  let refY, refM, refD;
  const refParsed = refStr ? parseYMD(refStr) : null;
  
  if (refParsed) {
    ({ y: refY, m: refM, d: refD } = refParsed);
  } else {
    const now = new Date();
    refY = now.getFullYear();
    refM = now.getMonth() + 1;
    refD = now.getDate();
  }
  
  const { y: by, m: bm, d: bd } = birthParsed;
  let age = refY - by;
  if (refM < bm || (refM === bm && refD < bd)) age--;
  
  return String(Math.max(age, 0));
}

export function todayDMY() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
}
