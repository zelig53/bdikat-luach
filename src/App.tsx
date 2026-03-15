/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Baby, PartyPopper, Info, Sparkles, Heart, Star, Gift, Milk, Download,
  Settings, X, Calendar, Bell, BellOff, BookOpen, CheckSquare, Plus,
  Trash2, Clock, ChevronUp, AlertCircle, Pencil
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DEFAULT_TARGET_DATE = new Date(2026, 5, 11);

// All dates verified against the Hebrew calendar for year 5786 (2025–2026)
const HOLIDAYS: { name: string; start: Date; end: Date; type: 'holiday' | 'fast' | 'other' }[] = [
  { name: "חנוכה",              start: new Date(2025, 11, 15), end: new Date(2025, 11, 23), type: 'holiday' },  // 25 Kislev – 3 Tevet
  { name: "עשרה בטבת",          start: new Date(2025, 11, 30), end: new Date(2025, 11, 30), type: 'fast'    },  // 10 Tevet
  { name: 'ט"ו בשבט',           start: new Date(2026,  1,  2), end: new Date(2026,  1,  2), type: 'other'   },  // 15 Shevat
  { name: "תענית אסתר",          start: new Date(2026,  2,  2), end: new Date(2026,  2,  2), type: 'fast'    },  // 13 Adar
  { name: "פורים",               start: new Date(2026,  2,  3), end: new Date(2026,  2,  4), type: 'holiday' },  // 14–15 Adar
  { name: "חופשת פסח",           start: new Date(2026,  2, 31), end: new Date(2026,  3,  9), type: 'holiday' },  // 14–22 Nisan
  { name: "יום השואה",           start: new Date(2026,  3, 20), end: new Date(2026,  3, 20), type: 'other'   },  // 27 Nisan
  { name: "יום הזיכרון",         start: new Date(2026,  3, 21), end: new Date(2026,  3, 21), type: 'other'   },  // 4 Iyar
  { name: "יום העצמאות",         start: new Date(2026,  3, 22), end: new Date(2026,  3, 22), type: 'holiday' },  // 5 Iyar
  { name: "פסח שני",             start: new Date(2026,  4,  1), end: new Date(2026,  4,  1), type: 'other'   },  // 14 Iyar
  { name: 'ל"ג בעומר',           start: new Date(2026,  4,  5), end: new Date(2026,  4,  5), type: 'holiday' },  // 18 Iyar
  { name: "שבועות",              start: new Date(2026,  4, 22), end: new Date(2026,  4, 23), type: 'holiday' },  // 6–7 Sivan
  { name: "שבעה עשר בתמוז",      start: new Date(2026,  6,  2), end: new Date(2026,  6,  2), type: 'fast'    },  // 17 Tamuz
  { name: "תשעה באב",            start: new Date(2026,  6, 23), end: new Date(2026,  6, 23), type: 'fast'    },  // 9 Av
];

// Events keyed by English month NAME (from Intl 'en-u-ca-hebrew') + day number.
// Name-based matching is fully leap-year proof:
// — 'Adar' fires in a regular year, 'Adar II' fires in a leap year (both = 6 Adar / 14 Adar).
// — 'Nisan', 'Iyar', etc. fire on the correct date regardless of whether the year has one or two Adars.
interface HasidicEvent { hebrewMonthName: string; hebrewDay: number; name: string; description: string; }

const HASIDIC_EVENTS: HasidicEvent[] = [
  { hebrewMonthName: 'Tishri',   hebrewDay: 6,  name: 'הילולת הרבנית חנה',             description: 'יום פטירת הרבנית חנה שניאורסון, אמו של הרבי מליובאוויטש, שנודעה במסירות נפש על שמירת היהדות בתקופת השלטון הסובייטי.' },
  { hebrewMonthName: 'Tishri',   hebrewDay: 13, name: 'הילולת אדמו"ר המהר"ש',          description: 'יום פטירת רבי שמואל שניאורסון (האדמו"ר הרביעי מחב"ד), הידוע בגישת לכתחילה אריבער.' },
  { hebrewMonthName: 'Cheshvan', hebrewDay: 20, name: 'יום הולדת אדמו"ר הרש"ב',        description: 'יום הולדת רבי שלום דובער שניאורסון (האדמו"ר החמישי מחב"ד), מייסד ישיבת תומכי תמימים.' },
  { hebrewMonthName: 'Kislev',   hebrewDay: 9,  name: 'הולדת והילולת אדמו"ר האמצעי',  description: 'יום הולדתו ופטירתו של רבי דובער שניאורי, האדמו"ר השני מחב"ד.' },
  { hebrewMonthName: 'Kislev',   hebrewDay: 10, name: 'גאולת אדמו"ר האמצעי',           description: 'יום שחרורו ממאסר ברוסיה לאחר שנאסר בעקבות הלשנות על פעילותו להפצת החסידות.' },
  { hebrewMonthName: 'Kislev',   hebrewDay: 14, name: 'יום נישואי הרבי והרבנית',       description: 'יום נישואיהם של הרבי והרבנית חיה מושקא בשנת תרפ"ט.' },
  { hebrewMonthName: 'Kislev',   hebrewDay: 19, name: 'חג הגאולה י"ט כסלו',            description: 'יום שחרורו של אדמו"ר הזקן מהמאסר בשנת תקנ"ט; נחשב לראש השנה לחסידות.' },
  { hebrewMonthName: 'Kislev',   hebrewDay: 20, name: "חג הגאולה כ' כסלו",             description: 'המשך חגיגות גאולת אדמו"ר הזקן.' },
  { hebrewMonthName: 'Tevet',    hebrewDay: 5,  name: 'דידן נצח',                       description: 'יום ניצחון המשפט על ספרי חב"ד שנקבע כי הם שייכים לחסידים ולא לאדם פרטי.' },
  { hebrewMonthName: 'Tevet',    hebrewDay: 24, name: 'הילולת אדמו"ר הזקן',            description: 'יום פטירת רבי שניאור זלמן מלאדי, מייסד חסידות חב"ד ובעל ספר התניא.' },
  { hebrewMonthName: 'Shevat',   hebrewDay: 10, name: 'הילולת אדמו"ר הריי"צ',          description: 'יום פטירת רבי יוסף יצחק שניאורסון, האדמו"ר השישי מחב"ד.' },
  { hebrewMonthName: 'Shevat',   hebrewDay: 11, name: 'קבלת נשיאות הרבי',              description: 'יום שבו קיבל הרבי את הנהגת חסידות חב"ד בשנת תשי"א.' },
  { hebrewMonthName: 'Shevat',   hebrewDay: 22, name: 'הילולת הרבנית חיה מושקא',       description: 'יום פטירת הרבנית חיה מושקא שניאורסון, רעייתו של הרבי.' },
  // כ"ה אדר - non-leap year
  { hebrewMonthName: 'Adar',     hebrewDay: 25, name: 'יום הולדת הרבנית חיה מושקא',    description: 'יום הולדת הרבנית חיה מושקא שניאורסון.' },
  // כ"ה אדר ב' - leap year
  { hebrewMonthName: 'Adar II',  hebrewDay: 25, name: 'יום הולדת הרבנית חיה מושקא',    description: 'יום הולדת הרבנית חיה מושקא שניאורסון (שנת עיבור).' },
  { hebrewMonthName: 'Nisan',    hebrewDay: 2,  name: 'הילולת אדמו"ר הרש"ב',           description: 'יום פטירת רבי שלום דובער שניאורסון, האדמו"ר החמישי מחב"ד.' },
  { hebrewMonthName: 'Nisan',    hebrewDay: 11, name: 'יום הולדת הרבי',                description: 'יום הולדת הרבי מליובאוויטש, רבי מנחם מנדל שניאורסון.' },
  { hebrewMonthName: 'Nisan',    hebrewDay: 13, name: 'הילולת אדמו"ר הצמח צדק',        description: 'יום פטירת רבי מנחם מנדל שניאורסון (הצמח צדק), האדמו"ר השלישי מחב"ד.' },
  { hebrewMonthName: 'Iyar',     hebrewDay: 2,  name: 'יום הולדת אדמו"ר המהר"ש',       description: 'יום הולדת רבי שמואל שניאורסון, האדמו"ר הרביעי מחב"ד.' },
  { hebrewMonthName: 'Iyar',     hebrewDay: 14, name: 'פסח שני',                        description: 'יום שבו מי שלא הקריב קרבן פסח בזמנו יכול להשלים אותו; מסמל שאין דבר אבוד.' },
  { hebrewMonthName: 'Iyar',     hebrewDay: 18, name: 'ל"ג בעומר - הילולת רשב"י',      description: 'יום פטירת רבי שמעון בר יוחאי ומועד שמחה גדול הקשור לגילוי תורת הסוד.' },
  { hebrewMonthName: 'Sivan',    hebrewDay: 28, name: 'הצלת הרבי והרבנית לארה"ב',      description: 'יום הגעתם של הרבי והרבנית לארצות הברית בשנת תש"א לאחר בריחה מאירופה בזמן השואה.' },
  { hebrewMonthName: 'Tamuz',    hebrewDay: 3,  name: 'יום הילולת הרבי',               description: 'יום פטירת הרבי מליובאוויטש בשנת תשנ"ד.' },
  { hebrewMonthName: 'Tamuz',    hebrewDay: 12, name: 'חג הגאולה אדמו"ר הריי"צ',       description: 'יום שחרורו של אדמו"ר הריי"צ ממאסר הסובייטים על פעילותו להפצת יהדות.' },
  { hebrewMonthName: 'Tamuz',    hebrewDay: 13, name: 'חג הגאולה י"ג תמוז',            description: 'המשך חגיגות גאולת אדמו"ר הריי"צ.' },
  { hebrewMonthName: 'Av',       hebrewDay: 20, name: 'הילולת רבי לוי יצחק',           description: 'יום פטירת רבי לוי יצחק שניאורסון בגלות בקזחסטן.' },
  { hebrewMonthName: 'Elul',     hebrewDay: 18, name: 'ח"י אלול - הבעש"ט ואדה"ז',      description: 'יום הולדת הבעל שם טוב מייסד החסידות ואדמו"ר הזקן מייסד חסידות חב"ד.' },
];

