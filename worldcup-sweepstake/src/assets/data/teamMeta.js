const TEAM_META = {
  'Algeria': { code: 'DZ', logo: 'https://r2.thesportsdb.com/images/media/team/badge/rrwpry1455460218.png' },
  'Argentina': { code: 'AR', logo: 'https://r2.thesportsdb.com/images/media/team/badge/3zplhu1726167477.png' },
  'Australia': { code: 'AU', logo: 'https://r2.thesportsdb.com/images/media/team/badge/lark6k1661780848.png' },
  'Austria': { code: 'AT', logo: 'https://r2.thesportsdb.com/images/media/team/badge/874p631628721400.png' },
  'Belgium': { code: 'BE', logo: 'https://r2.thesportsdb.com/images/media/team/badge/8xlvxv1592062265.png' },
  'Bosnia-Herzegovina': { code: 'BA', logo: 'https://r2.thesportsdb.com/images/media/team/badge/wtqqst1455463120.png' },
  'Brazil': { code: 'BR', logo: 'https://r2.thesportsdb.com/images/media/team/badge/jl6dip1726167280.png' },
  'Cameroon': { code: 'CM', logo: 'https://r2.thesportsdb.com/images/media/team/badge/txqspw1455463989.png' },
  'Canada': { code: 'CA', logo: 'https://r2.thesportsdb.com/images/media/team/badge/2t631f1595154867.png' },
  'Cape Verde': { code: 'CV', logo: 'https://r2.thesportsdb.com/images/media/team/badge/5jn0o71593280376.png' },
  'Colombia': { code: 'CO', logo: 'https://r2.thesportsdb.com/images/media/team/badge/4ymyku1691180081.png' },
  'Costa Rica': { code: 'CR', logo: 'https://r2.thesportsdb.com/images/media/team/badge/bss90a1637840151.png' },
  'Croatia': { code: 'HR', logo: 'https://r2.thesportsdb.com/images/media/team/badge/vvtsyu1455465317.png' },
  'Curacao': { code: 'CW', logo: 'https://r2.thesportsdb.com/images/media/team/badge/itygvb1600955363.png' },
  'Czech Republic': { code: 'CZ', logo: 'https://r2.thesportsdb.com/images/media/team/badge/1o0cx31654205806.png' },
  'Denmark': { code: 'DK', logo: 'https://r2.thesportsdb.com/images/media/team/badge/e13arj1717365623.png' },
  'DR Congo': { code: 'CD', logo: 'https://r2.thesportsdb.com/images/media/team/badge/s85jjw1728749022.png' },
  'Ecuador': { code: 'EC', logo: 'https://r2.thesportsdb.com/images/media/team/badge/47wv2y1591989301.png' },
  'Egypt': { code: 'EG', logo: 'https://r2.thesportsdb.com/images/media/team/badge/uheyzo1742102234.png' },
  'England': { flag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC65\uDB40\uDC6E\uDB40\uDC67\uDB40\uDC7F', logo: 'https://r2.thesportsdb.com/images/media/team/badge/vf5ttc1726166739.png' },
  'France': { code: 'FR', logo: 'https://r2.thesportsdb.com/images/media/team/badge/p3n0z51726166851.png' },
  'Germany': { code: 'DE', logo: 'https://r2.thesportsdb.com/images/media/team/badge/1xysi51726167152.png' },
  'Ghana': { code: 'GH', logo: 'https://r2.thesportsdb.com/images/media/team/badge/j589xw1751526124.png' },
  'Haiti': { code: 'HT', logo: 'https://r2.thesportsdb.com/images/media/team/badge/gml8wx1598135302.png' },
  'Iran': { code: 'IR', logo: 'https://r2.thesportsdb.com/images/media/team/badge/uttpvw1455465617.png' },
  'Iraq': { code: 'IQ', logo: 'https://r2.thesportsdb.com/images/media/team/badge/aqidfn1742100110.png' },
  'Ivory Coast': { code: 'CI', logo: 'https://r2.thesportsdb.com/images/media/team/badge/rwxuuu1455465643.png' },
  'Japan': { code: 'JP', logo: 'https://r2.thesportsdb.com/images/media/team/badge/ffsyxz1591989843.png' },
  'Jordan': { code: 'JO', logo: 'https://r2.thesportsdb.com/images/media/team/badge/59fo2s1742100034.png' },
  'Mexico': { code: 'MX', logo: 'https://r2.thesportsdb.com/images/media/team/badge/3rmosi1748525208.png' },
  'Morocco': { code: 'MA', logo: 'https://r2.thesportsdb.com/images/media/team/badge/hbmwkj1731791275.png' },
  'Netherlands': { code: 'NL', logo: 'https://r2.thesportsdb.com/images/media/team/badge/1p0hr41593787110.png' },
  'New Zealand': { code: 'NZ', logo: 'https://r2.thesportsdb.com/images/media/team/badge/91xpk81742982935.png' },
  'Norway': { code: 'NO', logo: 'https://r2.thesportsdb.com/images/media/team/badge/gyfn811591973155.png' },
  'Panama': { code: 'PA', logo: 'https://r2.thesportsdb.com/images/media/team/badge/asp2ck1715849700.png' },
  'Paraguay': { code: 'PY', logo: 'https://r2.thesportsdb.com/images/media/team/badge/khgav41553419195.png' },
  'Poland': { code: 'PL', logo: 'https://r2.thesportsdb.com/images/media/team/badge/ttvrxy1455466076.png' },
  'Portugal': { code: 'PT', logo: 'https://r2.thesportsdb.com/images/media/team/badge/swqvpy1455466083.png' },
  'Qatar': { code: 'QA', logo: 'https://r2.thesportsdb.com/images/media/team/badge/rs3ir31642708685.png' },
  'Saudi Arabia': { code: 'SA', logo: 'https://r2.thesportsdb.com/images/media/team/badge/24xwpq1594125742.png' },
  'Scotland': { flag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F', logo: 'https://r2.thesportsdb.com/images/media/team/badge/3691i11552945146.png' },
  'Senegal': { code: 'SN', logo: 'https://r2.thesportsdb.com/images/media/team/badge/slayb01780546342.png' },
  'Serbia': { code: 'RS', logo: 'https://r2.thesportsdb.com/images/media/team/badge/oxvynb1689195538.png' },
  'South Africa': { code: 'ZA', logo: 'https://r2.thesportsdb.com/images/media/team/badge/xjz9j91553368824.png' },
  'South Korea': { code: 'KR', logo: 'https://r2.thesportsdb.com/images/media/team/badge/a8nqfs1589564916.png' },
  'Spain': { code: 'ES', logo: 'https://r2.thesportsdb.com/images/media/team/badge/ncgqyr1726166942.png' },
  'Sweden': { code: 'SE', logo: 'https://r2.thesportsdb.com/images/media/team/badge/h5adzg1591981772.png' },
  'Switzerland': { code: 'CH', logo: 'https://r2.thesportsdb.com/images/media/team/badge/mb7yqe1717365808.png' },
  'Tunisia': { code: 'TN', logo: 'https://r2.thesportsdb.com/images/media/team/badge/7r89rg1526727277.png' },
  'Turkey': { code: 'TR', logo: 'https://r2.thesportsdb.com/images/media/team/badge/70c4oo1591982459.png' },
  'Uruguay': { code: 'UY', logo: 'https://r2.thesportsdb.com/images/media/team/badge/6vjbr11726167756.png' },
  'USA': { code: 'US', logo: 'https://r2.thesportsdb.com/images/media/team/badge/21f0oi1597948195.png' },
  'Uzbekistan': { code: 'UZ', logo: 'https://r2.thesportsdb.com/images/media/team/badge/u5bgze1597943605.png' },
  'Wales': { flag: '\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC77\uDB40\uDC6C\uDB40\uDC73\uDB40\uDC7F', logo: 'https://r2.thesportsdb.com/images/media/team/badge/pdayn21591983222.png' },
}

const ALIASES = {
  'bosnia and herzegovina': 'Bosnia-Herzegovina',
  'cabo verde': 'Cape Verde',
  'congo dr': 'DR Congo',
  'curacao': 'Curacao',
  'cote divoire': 'Ivory Coast',
  'cote d ivoire': 'Ivory Coast',
  'czechia': 'Czech Republic',
  'democratic republic of congo': 'DR Congo',
  'ivory coast': 'Ivory Coast',
  'korea republic': 'South Korea',
  'south korea': 'South Korea',
  'united states': 'USA',
  'united states of america': 'USA',
}

const META_BY_KEY = new Map(
  Object.entries(TEAM_META).flatMap(([name, meta]) => [
    [normalizeTeamName(name), { name, ...meta }],
    ...Object.entries(ALIASES)
      .filter(([, canonical]) => canonical === name)
      .map(([alias]) => [normalizeTeamName(alias), { name, ...meta }]),
  ])
)

export function enrichTeam(team) {
  if (!team) return null

  const meta = getTeamMeta(team.name)

  return {
    ...team,
    name: team.name || meta?.name || 'TBD',
    flag: meta?.flag || team.flag || '',
    logo: meta?.logo || team.logo || '',
  }
}

export function getTeamMeta(name = '') {
  const meta = META_BY_KEY.get(normalizeTeamName(name))
  if (!meta) return null

  return {
    ...meta,
    flag: meta.flag || flagFromCode(meta.code),
  }
}

export function normalizeTeamName(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function flagFromCode(code = '') {
  if (!code || code.length !== 2) return ''

  return code
    .toUpperCase()
    .split('')
    .map(character => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join('')
}