function getHashidicEventForDate(date: Date): HasidicEvent | null {
  // Use 'en-u-ca-hebrew' to get English month name — works correctly in both regular and leap years
  const parts = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long' }).formatToParts(date);
  const dayStr = parts.find(p => p.type === 'day')?.value ?? '0';
  const monthName = parts.find(p => p.type === 'month')?.value ?? '';
  const day = parseInt(dayStr, 10);
  return HASIDIC_EVENTS.find(e => e.hebrewMonthName === monthName && e.hebrewDay === day) ?? null;
}

const isWeekend = (date: Date) => { const d = date.getDay(); return d === 5 || d === 6; };

interface CustomVacation { id: string; startDate: string; endDate: string; name: string; }
interface Note { id: string; text: string; type: 'note' | 'task'; reminderTime?: string; reminderEnabled: boolean; }
interface DayExtras { vacation?: boolean; notes: Note[]; }

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}


// ---- Confetti ----
interface ConfettiPiece { id: number; x: number; size: number; color: string; rotation: number; duration: number; delay: number; shape: 'circle' | 'rect' | 'star'; }
const CONFETTI_COLORS = ['#f06292','#ba68c8','#64b5f6','#4db6ac','#fff176','#ffb74d','#a5d6a7','#ff8a65'];

function ConfettiCanvas() {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
  useEffect(() => {
    const newPieces: ConfettiPiece[] = Array.from({ length: 120 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 10 + 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      duration: Math.random() * 2 + 2.5,
      delay: Math.random() * 2,
      shape: (['circle','rect','star'] as const)[Math.floor(Math.random() * 3)],
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: '110vh', opacity: [1, 1, 0], rotate: p.rotation + 720, scale: [1, 1, 0.5] }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn', repeat: Infinity, repeatDelay: Math.random() * 3 }}
          style={{ position: 'fixed', top: 0, left: 0, width: p.size, height: p.size, backgroundColor: p.shape !== 'star' ? p.color : 'transparent', borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : '0', color: p.color, fontSize: p.size, lineHeight: 1 }}
        >
          {p.shape === 'star' ? '★' : null}
        </motion.div>
      ))}
    </div>
  );
}

function CelebrationModal({ targetDate, theme, onClose }: { targetDate: Date; theme: Theme; onClose: () => void }) {
  return (
    <>
      <ConfettiCanvas />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          className="w-full max-w-sm bg-white rounded-[3rem] shadow-2xl overflow-hidden text-center"
          onClick={e => e.stopPropagation()}
        >
          <div className={`bg-gradient-to-br ${theme.headerGradient} pt-10 pb-8 px-6 relative overflow-hidden`}>
            <div className="absolute inset-0 opacity-20">
              {[...Array(6)].map((_, i) => (
                <motion.div key={i} className="absolute text-white text-4xl"
                  style={{ left: `${10 + i * 16}%`, top: `${10 + (i % 3) * 30}%` }}
                  animate={{ y: [0, -10, 0], rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
                >✨</motion.div>
              ))}
            </div>
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="text-7xl mb-4 relative z-10"
            >🎉</motion.div>
            <h2 className="text-white font-black text-2xl leading-tight relative z-10">
              יום האחרון בעבודה!<br />
              <span className="text-3xl">מזל טוב! 🥳</span>
            </h2>
          </div>
          <div className="p-7 space-y-4">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-gray-600 font-bold text-base leading-relaxed"
            >
              הגעת! 🌸<br />
              היום, {targetDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })},<br />
              מתחילה ההרפתקה הכי יפה בחיים ✨
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex justify-center gap-3 text-3xl"
            >
              {['👶','🍼','💕','🌟','🎊'].map((e, i) => (
                <motion.span key={i}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                >{e}</motion.span>
              ))}
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className={`w-full py-4 bg-gradient-to-r ${theme.gradient} text-white font-black rounded-2xl text-lg shadow-lg`}
            >
              בשעה טובה ומוצלחת! 💖
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

function getHolidayForDate(date: Date, customVacations: CustomVacation[]): { name: string; type: string } | null {
  const h = HOLIDAYS.find(hol => date >= hol.start && date <= hol.end);
  if (h) return { name: h.name, type: h.type };
  for (const cv of customVacations) {
    if (!cv.startDate || !cv.endDate) continue;
    const s = new Date(cv.startDate + 'T00:00:00');
    const e = new Date(cv.endDate + 'T00:00:00');
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    if (d >= s && d <= e) return { name: cv.name || 'חופשה אישית', type: 'custom' };
  }
  return null;
}

function checkIsWorkday(date: Date, customVacations: CustomVacation[], dayExtras: Record<string, DayExtras>): boolean {
  const key = dateKey(date);
  if (dayExtras[key]?.vacation) return false;
  return !isWeekend(date) && !getHolidayForDate(date, customVacations);
}

const dayToHebrewLetters = (day: number): string => {
  const units = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל"];
  if (day === 15) return "טו"; if (day === 16) return "טז";
  return tens[Math.floor(day / 10)] + units[day % 10];
};

const getHebrewDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { day: 'numeric', month: 'short' }).formatToParts(date);
  const dayPart = parts.find(p => p.type === 'day')?.value;
  const monthPart = parts.find(p => p.type === 'month')?.value;
  if (dayPart && monthPart) return `${dayToHebrewLetters(parseInt(dayPart, 10))} ${monthPart}`;
  return "";
};

const getMonthName = (date: Date) => new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(date);

const getHebrewMonthsForGregorianMonth = (days: DayData[]) => {
  const months = new Set<string>();
  days.forEach(day => {
    const parts = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', { month: 'long' }).formatToParts(day.date);
    const month = parts.find(p => p.type === 'month')?.value;
    if (month) months.add(month);
  });
  return Array.from(months).join(' - ');
};

interface DayData {
  date: Date; isWorkday: boolean; isWeekend: boolean;
  holidayInfo: { name: string; type: string } | null;
  hasidicEvent: HasidicEvent | null;
  isToday: boolean; hebrewDate: string; dayOfMonth: number;
  countdown: number | null; isVacation: boolean;
}

interface Theme {
  id: string; name: string; bg: string; primary: string; secondary: string;
  accent: string; cardBg: string; cardBorder: string; gradient: string;
  headerGradient: string; progressGradient: string; iconColor: string;
  buttonBg: string; buttonText: string; hasidicDot: string; notesDot: string;
}

const THEMES: Theme[] = [
  { id: 'pink',   name: 'ורוד קלאסי', bg: 'bg-[#fff5f7]', primary: 'text-[#d81b60]', secondary: 'text-pink-400',   accent: 'bg-pink-100',    cardBg: 'bg-pink-50',      cardBorder: 'border-pink-100',   gradient: 'from-pink-500 to-purple-500',     headerGradient: 'from-[#d81b60] to-[#ec407a]',   progressGradient: 'from-pink-400 via-purple-400 to-blue-400',       iconColor: 'text-pink-500',   buttonBg: 'bg-pink-100',   buttonText: 'text-[#d81b60]',  hasidicDot: 'border-[#b39ddb]', notesDot: 'border-[#ba68c8]' },
  { id: 'blue',   name: 'כחול שמיים', bg: 'bg-[#f0f7ff]', primary: 'text-[#5c92d1]', secondary: 'text-blue-300',   accent: 'bg-blue-50',     cardBg: 'bg-blue-50/50',   cardBorder: 'border-blue-100',   gradient: 'from-blue-400 to-indigo-300',     headerGradient: 'from-[#5c92d1] to-[#8eb9eb]',   progressGradient: 'from-blue-300 via-indigo-200 to-purple-200',     iconColor: 'text-blue-400',   buttonBg: 'bg-blue-50',    buttonText: 'text-[#5c92d1]',  hasidicDot: 'border-[#90caf9]', notesDot: 'border-[#5c6bc0]' },
  { id: 'green',  name: 'ירוק טבע',   bg: 'bg-[#f2fcf5]', primary: 'text-[#6db388]', secondary: 'text-green-300',  accent: 'bg-green-50',    cardBg: 'bg-green-50/50',  cardBorder: 'border-green-100',  gradient: 'from-green-400 to-teal-300',      headerGradient: 'from-[#6db388] to-[#a3d9b9]',   progressGradient: 'from-green-300 via-teal-200 to-emerald-200',     iconColor: 'text-green-400',  buttonBg: 'bg-green-50',   buttonText: 'text-[#6db388]',  hasidicDot: 'border-[#80cbc4]', notesDot: 'border-[#26a69a]' },
  { id: 'sunset', name: 'שקיעה רכה', bg: 'bg-[#fffaf5]', primary: 'text-[#e59a7d]', secondary: 'text-orange-300', accent: 'bg-orange-50',   cardBg: 'bg-orange-50/50', cardBorder: 'border-orange-100', gradient: 'from-orange-300 to-rose-300',     headerGradient: 'from-[#e59a7d] to-[#ffc4ae]',   progressGradient: 'from-orange-200 via-rose-200 to-pink-200',       iconColor: 'text-orange-400', buttonBg: 'bg-orange-50',  buttonText: 'text-[#e59a7d]',  hasidicDot: 'border-[#ffcc80]', notesDot: 'border-[#e57373]' },
];

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

async function getCustomSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    // חפש את ה-SW המותאם שלנו
    const custom = regs.find(r => r.scope && (r.active || r.waiting || r.installing));
    if (custom) return custom;
    // אם לא נמצא — רשום מחדש
    const reg = await navigator.serviceWorker.register('/sw-custom.js', { scope: '/' });
    await new Promise(resolve => setTimeout(resolve, 500)); // המתן להפעלה
    return reg;
  } catch { return null; }
}

async function showNotification(title: string, body: string, tag?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  // נסה Notification ישירה — עובד על מחשב
  try {
    new Notification(title, { body, icon: '/icon.svg', tag });
    return;
  } catch { /* אנדרואיד לא תומך — נמשיך לSW */ }
  // אנדרואיד Chrome — חייב SW
  const reg = await getCustomSW();
  if (reg) {
    try {
      await reg.showNotification(title, { body, icon: '/icon.svg', tag });
    } catch(e) { console.warn('SW notification failed:', e); }
  }
}

async function scheduleReminder(note: Note, key: string) {
  if (!note.reminderEnabled || !note.reminderTime) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const [h, m] = note.reminderTime.split(':').map(Number);
  const fireAt = new Date(`${key}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
  const delay = fireAt.getTime() - Date.now();
  if (delay <= 0) return;

  const typeLabel = note.type === 'task' ? '✅ משימה' : '📝 הערה';
  const [year, month, day] = key.split('-');
  const dateLabel = `${day}/${month}/${year}`;
  const title = `${typeLabel} — ${dateLabel}`;

  // נסה לשלוח ל-SW (שורד סגירת הדפדפן)
  const reg = await getCustomSW();
  if (reg?.active) {
    reg.active.postMessage({
      type: 'SCHEDULE_REMINDER',
      payload: { noteId: note.id, title, body: note.text, fireAt: fireAt.toISOString() },
    });
    return;
  }

  // fallback — setTimeout (עובד רק כשהדפדפן פתוח)
  setTimeout(() => {
    showNotification(title, note.text, note.id);
  }, delay);
}

export default function App() {
  const [today] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const [targetDate, setTargetDate] = useState<Date>(() => { const s = localStorage.getItem('mat_target'); return s ? new Date(s) : DEFAULT_TARGET_DATE; });
  const [startDate, setStartDate] = useState<Date>(() => {
    const s = localStorage.getItem('mat_start');
    if (s) return new Date(s);
    const d = new Date(2026, 2, 9); d.setHours(0, 0, 0, 0); localStorage.setItem('mat_start', d.toISOString()); return d;
  });
  const [theme, setTheme] = useState<Theme>(() => { const s = localStorage.getItem('mat_theme'); return THEMES.find(t => t.id === s) || THEMES[0]; });
  const [customVacations, setCustomVacations] = useState<CustomVacation[]>(() => { const s = localStorage.getItem('mat_vacations'); return s ? JSON.parse(s) : []; });
  const [dayExtras, setDayExtras] = useState<Record<string, DayExtras>>(() => {
    const s = localStorage.getItem('mat_day_extras');
    if (!s) return {};
    const data = JSON.parse(s) as Record<string, DayExtras>;
    // תיקון notes ישנות שנשמרו לפני הוספת שדה type
    Object.values(data).forEach(extras => {
      extras.notes = (extras.notes || []).map(n => ({ ...n, type: n.type ?? 'note' }));
    });
    return data;
  });
  const [weeklyNotifEnabled, setWeeklyNotifEnabled] = useState(() => localStorage.getItem('mat_weekly_notif') === 'true');
  const [notifPermission, setNotifPermission] = useState<string>(() => 'Notification' in window ? Notification.permission : 'denied');
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationFiredRef = useRef(false);

  const [newVacStart, setNewVacStart] = useState('');
  const [newVacEnd, setNewVacEnd] = useState('');
  const [newVacName, setNewVacName] = useState('');

  useEffect(() => { localStorage.setItem('mat_target', targetDate.toISOString()); }, [targetDate]);
  useEffect(() => { localStorage.setItem('mat_start', startDate.toISOString()); }, [startDate]);
  useEffect(() => { localStorage.setItem('mat_theme', theme.id); }, [theme]);
  useEffect(() => { localStorage.setItem('mat_vacations', JSON.stringify(customVacations)); }, [customVacations]);
  useEffect(() => { localStorage.setItem('mat_day_extras', JSON.stringify(dayExtras)); }, [dayExtras]);
  useEffect(() => { localStorage.setItem('mat_weekly_notif', String(weeklyNotifEnabled)); }, [weeklyNotifEnabled]);

  // שחזור תזכורות שמורות בכל טעינה של האפליקציה
  useEffect(() => {
    if (Notification.permission !== 'granted') return;
    Object.entries(dayExtras).forEach(([key, extras]) => {
      (extras.notes || []).forEach(note => {
        if (note.reminderEnabled && note.reminderTime) {
          scheduleReminder(note, key);
        }
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // רץ פעם אחת בלבד בהפעלה

  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); setIsInstallable(true); };
    const i = () => {
      // בדוק שהאפליקציה באמת רצה כ-standalone לפני שמסתירים את הכפתור
      if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
        setIsInstallable(false); setDeferredPrompt(null);
      }
    };
    window.addEventListener('beforeinstallprompt', h);
    window.addEventListener('appinstalled', i);
    // הסתר כפתור רק אם כבר מותקן כ-standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) setIsInstallable(false);
    return () => { window.removeEventListener('beforeinstallprompt', h); window.removeEventListener('appinstalled', i); };
  }, []);

  useEffect(() => {
    if (!weeklyNotifEnabled) return;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(now); nextSunday.setDate(now.getDate() + daysUntilSunday); nextSunday.setHours(8, 0, 0, 0);
    const delay = nextSunday.getTime() - now.getTime();
    const remaining = Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / 86400000));
    const total = Math.ceil((targetDate.getTime() - startDate.getTime()) / 86400000);
    const passed = total - remaining;
    const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
    const timer = setTimeout(() => {
      showNotification('📅 תזכורת שבועית — ספירה לאחור', `עוד ${remaining} ימים לחופשה! עברו ${pct}% מהמסע.`, 'weekly');
    }, delay);
    return () => clearTimeout(timer);
  }, [weeklyNotifEnabled, targetDate, startDate]);

  // 🎉 Trigger celebration on the last day
  useEffect(() => {
    if (celebrationFiredRef.current) return;
    const isLastDay = today.toDateString() === targetDate.toDateString();
    if (!isLastDay) return;
    celebrationFiredRef.current = true;

    // Show celebration modal after short delay
    const t = setTimeout(() => setShowCelebration(true), 800);

    // Send push notification if allowed
    showNotification('🎉 היום הגדול הגיע!', 'מזל טוב! היום יום האחרון בעבודה — מתחילה ההרפתקה הכי יפה! 🍼💕', 'celebration');

    return () => clearTimeout(t);
  }, [today, targetDate]);

  const handleManualInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  const { months, stats, progress } = useMemo(() => {
    const allDays: DayData[] = [];
    const calStart = new Date(startDate); calStart.setDate(1); calStart.setHours(0, 0, 0, 0);
    let cur = new Date(calStart);
    while (cur <= targetDate) {
      const key = dateKey(cur);
      const extras = dayExtras[key] || { notes: [] };
      const holidayInfo = getHolidayForDate(cur, customVacations);
      const hasidicEvent = getHashidicEventForDate(cur);
      const isVacation = !!extras.vacation;
      const workday = checkIsWorkday(cur, customVacations, dayExtras) && cur >= startDate;
      allDays.push({
        date: new Date(cur), isWorkday: workday, isWeekend: isWeekend(cur),
        holidayInfo, hasidicEvent,
        isToday: cur.toDateString() === today.toDateString(),
        hebrewDate: getHebrewDate(cur), dayOfMonth: cur.getDate(), countdown: null, isVacation,
      });
      cur.setDate(cur.getDate() + 1);
    }
    const futureWork = allDays.filter(d => d.isWorkday && d.date >= today);
    let wc = 0;
    allDays.forEach(d => { if (d.isWorkday && d.date >= today) { d.countdown = futureWork.length - wc; wc++; } });
    const grouped: { [k: string]: DayData[] } = {};
    allDays.forEach(d => { const k = getMonthName(d.date); if (!grouped[k]) grouped[k] = []; grouped[k].push(d); });
    const stats = {
      remainingWorkdays: futureWork.length,
      calendarDays: Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / 86400000)),
      holidayDays: allDays.filter(d => (d.holidayInfo || d.isVacation) && d.date >= today).length,
    };
    const total = allDays.filter(d => d.isWorkday && d.date >= startDate).length;
    const done = allDays.filter(d => d.isWorkday && d.date >= startDate && d.date < today).length;
    return { months: grouped, stats, progress: total > 0 ? (done / total) * 100 : 0 };
  }, [targetDate, startDate, today, customVacations, dayExtras]);

  const toggleVacation = useCallback((key: string) => {
    setDayExtras(prev => { const cur = prev[key] || { notes: [] }; return { ...prev, [key]: { ...cur, vacation: !cur.vacation } }; });
    setSelectedDay(prev => prev ? { ...prev, isVacation: !prev.isVacation } : prev);
  }, []);

  const addNote = useCallback((key: string, text: string, type: 'note' | 'task', reminderTime: string, reminderEnabled: boolean) => {
    const note: Note = { id: Date.now().toString(), text, type, reminderTime, reminderEnabled };
    setDayExtras(prev => { const cur = prev[key] || { notes: [] }; return { ...prev, [key]: { ...cur, notes: [...cur.notes, note] } }; });
    if (reminderEnabled) scheduleReminder(note, key);
  }, []);

  const deleteNote = useCallback(async (key: string, noteId: string) => {
    setDayExtras(prev => { const cur = prev[key] || { notes: [] }; return { ...prev, [key]: { ...cur, notes: cur.notes.filter(n => n.id !== noteId) } }; });
    // בטל תזכורת ב-SW אם קיימת
    const reg = await getCustomSW();
    reg?.active?.postMessage({ type: 'CANCEL_REMINDER', payload: { noteId } });
  }, []);

  const editNote = useCallback(async (key: string, noteId: string, text: string, type: 'note' | 'task', reminderTime: string, reminderEnabled: boolean) => {
    setDayExtras(prev => {
      const cur = prev[key] || { notes: [] };
      const updated = cur.notes.map(n => n.id === noteId ? { ...n, text, type, reminderTime, reminderEnabled } : n);
      return { ...prev, [key]: { ...cur, notes: updated } };
    });
    // בטל תזכורת ישנה תמיד, ואז קבע מחדש אם צריך
    const reg = await getCustomSW();
    reg?.active?.postMessage({ type: 'CANCEL_REMINDER', payload: { noteId } });
    if (reminderEnabled) {
      const note: Note = { id: noteId, text, type, reminderTime, reminderEnabled };
      scheduleReminder(note, key);
    }
  }, []);

  const addVacationRange = () => {
    if (!newVacStart || !newVacEnd) return;
    setCustomVacations(prev => [...prev, { id: Date.now().toString(), startDate: newVacStart, endDate: newVacEnd, name: newVacName || 'חופשה אישית' }]);
    setNewVacStart(''); setNewVacEnd(''); setNewVacName('');
  };

  const enableWeeklyNotif = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(Notification.permission);
    if (granted) setWeeklyNotifEnabled(true);
  };

  return (
    <div className={`min-h-screen ${theme.bg} text-[#333] font-sans pb-20 selection:bg-pink-100 overflow-x-hidden`} dir="rtl">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className={`absolute -top-20 -left-20 ${theme.secondary} opacity-30`}><Sparkles size={200} /></motion.div>
        <motion.div animate={{ y: [0, -20, 0] }} transition={{ duration: 5, repeat: Infinity }} className={`absolute top-1/4 -right-10 ${theme.secondary} opacity-30`}><Heart size={150} /></motion.div>
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 4, repeat: Infinity }} className={`absolute bottom-1/4 -left-10 ${theme.secondary} opacity-30`}><Star size={180} /></motion.div>
      </div>

      <div className={`max-w-md mx-auto bg-white min-h-screen shadow-2xl overflow-hidden relative border-x ${theme.cardBorder}`}>
        <div className={`pt-14 pb-8 px-6 text-center bg-gradient-to-b ${theme.cardBg} to-white relative`}>
          <div className="absolute top-6 left-6 flex gap-2">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setShowSettings(true)} className={`w-10 h-10 bg-white rounded-full shadow-md border ${theme.cardBorder} flex items-center justify-center ${theme.iconColor}`}><Settings size={20} /></motion.button>
          </div>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex justify-center items-center gap-3 mb-4">
            <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}><Baby className="w-10 h-10 text-blue-400" /></motion.div>
            <h1 className={`text-3xl font-black ${theme.primary} tracking-tight leading-tight`}>חגיגת ספירה לאחור <br /> לחופשת לידה!</h1>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}><PartyPopper className="w-10 h-10 text-orange-400" /></motion.div>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className={`inline-block px-6 py-2.5 bg-white rounded-full shadow-md border ${theme.cardBorder}`}>
            <p className={`${theme.primary} font-black text-sm flex items-center gap-2`}><Sparkles size={16} className="text-yellow-400" />יום אחרון בעבודה: {targetDate.toLocaleDateString('he-IL')}<Sparkles size={16} className="text-yellow-400" /></p>
          </motion.div>
        </div>

        <AnimatePresence>
          {showCelebration && (
            <CelebrationModal
              targetDate={targetDate}
              theme={theme}
              onClose={() => setShowCelebration(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className={`p-6 border-b ${theme.cardBorder} flex justify-between items-center ${theme.cardBg}`}>
                  <h3 className={`text-xl font-black ${theme.primary} flex items-center gap-2`}><Settings size={20} /> הגדרות</h3>
                  <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                </div>
                <div className="p-6 space-y-7 max-h-[75vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Sparkles size={14} className={theme.iconColor} /> פלטת צבעים</label>
                    <div className="grid grid-cols-2 gap-2">
                      {THEMES.map(t => (
                        <button key={t.id} onClick={() => setTheme(t)} className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${theme.id === t.id ? `${t.cardBorder} ${t.cardBg}` : 'border-gray-50 hover:border-gray-100'}`}>
                          <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${t.gradient}`} />
                          <span className={`text-xs font-black ${theme.id === t.id ? t.primary : 'text-gray-500'}`}>{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14} className="text-blue-400" /> תאריכים</label>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 font-bold">תחילת ספירה</p>
                      <input type="date" value={startDate.toISOString().split('T')[0]} onChange={e => setStartDate(new Date(e.target.value))} className="w-full p-3 bg-blue-50 border-2 border-blue-100 rounded-xl font-black text-blue-600 focus:outline-none" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400 font-bold">יציאה לחופשה</p>
                      <input type="date" value={targetDate.toISOString().split('T')[0]} onChange={e => setTargetDate(new Date(e.target.value))} className="w-full p-3 bg-pink-50 border-2 border-pink-100 rounded-xl font-black text-[#d81b60] focus:outline-none" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Gift size={14} /> חופשות אישיות</label>
                    <div className="space-y-2 max-h-36 overflow-y-auto">
                      {customVacations.map(vac => (
                        <div key={vac.id} className={`flex items-center justify-between ${theme.cardBg} p-3 rounded-xl border ${theme.cardBorder}`}>
                          <div><p className={`text-xs font-black ${theme.primary}`}>{vac.name}</p><p className="text-[10px] text-gray-400">{vac.startDate} → {vac.endDate}</p></div>
                          <button onClick={() => setCustomVacations(prev => prev.filter(v => v.id !== vac.id))} className="text-red-300 hover:text-red-500"><Trash2 size={15} /></button>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 bg-gray-50 p-3 rounded-xl">
                      <input type="text" value={newVacName} onChange={e => setNewVacName(e.target.value)} placeholder="שם החופשה" className={`w-full p-2 bg-white border ${theme.cardBorder} rounded-lg text-xs font-bold focus:outline-none`} />
                      <div className="grid grid-cols-2 gap-2">
                        <div><p className="text-[10px] text-gray-400 mb-1">מ-</p><input type="date" value={newVacStart} onChange={e => setNewVacStart(e.target.value)} className={`w-full p-2 bg-white border ${theme.cardBorder} rounded-lg text-xs font-bold focus:outline-none`} /></div>
                        <div><p className="text-[10px] text-gray-400 mb-1">עד</p><input type="date" value={newVacEnd} onChange={e => setNewVacEnd(e.target.value)} className={`w-full p-2 bg-white border ${theme.cardBorder} rounded-lg text-xs font-bold focus:outline-none`} /></div>
                      </div>
                      <button onClick={addVacationRange} className={`w-full py-2 ${theme.buttonBg} ${theme.buttonText} font-black rounded-xl text-xs hover:opacity-80 flex items-center justify-center gap-1`}><Plus size={14} /> הוסף טווח חופשה</button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Bell size={14} /> התראות</label>
                    <div className={`${theme.cardBg} rounded-xl p-4 border ${theme.cardBorder} space-y-3`}>
                      <div className="flex items-center justify-between">
                        <div><p className="text-xs font-black text-gray-700">התראה שבועית</p><p className="text-[10px] text-gray-400">כל ראשון - כמה ימים נשאר + אחוז התקדמות</p></div>
                        <button onClick={weeklyNotifEnabled ? () => setWeeklyNotifEnabled(false) : enableWeeklyNotif} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${weeklyNotifEnabled ? 'bg-green-100 text-green-700' : `${theme.buttonBg} ${theme.buttonText}`}`}>{weeklyNotifEnabled ? '✓ פעיל' : 'הפעל'}</button>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                        <div><p className="text-xs font-black text-gray-700">🎉 התראת יום אחרון</p><p className="text-[10px] text-gray-400">קונפטי + הודעה ביום היציאה לחופשה</p></div>
                        <button onClick={() => { setShowSettings(false); setShowCelebration(true); }} className={`px-3 py-1.5 rounded-lg text-xs font-black ${theme.buttonBg} ${theme.buttonText}`}>תצוגה מקדימה</button>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                        <div><p className="text-xs font-black text-gray-700">🔔 בדיקת התראה</p><p className="text-[10px] text-gray-400">שלח התראה עכשיו לבדיקה</p></div>
                        <button onClick={async () => {
                          const granted = await requestNotificationPermission();
                          setNotifPermission(Notification.permission);
                          if (!granted) { alert('❌ הרשאה לא ניתנה'); return; }
                          try {
                            await showNotification('🔔 בדיקה', 'התראות עובדות! ✅', 'test');
                            alert('✅ התראה נשלחה! בדוק אם הופיעה');
                          } catch(e) { alert('❌ שגיאה: ' + String(e)); }
                        }} className={`px-3 py-1.5 rounded-lg text-xs font-black ${theme.buttonBg} ${theme.buttonText}`}>שלח עכשיו</button>
                      </div>
                      {notifPermission === 'denied' && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle size={12} /> הרשאות התראות חסומות בדפדפן</p>}
                    </div>
                  </div>
                  {isInstallable && (
                    <div className="space-y-3">
                      <label className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Download size={14} /> אפליקציה</label>
                      <motion.button
                        onClick={handleManualInstall}
                        whileTap={{ scale: 0.97 }}
                        whileHover={{ scale: 1.02 }}
                        className={`w-full p-4 bg-gradient-to-r ${theme.gradient} text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-3 relative overflow-hidden`}
                      >
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Download size={20} />
                        </motion.div>
                        <span>התקנת האפליקציה על המכשיר</span>
                        <span className="text-xs opacity-75 font-normal">גישה מהירה ⚡</span>
                      </motion.button>
                      <p className="text-[10px] text-gray-400 text-center">הכפתור ייעלם אוטומטית לאחר ההתקנה</p>
                    </div>
                  )}
                  <div className="pt-2 text-center"><button onClick={() => setShowSettings(false)} className={`${theme.secondary} font-black text-sm hover:underline`}>סגור וחזור לספירה</button></div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedDay && (
            <DayModal day={selectedDay} theme={theme}
              dayExtras={dayExtras[dateKey(selectedDay.date)] || { notes: [] }}
              onClose={() => setSelectedDay(null)}
              onToggleVacation={() => toggleVacation(dateKey(selectedDay.date))}
              onAddNote={(text, type, time, enabled) => addNote(dateKey(selectedDay.date), text, type, time, enabled)}
              onEditNote={(id, text, type, time, enabled) => editNote(dateKey(selectedDay.date), id, text, type, time, enabled)}
              onDeleteNote={(id) => deleteNote(dateKey(selectedDay.date), id)} />
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-3 px-5 mb-10">
          <StatBox label="ימי עבודה נותרו" value={stats.remainingWorkdays} color="border-[#ffd54f]" textColor="text-[#fbc02d]" icon={<Milk size={14} />} theme={theme} />
          <StatBox label="ימים קלנדריים" value={stats.calendarDays} color="border-[#64b5f6]" textColor="text-[#1e88e5]" icon={<Star size={14} />} theme={theme} />
          <StatBox label="ימי חופשה/חג" value={stats.holidayDays} color="border-[#f06292]" textColor="text-[#d81b60]" icon={<Gift size={14} />} theme={theme} />
        </div>

        <AnimatePresence>
          {isInstallable && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="mx-5 mb-6"
            >
              <motion.button
                onClick={handleManualInstall}
                whileTap={{ scale: 0.97 }}
                className={`w-full py-3.5 px-5 bg-gradient-to-r ${theme.gradient} text-white font-black rounded-2xl shadow-lg flex items-center justify-between gap-3`}
              >
                <div className="flex items-center gap-2.5">
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                    <Download size={18} />
                  </motion.div>
                  <div className="text-right">
                    <p className="text-sm leading-none">התקנת האפליקציה</p>
                    <p className="text-[10px] opacity-75 font-normal mt-0.5">גישה מהירה מהמסך הראשי ⚡</p>
                  </div>
                </div>
                <span className="text-lg">📲</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap justify-center gap-3 px-5 mb-8 text-[10px] font-black">
          <LegendItem color="bg-[#fff9c4]" borderColor="border-[#ffd54f]" label="יום עבודה" theme={theme} />
          <LegendItem color="bg-[#fce4ec]" borderColor="border-[#f06292]" label="חופשה/חג" theme={theme} />
          <LegendItem color="bg-[#e3f2fd]" borderColor="border-[#64b5f6]" label="סופ״ש" theme={theme} />
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-[#43a047] rounded-full shadow-sm" /></div>
            <span className={`${theme.secondary} text-[10px] font-bold`}>אירוע חסידי</span>
          </div>
          <LegendItem color="bg-white" borderColor="border-[#4caf50]" label="היום" theme={theme} />
        </div>

        <div className="px-8 mb-12">
          <div className="flex justify-between items-end mb-3">
            <span className={`text-xs font-black ${theme.secondary} uppercase tracking-widest flex items-center gap-1`}><Heart size={12} fill="currentColor" /> התקדמות המסע</span>
            <span className={`text-xl font-black ${theme.primary}`}>{Math.round(progress)}%</span>
          </div>
          <div className={`relative h-6 w-full ${theme.cardBg} rounded-full shadow-inner border ${theme.cardBorder}`}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 2, ease: "circOut" }} className={`h-full bg-gradient-to-r ${theme.progressGradient} rounded-full relative`}>
              <div className="absolute top-0 right-0 bottom-0 w-full bg-[rgba(255,255,255,0.2)] animate-pulse" />
              <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2 }} className="absolute -left-4 -top-10 bg-white p-2 rounded-full shadow-xl border-2 border-pink-200 z-10">
                <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 1 }}><Baby className="w-6 h-6 text-blue-500" /></motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <div className="px-5 space-y-12">
          {(Object.entries(months) as [string, DayData[]][]).map(([name, days]) => (
            <motion.div key={name} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className={`bg-white rounded-[3rem] overflow-hidden shadow-xl border ${theme.cardBorder}`}>
              <div className={`bg-gradient-to-r ${theme.headerGradient} py-6 text-center relative overflow-hidden`}>
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"><Sparkles className="absolute -top-2 -left-2 text-white" size={40} /><Heart className="absolute -bottom-2 -right-2 text-white" size={40} /></div>
                <div className="relative z-10">
                  <h2 className="font-black text-white text-2xl flex items-center justify-center gap-2 mb-1"><Sparkles size={20} />{name}<Sparkles size={20} /></h2>
                  <div className="inline-block px-4 py-1 bg-white/20 rounded-full text-white text-xs font-black">{getHebrewMonthsForGregorianMonth(days)}</div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-7 gap-1 mb-5 text-center text-[12px] font-black text-pink-200 uppercase">
                  {['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: days[0].date.getDay() }).map((_, i) => <div key={`pad-${i}`} className="aspect-square" />)}
                  {days.map(day => (
                    <DaySquare key={day.date.getTime()} day={day} targetDate={targetDate} theme={theme}
                      hasNotes={(dayExtras[dateKey(day.date)]?.notes?.length ?? 0) > 0}
                      onClick={() => setSelectedDay({ ...day, isVacation: !!(dayExtras[dateKey(day.date)]?.vacation) })} />
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className={`p-16 text-center ${theme.secondary} text-[11px] flex flex-col items-center justify-center gap-4 font-black`}>
          <div className="flex items-center gap-2"><Info className="w-4 h-4" /><span>הנתונים מחושבים לפי ימי עבודה בפועל • 2026 • בשעה טובה!</span></div>
        </div>
      </div>
    </div>
  );
}

function DayModal({ day, theme, dayExtras, onClose, onToggleVacation, onAddNote, onEditNote, onDeleteNote }: {
  day: DayData; theme: Theme; dayExtras: DayExtras;
  onClose: () => void; onToggleVacation: () => void;
  onAddNote: (text: string, type: 'note' | 'task', time: string, enabled: boolean) => void;
  onEditNote: (id: string, text: string, type: 'note' | 'task', time: string, enabled: boolean) => void;
  onDeleteNote: (id: string) => void;
}) {
  const [noteText, setNoteText] = useState('');
  const [noteTime, setNoteTime] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'task'>('note');
  const [noteReminder, setNoteReminder] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [notifGranted, setNotifGranted] = useState(() => 'Notification' in window && Notification.permission === 'granted');
  const isVacation = dayExtras.vacation ?? false;

  const openEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setNoteText(note.text);
    setNoteType(note.type ?? 'note');
    setNoteTime(note.reminderTime ?? '');
    setNoteReminder(note.reminderEnabled);
    setShowAddNote(true);
  };

  const handleSave = async () => {
    if (!noteText.trim()) return;
    if (noteReminder && !noteTime) { alert('יש לבחור שעה לתזכורת'); return; }
    if (noteReminder && !notifGranted) {
      const granted = await requestNotificationPermission();
      setNotifGranted(granted);
      if (!granted) { alert('לא ניתן לקבוע תזכורת ללא הרשאת התראות'); return; }
    }
    if (editingNoteId) {
      onEditNote(editingNoteId, noteText.trim(), noteType, noteTime, noteReminder);
    } else {
      onAddNote(noteText.trim(), noteType, noteTime, noteReminder);
    }
    setNoteText(''); setNoteTime(''); setNoteType('note'); setNoteReminder(false);
    setShowAddNote(false); setEditingNoteId(null);
  };

  const handleCloseForm = () => {
    setShowAddNote(false); setEditingNoteId(null);
    setNoteText(''); setNoteTime(''); setNoteType('note'); setNoteReminder(false);
  };

  const bgColor = isVacation ? 'bg-[#fce4ec]' : day.holidayInfo ? 'bg-[#fce4ec]' : day.hasidicEvent ? 'bg-[#e8f5e9]' : day.isWeekend ? 'bg-[#e3f2fd]' : day.isWorkday ? 'bg-[#fff9c4]' : 'bg-gray-50';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 300 }} className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className={`p-5 ${bgColor} border-b border-gray-100 flex justify-between items-start`}>
          <div>
            <p className={`text-xl font-black ${theme.primary}`}>{day.date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="text-sm text-gray-400 font-bold mt-0.5">{day.hebrewDate}</p>
            {day.holidayInfo && <span className="inline-block mt-1 px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-black rounded-full">{day.holidayInfo.name}</span>}
            {isVacation && !day.holidayInfo && <span className="inline-block mt-1 px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-black rounded-full">יום חופשה אישי</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1"><X size={22} /></button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4" style={{ scrollbarWidth: 'thin' }}>
          {day.hasidicEvent && (
            <div className="bg-[#e8f5e9] border border-[#a5d6a7] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2"><BookOpen size={16} className="text-green-600" /><p className="font-black text-green-800 text-sm">{day.hasidicEvent.name}</p></div>
              <p className="text-xs text-green-700 leading-relaxed">{day.hasidicEvent.description}</p>
            </div>
          )}
          {day.holidayInfo && (
            <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-pink-500" /><p className="font-black text-pink-800 text-sm">{day.holidayInfo.name}</p>
                <span className="text-[10px] bg-pink-200 text-pink-700 px-2 py-0.5 rounded-full">{day.holidayInfo.type === 'fast' ? 'צום' : day.holidayInfo.type === 'holiday' ? 'חג' : 'מועד'}</span>
              </div>
            </div>
          )}
          {!day.holidayInfo && (
            <button onClick={onToggleVacation} className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-colors border-2 ${isVacation ? 'bg-pink-50 border-pink-300 text-pink-700' : `${theme.buttonBg} ${theme.buttonText} border-transparent`}`}>
              {isVacation ? <><BellOff size={16} /> בטל יום חופשה</> : <><Gift size={16} /> סמן כיום חופשה</>}
            </button>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-black text-gray-600 text-sm flex items-center gap-1"><CheckSquare size={15} /> הערות ומשימות</p>
              <button onClick={() => showAddNote ? handleCloseForm() : setShowAddNote(true)} className={`text-xs font-black px-3 py-1 rounded-full ${theme.buttonBg} ${theme.buttonText} flex items-center gap-1`}>
                {showAddNote ? <><ChevronUp size={13} /> סגור</> : <><Plus size={13} /> הוסף</>}
              </button>
            </div>
            <AnimatePresence>
              {showAddNote && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`${theme.cardBg} rounded-2xl p-4 space-y-3 border ${theme.cardBorder} overflow-hidden`}>
                  <p className="text-xs font-black text-gray-500">{editingNoteId ? '✏️ עריכה' : '➕ הוספה חדשה'}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setNoteType('note')} className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border-2 transition-colors ${noteType === 'note' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                      📝 הערה
                    </button>
                    <button onClick={() => setNoteType('task')} className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border-2 transition-colors ${noteType === 'task' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-200 text-gray-400'}`}>
                      ✅ משימה
                    </button>
                  </div>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder={noteType === 'task' ? 'כתוב משימה...' : 'כתוב הערה...'} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none min-h-[70px]" />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-black text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={noteReminder} onChange={e => setNoteReminder(e.target.checked)} className="rounded" /><Bell size={12} /> תזכורת
                    </label>
                    {noteReminder && <input type="time" value={noteTime} onChange={e => setNoteTime(e.target.value)} className={`flex-1 p-2 border ${theme.cardBorder} rounded-xl text-xs font-bold focus:outline-none bg-white`} />}
                  </div>
                  <button onClick={handleSave} className={`w-full py-2 bg-gradient-to-r ${theme.gradient} text-white font-black rounded-xl text-sm`}>{editingNoteId ? 'עדכן' : 'שמור'}</button>
                </motion.div>
              )}
            </AnimatePresence>
            {(dayExtras.notes || []).length === 0 && !showAddNote && <p className="text-xs text-gray-300 text-center py-2">אין הערות עדיין</p>}
            {(dayExtras.notes || []).map(note => (
              <div key={note.id} className="bg-gray-50 rounded-xl p-3 flex items-start justify-between gap-2 border border-gray-100">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    {note.type === 'task'
                      ? <span className="text-[10px] font-black bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ משימה</span>
                      : <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📝 הערה</span>
                    }
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{note.text}</p>
                  {note.reminderEnabled && note.reminderTime && <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1"><Clock size={10} /> תזכורת: {note.reminderTime}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openEdit(note)} className="text-blue-300 hover:text-blue-500"><Pencil size={14} /></button>
                  <button onClick={() => onDeleteNote(note.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatBox({ label, value, color, textColor, icon, theme }: { label: string; value: number; color: string; textColor: string; icon: React.ReactNode; theme: Theme }) {
  return (
    <motion.div whileHover={{ y: -5, scale: 1.02 }} className={`bg-white border-2 ${color} rounded-[2rem] p-4 text-center shadow-[0_8px_20px_rgba(0,0,0,0.04)] relative overflow-hidden`}>
      <div className="absolute -top-1 -right-1 opacity-10 text-gray-400">{icon}</div>
      <div className={`text-3xl font-black ${textColor} leading-none mb-1.5`}>{value}</div>
      <div className="text-[10px] font-black text-gray-400 leading-tight uppercase tracking-tighter">{label}</div>
    </motion.div>
  );
}

function LegendItem({ color, borderColor, label, theme }: { color: string; borderColor: string; label: string; theme: Theme }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3.5 h-3.5 ${color} border-2 ${borderColor} rounded-md shadow-sm`} />
      <span className={`${theme.secondary} text-[10px] font-bold`}>{label}</span>
    </div>
  );
}

const DaySquare: React.FC<{ day: DayData; targetDate: Date; theme: Theme; hasNotes: boolean; onClick: () => void }> =
  ({ day, targetDate, theme, hasNotes, onClick }) => {
    let bgColor = "bg-white", borderColor = "border-gray-100";
    if (day.isVacation || day.holidayInfo) { bgColor = "bg-[#fce4ec]"; borderColor = "border-[#f06292]"; }
    else if (day.isWorkday) { bgColor = "bg-[#fff9c4]"; borderColor = "border-[#ffd54f]"; }
    else if (day.isWeekend) { bgColor = "bg-[#e3f2fd]"; borderColor = "border-[#64b5f6]"; }
    if (day.hasidicEvent && !day.holidayInfo && !day.isVacation) { bgColor = "bg-[#e8f5e9]"; borderColor = "border-[#66bb6a]"; }
    if (day.isToday) borderColor = "border-[#4caf50] border-[2px]";

    return (
      <div className={`relative aspect-square ${day.date > targetDate ? 'opacity-10 grayscale' : ''}`}>
        <button onClick={onClick} className={`w-full h-full rounded-xl border ${borderColor} ${bgColor} flex flex-col items-center justify-center p-0.5 relative overflow-hidden shadow-sm active:scale-95 transition-transform cursor-pointer`}>
          <div className={`flex flex-col items-center justify-center -space-y-0.5 w-full ${(day.holidayInfo || day.isVacation) ? 'mb-2' : ''} ${day.hasidicEvent ? 'pr-1.5' : ''}`}>
            <span className="text-[10px] font-bold text-gray-400 leading-tight">{day.dayOfMonth}</span>
            <span className={`text-[8px] font-medium ${theme.secondary} leading-tight truncate max-w-full px-0.5`}>{day.hebrewDate}</span>
            {day.countdown != null && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[12px] font-black text-[#fbc02d] leading-none mt-0.5">{day.countdown}</motion.span>
            )}
          </div>
          {/* Holiday / vacation banner at bottom */}
          {(day.holidayInfo || day.isVacation) && (
            <div className="absolute bottom-0 left-0 right-0 bg-[#f06292] text-white text-[5px] text-center py-0.5 font-black truncate px-0.5 leading-none">{day.holidayInfo?.name ?? 'חופשה'}</div>
          )}
          {day.isToday && <div className="absolute top-0.5 right-0.5"><Sparkles size={6} className="text-[#4caf50]" /></div>}
        </button>
        {/* Dots outside overflow-hidden — inset so they stay within the cell */}
        {day.hasidicEvent && (
          <div className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full border-2 ${theme.hasidicDot} opacity-75 pointer-events-none`} />
        )}
        {hasNotes && (
          <div className={`absolute right-1.5 w-1.5 h-1.5 rounded-full border-2 ${theme.notesDot} opacity-75 pointer-events-none ${(day.holidayInfo || day.isVacation) ? 'bottom-[11px]' : 'bottom-1.5'}`} />
        )}
      </div>
    );
  };
