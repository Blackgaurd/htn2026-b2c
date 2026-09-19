import { useState, useEffect, useRef } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen =
  | 'splash'
  | 'register'
  | 'login'
  | 'home'
  | 'detail'
  | 'rate-select'
  | 'rate-score'
  | 'compare'
  | 'compare-result'
  | 'rankings'

type GenderType = 'mens' | 'womens' | 'allgender' | 'accessible'
type WashroomPreference = 'mens' | 'womens' | 'allgender'

interface Bathroom {
  id: string
  building: 'E5' | 'E7'
  floor: number
  location: string
  gender: GenderType
  score: number | null
  bookmarked: boolean
  categories: {
    cleanliness: number
    accessibility: number
    hygiene: number
    privacy: number
    smell: number
  } | null
  friendRatings: { name: string; initials: string; score: number; color: string }[]
}

// ─── Data ────────────────────────────────────────────────────────────────────

const BATHROOMS: Bathroom[] = [
  {
    id: '1', building: 'E5', floor: 1, location: 'E5 1st Floor — Main Entrance, left of elevator',
    gender: 'allgender', score: 8.7, bookmarked: true,
    categories: { cleanliness: 8.5, accessibility: 9.2, hygiene: 8.0, privacy: 8.8, smell: 8.9 },
    friendRatings: [
      { name: 'Maya R.', initials: 'MR', score: 9.1, color: '#9B78D4' },
      { name: 'Jordan K.', initials: 'JK', score: 8.3, color: '#5B8FE8' },
    ],
  },
  {
    id: '2', building: 'E5', floor: 2, location: 'E5 2nd Floor — North Wing, beside lab 2114',
    gender: 'mens', score: 6.2, bookmarked: false,
    categories: { cleanliness: 5.8, accessibility: 6.5, hygiene: 6.0, privacy: 7.1, smell: 5.8 },
    friendRatings: [{ name: 'Sam L.', initials: 'SL', score: 6.5, color: '#5EC4A8' }],
  },
  {
    id: '3', building: 'E5', floor: 3, location: 'E5 3rd Floor — South Wing, across from 3009',
    gender: 'womens', score: 9.3, bookmarked: true,
    categories: { cleanliness: 9.6, accessibility: 9.0, hygiene: 9.4, privacy: 9.5, smell: 9.2 },
    friendRatings: [{ name: 'Priya M.', initials: 'PM', score: 9.4, color: '#E87DB8' }],
  },
  {
    id: '4', building: 'E5', floor: 4, location: 'E5 4th Floor — Central Hub',
    gender: 'accessible', score: null, bookmarked: false,
    categories: null, friendRatings: [],
  },
  {
    id: '5', building: 'E7', floor: 1, location: 'E7 1st Floor — Atrium, east side',
    gender: 'allgender', score: 7.8, bookmarked: false,
    categories: { cleanliness: 7.5, accessibility: 8.1, hygiene: 7.9, privacy: 7.4, smell: 7.9 },
    friendRatings: [
      { name: 'Alex T.', initials: 'AT', score: 8.0, color: '#F5A623' },
      { name: 'Jordan K.', initials: 'JK', score: 7.6, color: '#5B8FE8' },
    ],
  },
  {
    id: '6', building: 'E7', floor: 2, location: 'E7 2nd Floor — West Corridor, near 2107',
    gender: 'womens', score: 8.1, bookmarked: false,
    categories: { cleanliness: 8.3, accessibility: 7.9, hygiene: 8.2, privacy: 8.0, smell: 8.0 },
    friendRatings: [],
  },
  {
    id: '7', building: 'E7', floor: 3, location: 'E7 3rd Floor — North Wing, beside stairwell',
    gender: 'mens', score: 4.8, bookmarked: false,
    categories: { cleanliness: 4.2, accessibility: 5.5, hygiene: 4.8, privacy: 5.1, smell: 4.4 },
    friendRatings: [],
  },
  {
    id: '8', building: 'E7', floor: 4, location: 'E7 4th Floor — Research Wing, room 4023',
    gender: 'accessible', score: 9.1, bookmarked: true,
    categories: { cleanliness: 9.2, accessibility: 9.5, hygiene: 9.0, privacy: 9.1, smell: 8.9 },
    friendRatings: [{ name: 'Maya R.', initials: 'MR', score: 9.0, color: '#9B78D4' }],
  },
  {
    id: '9', building: 'E7', floor: 5, location: 'E7 5th Floor — South Pod, near elevator bank',
    gender: 'allgender', score: null, bookmarked: false,
    categories: null, friendRatings: [],
  },
]

// Pre-ranked list for Rankings screen
const RANKED_BATHROOMS = [...BATHROOMS]
  .filter(b => b.score !== null)
  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const genderMeta: Record<GenderType, { label: string; color: string; bg: string; icon: string }> = {
  mens:       { label: "Men's",      color: '#5B8FE8', bg: '#EBF1FD', icon: '♂' },
  womens:     { label: "Women's",    color: '#E87DB8', bg: '#FDE8F3', icon: '♀' },
  allgender:  { label: 'All-Gender', color: '#9B78D4', bg: '#F0EBF9', icon: '⚧' },
  accessible: { label: 'Accessible', color: '#5EC4B0', bg: '#E6F7F4', icon: '♿' },
}

function scoreColor(score: number) {
  if (score >= 9)   return '#3DBF82'
  if (score >= 7)   return '#5B8FE8'
  if (score >= 5)   return '#F5A623'
  return '#ADADBE'
}

function scoreLabel(score: number) {
  if (score >= 9)   return 'Excellent'
  if (score >= 7)   return 'Good'
  if (score >= 5)   return 'Okay'
  return 'Poor'
}

function getBuildingColor(building: 'E5' | 'E7') {
  return building === 'E5' ? '#7B8CDE' : '#5EC4A8'
}

// ─── Shared Components ────────────────────────────────────────────────────────

function GenderBadge({ gender }: { gender: GenderType }) {
  const m = genderMeta[gender]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ color: m.color, background: m.bg, fontSize: '11px', fontWeight: 600 }}>
      <span style={{ fontSize: '10px' }}>{m.icon}</span>
      {m.label}
    </span>
  )
}

function ScoreChip({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full"
        style={{ color: '#ADADBE', background: '#F5F4F0', fontSize: '11px', fontWeight: 500 }}>
        Not rated
      </span>
    )
  }
  const color = scoreColor(score)
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full tabular-nums"
      style={{ color, background: color + '1A', fontSize: '13px', fontWeight: 700 }}>
      {score.toFixed(1)}
    </span>
  )
}

function BathroomRow({ bathroom, onPress, selected }: {
  bathroom: Bathroom
  onPress: () => void
  selected?: boolean
}) {
  return (
    <button onClick={onPress} className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:scale-[0.98]"
      style={{
        background: selected ? '#EEF0FB' : 'white',
        borderRadius: 16, textAlign: 'left',
        border: selected ? '2px solid #7B8CDE' : '2px solid transparent',
        boxShadow: selected ? '0 4px 16px #7B8CDE22' : '0 1px 4px #0000000A',
      }}>
      <div className="flex-shrink-0 flex items-center justify-center rounded-xl"
        style={{
          width: 44, height: 44,
          background: getBuildingColor(bathroom.building) + '20',
          color: getBuildingColor(bathroom.building),
          fontSize: '13px', fontWeight: 800,
        }}>
        {bathroom.building}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-600 text-sm truncate mb-0.5" style={{ color: '#1C1C2E', fontWeight: 600 }}>
          {bathroom.location}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#6B6B7E' }}>Floor {bathroom.floor}</span>
          <GenderBadge gender={bathroom.gender} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <ScoreChip score={bathroom.score} />
        {bathroom.bookmarked && <span style={{ fontSize: '13px' }}>🔖</span>}
      </div>
    </button>
  )
}

function TabBar({ active, setScreen }: { active: string; setScreen: (s: Screen) => void }) {
  const tabs = [
    { id: 'home',     Icon: HomeIcon,    label: 'Home' },
    { id: 'rankings', Icon: TrophyIcon,  label: 'Rankings' },
    { id: 'rate',     Icon: null,        label: 'Rate' },
    { id: 'friends',  Icon: FriendsIcon, label: 'Friends' },
    { id: 'profile',  Icon: ProfileIcon, label: 'Profile' },
  ]
  return (
    <div className="flex items-end justify-around px-2 pt-2 pb-6 flex-shrink-0"
      style={{ background: 'white', borderTop: '1px solid #ECEAE4' }}>
      {tabs.map(tab => {
        if (tab.id === 'rate') return (
          <button key="rate" className="flex flex-col items-center -mt-7"
            onClick={() => setScreen('rate-select')}>
            <div className="flex items-center justify-center shadow-lg"
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #7B8CDE 0%, #5EC4A8 100%)',
                boxShadow: '0 4px 20px #7B8CDE44',
              }}>
              <PlusIcon />
            </div>
            <span className="text-xs mt-1" style={{ color: '#7B8CDE', fontSize: '10px', fontWeight: 600 }}>Rate</span>
          </button>
        )
        const { Icon } = tab
        const isActive = active === tab.id
        return (
          <button key={tab.id} className="flex flex-col items-center gap-1 px-2 py-1"
            onClick={() => {
              if (tab.id === 'home') setScreen('home')
              if (tab.id === 'rankings') setScreen('rankings')
            }}>
            {Icon && <Icon active={isActive} />}
            <span style={{ color: isActive ? '#7B8CDE' : '#ADADBE', fontSize: '10px', fontWeight: isActive ? 600 : 400 }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function HomeIcon({ active }: { active?: boolean }) {
  const c = active ? '#7B8CDE' : '#ADADBE'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        fill={active ? '#EEF0FB' : 'none'} stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function TrophyIcon({ active }: { active?: boolean }) {
  const c = active ? '#7B8CDE' : '#ADADBE'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M8 3h8v8a4 4 0 01-8 0V3z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" fill={active ? '#EEF0FB' : 'none'} />
      <path d="M5 4H3v3a3 3 0 003 3M19 4h2v3a3 3 0 01-3 3" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 15v3M8 21h8" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function FriendsIcon({ active }: { active?: boolean }) {
  const c = active ? '#7B8CDE' : '#ADADBE'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3" stroke={c} strokeWidth="1.8" fill={active ? '#EEF0FB' : 'none'} />
      <path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.5" stroke={c} strokeWidth="1.8" fill={active ? '#EEF0FB' : 'none'} />
      <path d="M21 20c0-2.761-1.791-5-4-5" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function ProfileIcon({ active }: { active?: boolean }) {
  const c = active ? '#7B8CDE' : '#ADADBE'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" fill={active ? '#EEF0FB' : 'none'} />
      <path d="M4 20c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="7" stroke="#ADADBE" strokeWidth="2" />
      <path d="M16.5 16.5L21 21" stroke="#ADADBE" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="#1C1C2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M5 3h14a1 1 0 011 1v17l-8-4-8 4V4a1 1 0 011-1z"
        fill={filled ? '#7B8CDE' : 'none'} stroke={filled ? '#7B8CDE' : '#ADADBE'} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
function StarIcon({ filled, color = '#F5A623' }: { filled: boolean; color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? color : 'none'} stroke={filled ? color : '#ECEAE4'} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}
function CameraIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke="#ADADBE" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" stroke="#ADADBE" strokeWidth="1.8" />
    </svg>
  )
}
function CheckCircleIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="32" fill="#3DBF8222" />
      <circle cx="32" cy="32" r="24" fill="#3DBF82" />
      <path d="M20 32l8 8 16-16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Screens 1–5 (from before) ───────────────────────────────────────────────

function SplashScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  return (
    <div className="flex flex-col items-center justify-between h-full px-8 pt-24 pb-16"
      style={{ background: 'linear-gradient(160deg, #F7F5F1 0%, #EEF0FB 60%, #E6F7F3 100%)' }}>
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="flex items-center justify-center"
            style={{
              width: 88, height: 88, borderRadius: 28,
              background: 'linear-gradient(135deg, #7B8CDE 0%, #9B78D4 50%, #5EC4A8 100%)',
              boxShadow: '0 8px 32px #7B8CDE44',
            }}>
            <span style={{ fontSize: 40 }}>🚻</span>
          </div>
          <div className="absolute -top-2 -right-2" style={{ fontSize: 18 }}>✨</div>
        </div>
        <div className="text-center">
          <h1 style={{ fontSize: 56, fontWeight: 800, color: '#1C1C2E', lineHeight: 1, letterSpacing: '-2px' }}>
            p<span style={{ color: '#7B8CDE' }}>ü</span>pi
          </h1>
          <p className="mt-4" style={{ color: '#6B6B7E', fontSize: '15px', fontWeight: 500, maxWidth: 220 }}>
            Rate, rank, and discover the best bathrooms on campus.
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          {(['E5 2F', 'E7 3F', 'E5 4F'] as const).map((label, i) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <div className="flex items-center justify-center rounded-2xl"
                style={{ width: 72, height: 72, borderRadius: 20, background: 'white', boxShadow: '0 2px 12px #0000000D' }}>
                <span style={{ fontSize: 28 }}>🚽</span>
              </div>
              <span style={{ fontSize: 11, color: '#6B6B7E', fontWeight: 500 }}>{label}</span>
              <ScoreChip score={[9.2, 7.4, 8.8][i]} />
            </div>
          ))}
        </div>
      </div>
      <div className="w-full flex flex-col gap-3">
        <button onClick={() => setScreen('register')} className="w-full py-4 transition-opacity active:opacity-80"
          style={{
            background: 'linear-gradient(135deg, #7B8CDE 0%, #9B78D4 100%)',
            borderRadius: 16, color: 'white', fontSize: '16px', fontWeight: 700,
            boxShadow: '0 4px 20px #7B8CDE44',
          }}>
          Create Account
        </button>
        <button onClick={() => setScreen('login')} className="w-full py-4 transition-opacity active:opacity-80"
          style={{ background: 'white', borderRadius: 16, color: '#7B8CDE', fontSize: '16px', fontWeight: 700, border: '1.5px solid #C5CBEF' }}>
          Log In
        </button>
        <p className="text-center mt-1" style={{ color: '#ADADBE', fontSize: '12px' }}>University of Waterloo · E5 & E7 Buildings</p>
      </div>
    </div>
  )
}

function RegisterScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [step, setStep] = useState<'info' | 'preference'>('info')
  const [pref, setPref] = useState<WashroomPreference | null>(null)
  const prefOptions: { id: WashroomPreference; icon: string; label: string; sub: string; color: string; bg: string }[] = [
    { id: 'mens', icon: '♂', label: "Men's", sub: "See Men's, All-Gender & Accessible", color: '#5B8FE8', bg: '#EBF1FD' },
    { id: 'womens', icon: '♀', label: "Women's", sub: "See Women's, All-Gender & Accessible", color: '#E87DB8', bg: '#FDE8F3' },
    { id: 'allgender', icon: '⚧', label: 'All-Gender only', sub: 'See All-Gender & Accessible only', color: '#9B78D4', bg: '#F0EBF9' },
  ]
  if (step === 'preference') return (
    <div className="flex flex-col h-full" style={{ background: '#F7F5F1' }}>
      <div className="px-6 pt-16 pb-6">
        <button onClick={() => setStep('info')} className="mb-6 -ml-1 flex items-center gap-1"
          style={{ color: '#7B8CDE', fontWeight: 600, fontSize: '14px' }}>
          <BackIcon /> Back
        </button>
        <div className="flex items-center gap-2 mb-1">
          <span style={{ fontSize: 20 }}>🚻</span>
          <span style={{ color: '#ADADBE', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em' }}>STEP 2 OF 2</span>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1C1C2E', lineHeight: 1.2, marginTop: 8 }}>
          Which washrooms<br />do you use?
        </h2>
        <p style={{ color: '#6B6B7E', fontSize: '14px', lineHeight: 1.5, marginTop: 8 }}>
          This determines which bathrooms appear in your feed.
        </p>
      </div>
      <div className="flex-1 px-6 flex flex-col gap-3">
        {prefOptions.map(opt => {
          const selected = pref === opt.id
          return (
            <button key={opt.id} onClick={() => setPref(opt.id)} className="w-full flex items-center gap-4 p-4 transition-all"
              style={{
                borderRadius: 20, background: selected ? opt.bg : 'white',
                border: selected ? `2px solid ${opt.color}` : '2px solid transparent',
                boxShadow: selected ? `0 4px 20px ${opt.color}22` : '0 2px 8px #0000000A',
              }}>
              <div className="flex items-center justify-center flex-shrink-0"
                style={{ width: 52, height: 52, borderRadius: 16, background: opt.bg }}>
                <span style={{ fontSize: 24, color: opt.color }}>{opt.icon}</span>
              </div>
              <div className="flex-1 text-left">
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#1C1C2E' }}>{opt.label}</div>
                <div style={{ fontSize: '12px', color: '#6B6B7E', marginTop: 2 }}>{opt.sub}</div>
              </div>
              <div className="flex-shrink-0 flex items-center justify-center"
                style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${selected ? opt.color : '#ECEAE4'}`, background: selected ? opt.color : 'transparent' }}>
                {selected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>}
              </div>
            </button>
          )
        })}
      </div>
      <div className="px-6 pb-10 pt-6">
        <button onClick={() => pref && setScreen('home')} className="w-full py-4"
          style={{
            borderRadius: 16, fontSize: '16px', fontWeight: 700,
            background: pref ? 'linear-gradient(135deg, #7B8CDE 0%, #9B78D4 100%)' : '#ECEAE4',
            color: pref ? 'white' : '#ADADBE',
            boxShadow: pref ? '0 4px 20px #7B8CDE44' : 'none',
          }}>
          Let's go →
        </button>
      </div>
    </div>
  )
  return (
    <div className="flex flex-col h-full overflow-auto phone-scroll" style={{ background: '#F7F5F1' }}>
      <div className="px-6 pt-16 pb-4">
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C2E', lineHeight: 1.2 }}>
          Join <span style={{ color: '#7B8CDE' }}>püpi</span>
        </h1>
        <p style={{ color: '#6B6B7E', fontSize: '14px', marginTop: 6 }}>Rate the best loos at UW.</p>
      </div>
      <div className="px-6 flex flex-col gap-4 pb-8">
        {[
          { label: 'Full Name', placeholder: 'Waterloo Student', type: 'text' },
          { label: 'Email', placeholder: 'ws23abc@uwaterloo.ca', type: 'email' },
          { label: 'Username', placeholder: '@flushmaster99', type: 'text' },
          { label: 'Password', placeholder: '••••••••', type: 'password' },
        ].map(field => (
          <div key={field.label}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B7E', display: 'block', marginBottom: 6 }}>{field.label}</label>
            <input type={field.type} placeholder={field.placeholder} className="w-full px-4 py-3.5 outline-none"
              style={{ borderRadius: 14, background: 'white', border: '1.5px solid #ECEAE4', fontSize: '15px', color: '#1C1C2E', fontFamily: 'inherit' }}
              onFocus={e => { e.target.style.borderColor = '#7B8CDE'; e.target.style.boxShadow = '0 0 0 3px #7B8CDE18' }}
              onBlur={e => { e.target.style.borderColor = '#ECEAE4'; e.target.style.boxShadow = 'none' }} />
          </div>
        ))}
        <button onClick={() => setStep('preference')} className="w-full py-4 mt-2 transition-opacity active:opacity-80"
          style={{ borderRadius: 16, fontSize: '16px', fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #7B8CDE 0%, #9B78D4 100%)', boxShadow: '0 4px 20px #7B8CDE44' }}>
          Continue
        </button>
        <p className="text-center" style={{ color: '#6B6B7E', fontSize: '13px' }}>
          Already have an account?{' '}
          <button onClick={() => setScreen('login')} style={{ color: '#7B8CDE', fontWeight: 600 }}>Log in</button>
        </p>
      </div>
    </div>
  )
}

function LoginScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  return (
    <div className="flex flex-col h-full" style={{ background: '#F7F5F1' }}>
      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="flex items-center justify-center"
            style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #7B8CDE 0%, #5EC4A8 100%)' }}>
            <span style={{ fontSize: 24 }}>🚻</span>
          </div>
          <span style={{ fontSize: 32, fontWeight: 800, color: '#1C1C2E', letterSpacing: '-1px' }}>
            p<span style={{ color: '#7B8CDE' }}>ü</span>pi
          </span>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1C1C2E', marginBottom: 4 }}>Welcome back</h2>
        <p style={{ color: '#6B6B7E', fontSize: '14px', marginBottom: 32 }}>Sign in to your account</p>
        <div className="flex flex-col gap-4">
          {[
            { label: 'Email', placeholder: 'ws23abc@uwaterloo.ca', type: 'email' },
            { label: 'Password', placeholder: '••••••••', type: 'password' },
          ].map(field => (
            <div key={field.label}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B7E', display: 'block', marginBottom: 6 }}>{field.label}</label>
              <input type={field.type} placeholder={field.placeholder} className="w-full px-4 py-3.5 outline-none"
                style={{ borderRadius: 14, background: 'white', border: '1.5px solid #ECEAE4', fontSize: '15px', color: '#1C1C2E', fontFamily: 'inherit' }}
                onFocus={e => { e.target.style.borderColor = '#7B8CDE'; e.target.style.boxShadow = '0 0 0 3px #7B8CDE18' }}
                onBlur={e => { e.target.style.borderColor = '#ECEAE4'; e.target.style.boxShadow = 'none' }} />
            </div>
          ))}
          <button className="text-right" style={{ color: '#7B8CDE', fontSize: '13px', fontWeight: 600 }}>Forgot password?</button>
          <button onClick={() => setScreen('home')} className="w-full py-4 mt-2 transition-opacity active:opacity-80"
            style={{ borderRadius: 16, fontSize: '16px', fontWeight: 700, color: 'white', background: 'linear-gradient(135deg, #7B8CDE 0%, #9B78D4 100%)', boxShadow: '0 4px 20px #7B8CDE44' }}>
            Sign In
          </button>
        </div>
      </div>
      <div className="px-6 pb-12 text-center">
        <p style={{ color: '#6B6B7E', fontSize: '14px' }}>
          New to püpi?{' '}
          <button onClick={() => setScreen('register')} style={{ color: '#7B8CDE', fontWeight: 700 }}>Create account</button>
        </p>
      </div>
    </div>
  )
}

function HomeScreen({ setScreen, setSelected }: { setScreen: (s: Screen) => void; setSelected: (b: Bathroom) => void }) {
  const [search, setSearch] = useState('')
  const [buildingFilter, setBuildingFilter] = useState<'all' | 'E5' | 'E7'>('all')
  const [floorFilter, setFloorFilter] = useState<number | null>(null)
  const filtered = BATHROOMS.filter(b => {
    if (buildingFilter !== 'all' && b.building !== buildingFilter) return false
    if (floorFilter !== null && b.floor !== floorFilter) return false
    if (search && !b.location.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const floors = [...new Set(BATHROOMS.map(b => b.floor))].sort()
  const rated = BATHROOMS.filter(b => b.score !== null)
  const avgScore = rated.length ? (rated.reduce((s, b) => s + b.score!, 0) / rated.length).toFixed(1) : '—'
  return (
    <div className="flex flex-col h-full" style={{ background: '#F7F5F1' }}>
      <div className="px-5 pt-14 pb-4" style={{ background: '#F7F5F1' }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p style={{ color: '#6B6B7E', fontSize: '13px', fontWeight: 500 }}>Good afternoon, Alex 👋</p>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1C1C2E', letterSpacing: '-0.5px', marginTop: 2 }}>
              p<span style={{ color: '#7B8CDE' }}>ü</span>pi
            </h1>
          </div>
          <div className="flex gap-2">
            <div className="text-center px-3 py-2 rounded-2xl" style={{ background: 'white', boxShadow: '0 2px 8px #0000000A' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#7B8CDE' }}>{rated.length}</div>
              <div style={{ fontSize: 10, color: '#6B6B7E', fontWeight: 500 }}>Rated</div>
            </div>
            <div className="text-center px-3 py-2 rounded-2xl" style={{ background: 'white', boxShadow: '0 2px 8px #0000000A' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#3DBF82' }}>{avgScore}</div>
              <div style={{ fontSize: 10, color: '#6B6B7E', fontWeight: 500 }}>Avg</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'white', borderRadius: 14, border: '1.5px solid #ECEAE4' }}>
          <SearchIcon />
          <input placeholder="Search bathrooms..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 outline-none bg-transparent"
            style={{ fontSize: '15px', color: '#1C1C2E', fontFamily: 'inherit' }} />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto phone-scroll pb-1">
          {(['all', 'E5', 'E7'] as const).map(f => (
            <button key={f} onClick={() => setBuildingFilter(f)} className="flex-shrink-0 px-4 py-1.5 rounded-full transition-all"
              style={{ fontSize: '13px', fontWeight: 600, background: buildingFilter === f ? '#7B8CDE' : 'white', color: buildingFilter === f ? 'white' : '#6B6B7E', border: buildingFilter === f ? 'none' : '1.5px solid #ECEAE4' }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
          <div style={{ width: 1, background: '#ECEAE4', margin: '4px 0', flexShrink: 0 }} />
          {floors.map(fl => (
            <button key={fl} onClick={() => setFloorFilter(floorFilter === fl ? null : fl)} className="flex-shrink-0 px-3 py-1.5 rounded-full transition-all"
              style={{ fontSize: '13px', fontWeight: 600, background: floorFilter === fl ? '#1C1C2E' : 'white', color: floorFilter === fl ? 'white' : '#6B6B7E', border: floorFilter === fl ? 'none' : '1.5px solid #ECEAE4' }}>
              F{fl}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto phone-scroll px-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B6B7E' }}>{filtered.length} bathrooms</span>
          <button style={{ fontSize: '13px', fontWeight: 600, color: '#7B8CDE' }}>Sort by score ↓</button>
        </div>
        <div className="flex flex-col gap-2.5">
          {filtered.map(b => (
            <BathroomRow key={b.id} bathroom={b} onPress={() => { setSelected(b); setScreen('detail') }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DetailScreen({ bathroom, setScreen }: { bathroom: Bathroom; setScreen: (s: Screen) => void }) {
  const [bookmarked, setBookmarked] = useState(bathroom.bookmarked)
  const cats: { key: keyof NonNullable<Bathroom['categories']>; label: string; icon: string }[] = [
    { key: 'cleanliness', label: 'Cleanliness', icon: '🧹' },
    { key: 'accessibility', label: 'Accessibility', icon: '♿' },
    { key: 'hygiene', label: 'Hygiene Products', icon: '🧴' },
    { key: 'privacy', label: 'Privacy', icon: '🔒' },
    { key: 'smell', label: 'Smell', icon: '🌿' },
  ]
  return (
    <div className="flex flex-col h-full" style={{ background: '#F7F5F1' }}>
      <div className="px-5 pt-14 pb-6"
        style={{ background: 'linear-gradient(160deg, #EEF0FB 0%, #F0EBF9 100%)', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setScreen('home')} className="flex items-center justify-center active:opacity-70"
            style={{ width: 38, height: 38, borderRadius: 12, background: 'white' }}>
            <BackIcon />
          </button>
          <button onClick={() => setBookmarked(b => !b)} className="flex items-center justify-center active:opacity-70"
            style={{ width: 38, height: 38, borderRadius: 12, background: 'white' }}>
            <BookmarkIcon filled={bookmarked} />
          </button>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-1 rounded-lg" style={{ background: getBuildingColor(bathroom.building) + '20', color: getBuildingColor(bathroom.building), fontSize: '12px', fontWeight: 800 }}>
            {bathroom.building}
          </span>
          <span style={{ color: '#6B6B7E', fontSize: '13px' }}>Floor {bathroom.floor}</span>
          <GenderBadge gender={bathroom.gender} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1C1C2E', lineHeight: 1.3, marginBottom: 12 }}>{bathroom.location}</h2>
        {bathroom.score !== null ? (
          <div className="flex items-end gap-4">
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B6B7E', marginBottom: 4 }}>YOUR SCORE</div>
              <div className="flex items-baseline gap-1">
                <span style={{ fontSize: 52, fontWeight: 800, color: scoreColor(bathroom.score), lineHeight: 1 }}>{bathroom.score.toFixed(1)}</span>
                <span style={{ fontSize: 18, color: '#ADADBE', fontWeight: 600 }}>/10</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: scoreColor(bathroom.score), marginTop: 2 }}>{scoreLabel(bathroom.score)}</div>
            </div>
            <div className="flex gap-1 pb-1">
              {cats.map(cat => (
                <div key={cat.key} className="flex flex-col-reverse items-center gap-1">
                  <div style={{ fontSize: 8, color: '#ADADBE', fontWeight: 500 }}>{cat.icon}</div>
                  <div style={{ width: 6, height: 40, borderRadius: 4, background: '#ECEAE4', overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: `${((bathroom.categories?.[cat.key] ?? 0) / 10) * 100}%`, background: `linear-gradient(to top, ${scoreColor(bathroom.score!)}, ${scoreColor(bathroom.score!)}88)`, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: '#F7F5F1', border: '1.5px dashed #C5CBEF' }}>
            <span style={{ fontSize: 24 }}>📊</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1C1C2E' }}>Not rated yet</div>
              <div style={{ fontSize: '12px', color: '#6B6B7E' }}>Tap below to leave your review</div>
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto phone-scroll px-5 py-5 flex flex-col gap-5">
        {bathroom.categories && (
          <div className="rounded-2xl p-4" style={{ background: 'white' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1C1C2E', marginBottom: 14 }}>Category Breakdown</h3>
            <div className="flex flex-col gap-3.5">
              {cats.map(cat => {
                const val = bathroom.categories![cat.key]
                return (
                  <div key={cat.key} className="flex items-center gap-3">
                    <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{cat.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1C1C2E' }}>{cat.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: scoreColor(val) }}>{val.toFixed(1)}</span>
                      </div>
                      <div style={{ height: 6, background: '#F0EEE9', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(val / 10) * 100}%`, background: `linear-gradient(90deg, ${scoreColor(val)}, ${scoreColor(val)}BB)`, borderRadius: 999 }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {bathroom.friendRatings.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'white' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1C1C2E', marginBottom: 12 }}>Friends' Ratings</h3>
            <div className="flex flex-col gap-3">
              {bathroom.friendRatings.map(fr => (
                <div key={fr.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center rounded-full"
                      style={{ width: 36, height: 36, background: fr.color + '22', color: fr.color, fontSize: '13px', fontWeight: 700 }}>
                      {fr.initials}
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1C1C2E' }}>{fr.name}</span>
                  </div>
                  <ScoreChip score={fr.score} />
                </div>
              ))}
            </div>
          </div>
        )}
        <button className="w-full py-4 transition-opacity active:opacity-80 mb-2"
          style={{
            borderRadius: 16, fontSize: '16px', fontWeight: 700, color: 'white',
            background: bathroom.score !== null ? 'linear-gradient(135deg, #1C1C2E 0%, #3B3B52 100%)' : 'linear-gradient(135deg, #7B8CDE 0%, #9B78D4 100%)',
            boxShadow: bathroom.score !== null ? '0 4px 16px #1C1C2E33' : '0 4px 20px #7B8CDE44',
          }}>
          {bathroom.score !== null ? '↺  Re-rate this bathroom' : '⭐  Rate this bathroom'}
        </button>
      </div>
    </div>
  )
}

// ─── Screen 6: Rate — Select ──────────────────────────────────────────────────

function RateSelectScreen({ setScreen, setRatingTarget }: {
  setScreen: (s: Screen) => void
  setRatingTarget: (b: Bathroom) => void
}) {
  const [search, setSearch] = useState('')
  const [buildingFilter, setBuildingFilter] = useState<'all' | 'E5' | 'E7'>('all')
  const [floorFilter, setFloorFilter] = useState<number | null>(null)
  const [selected, setSelected] = useState<Bathroom | null>(null)

  const filtered = BATHROOMS.filter(b => {
    if (buildingFilter !== 'all' && b.building !== buildingFilter) return false
    if (floorFilter !== null && b.floor !== floorFilter) return false
    if (search && !b.location.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const floors = [...new Set(BATHROOMS.map(b => b.floor))].sort()

  return (
    <div className="flex flex-col h-full" style={{ background: '#F7F5F1' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-4" style={{ background: '#F7F5F1' }}>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setScreen('home')} className="flex items-center justify-center"
            style={{ width: 38, height: 38, borderRadius: 12, background: 'white', border: '1.5px solid #ECEAE4' }}>
            <BackIcon />
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#1C1C2E' }}>Rate a Bathroom</h1>
            <p style={{ fontSize: '12px', color: '#6B6B7E' }}>Step 1 of 2 — Choose a bathroom</p>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: '#ECEAE4', borderRadius: 999, marginBottom: 16 }}>
          <div style={{ width: '50%', height: '100%', background: 'linear-gradient(90deg, #7B8CDE, #9B78D4)', borderRadius: 999 }} />
        </div>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'white', borderRadius: 14, border: '1.5px solid #ECEAE4' }}>
          <SearchIcon />
          <input placeholder="Search bathrooms..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 outline-none bg-transparent"
            style={{ fontSize: '15px', color: '#1C1C2E', fontFamily: 'inherit' }} />
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto phone-scroll pb-1">
          {(['all', 'E5', 'E7'] as const).map(f => (
            <button key={f} onClick={() => setBuildingFilter(f)} className="flex-shrink-0 px-4 py-1.5 rounded-full transition-all"
              style={{ fontSize: '13px', fontWeight: 600, background: buildingFilter === f ? '#7B8CDE' : 'white', color: buildingFilter === f ? 'white' : '#6B6B7E', border: buildingFilter === f ? 'none' : '1.5px solid #ECEAE4' }}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
          <div style={{ width: 1, background: '#ECEAE4', margin: '4px 0', flexShrink: 0 }} />
          {floors.map(fl => (
            <button key={fl} onClick={() => setFloorFilter(floorFilter === fl ? null : fl)} className="flex-shrink-0 px-3 py-1.5 rounded-full transition-all"
              style={{ fontSize: '13px', fontWeight: 600, background: floorFilter === fl ? '#1C1C2E' : 'white', color: floorFilter === fl ? 'white' : '#6B6B7E', border: floorFilter === fl ? 'none' : '1.5px solid #ECEAE4' }}>
              F{fl}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto phone-scroll px-5">
        <div className="flex flex-col gap-2.5 pb-4">
          {filtered.map(b => (
            <BathroomRow key={b.id} bathroom={b}
              selected={selected?.id === b.id}
              onPress={() => setSelected(s => s?.id === b.id ? null : b)} />
          ))}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="px-5 py-4" style={{ background: '#F7F5F1', borderTop: '1px solid #ECEAE4' }}>
        <button
          onClick={() => {
            if (selected) { setRatingTarget(selected); setScreen('rate-score') }
          }}
          className="w-full py-4 transition-all active:opacity-80"
          style={{
            borderRadius: 16, fontSize: '16px', fontWeight: 700,
            background: selected ? 'linear-gradient(135deg, #7B8CDE 0%, #9B78D4 100%)' : '#ECEAE4',
            color: selected ? 'white' : '#ADADBE',
            boxShadow: selected ? '0 4px 20px #7B8CDE44' : 'none',
          }}>
          {selected ? `Rate "${selected.building} F${selected.floor}" →` : 'Select a bathroom to continue'}
        </button>
      </div>
    </div>
  )
}

// ─── Screen 6: Rate — Score ───────────────────────────────────────────────────

const CAT_CONFIG = [
  { key: 'cleanliness' as const, label: 'Cleanliness', icon: '🧹', desc: 'How clean was it overall?' },
  { key: 'accessibility' as const, label: 'Accessibility', icon: '♿', desc: 'Ease of access and navigation' },
  { key: 'hygiene' as const, label: 'Hygiene Products', icon: '🧴', desc: 'Soap, paper, hand dryers' },
  { key: 'privacy' as const, label: 'Privacy', icon: '🔒', desc: 'Stall quality, door gaps, noise' },
  { key: 'smell' as const, label: 'Smell', icon: '🌿', desc: 'Odour level and ventilation' },
]

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Perfect']

function RateScoreScreen({ bathroom, setScreen }: { bathroom: Bathroom; setScreen: (s: Screen) => void }) {
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [hoveredStar, setHoveredStar] = useState<{ key: string; val: number } | null>(null)

  const allRated = CAT_CONFIG.every(c => ratings[c.key])
  const avgRating = allRated
    ? (CAT_CONFIG.reduce((s, c) => s + ratings[c.key], 0) / CAT_CONFIG.length)
    : null

  return (
    <div className="flex flex-col h-full" style={{ background: '#F7F5F1' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-5"
        style={{ background: 'linear-gradient(160deg, #EEF0FB 0%, #F0EBF9 100%)', borderRadius: '0 0 24px 24px' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setScreen('rate-select')} className="flex items-center justify-center"
            style={{ width: 38, height: 38, borderRadius: 12, background: 'white' }}>
            <BackIcon />
          </button>
          <div className="flex-1">
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B6B7E', letterSpacing: '0.08em' }}>STEP 2 OF 2</p>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: '#1C1C2E' }}>Rate this bathroom</h1>
          </div>
          {avgRating && (
            <div className="flex items-center justify-center px-3 py-1.5 rounded-xl"
              style={{ background: scoreColor(avgRating * 2) + '22' }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor(avgRating * 2) }}>
                {(avgRating * 2).toFixed(1)}
              </span>
            </div>
          )}
        </div>
        {/* Progress */}
        <div style={{ height: 4, background: '#ECEAE4', borderRadius: 999, marginBottom: 12 }}>
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #7B8CDE, #9B78D4)', borderRadius: 999 }} />
        </div>
        {/* Target bathroom pill */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl" style={{ background: 'white' }}>
          <div className="flex items-center justify-center rounded-xl"
            style={{ width: 36, height: 36, background: getBuildingColor(bathroom.building) + '20', color: getBuildingColor(bathroom.building), fontSize: '12px', fontWeight: 800 }}>
            {bathroom.building}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate" style={{ fontSize: '13px', fontWeight: 600, color: '#1C1C2E' }}>{bathroom.location}</div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '11px', color: '#6B6B7E' }}>Floor {bathroom.floor}</span>
              <GenderBadge gender={bathroom.gender} />
            </div>
          </div>
        </div>
      </div>

      {/* Rating categories */}
      <div className="flex-1 overflow-y-auto phone-scroll px-5 py-4">
        <div className="flex flex-col gap-3">
          {CAT_CONFIG.map(cat => {
            const val = ratings[cat.key] ?? 0
            const hovered = hoveredStar?.key === cat.key ? hoveredStar.val : null
            const displayVal = hovered ?? val
            return (
              <div key={cat.key} className="rounded-2xl p-4" style={{ background: 'white' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 18 }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1C1C2E' }}>{cat.label}</div>
                      <div style={{ fontSize: '11px', color: '#6B6B7E' }}>{cat.desc}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: displayVal ? scoreColor(displayVal * 2) : '#ADADBE', minWidth: 40, textAlign: 'right' }}>
                    {displayVal ? STAR_LABELS[displayVal] : '—'}
                  </div>
                </div>
                {/* 5-star tap */}
                <div className="flex gap-1.5 justify-center mt-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star}
                      onMouseEnter={() => setHoveredStar({ key: cat.key, val: star })}
                      onMouseLeave={() => setHoveredStar(null)}
                      onClick={() => setRatings(r => ({ ...r, [cat.key]: star }))}
                      className="transition-transform active:scale-90"
                      style={{ transform: displayVal >= star ? 'scale(1.05)' : 'scale(1)' }}>
                      <StarIcon filled={displayVal >= star}
                        color={displayVal >= star ? (displayVal >= 4 ? '#3DBF82' : displayVal >= 3 ? '#5B8FE8' : '#F5A623') : '#ECEAE4'} />
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Note */}
          <div className="rounded-2xl p-4" style={{ background: 'white' }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 18 }}>📝</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1C1C2E' }}>Leave a note</div>
                <div style={{ fontSize: '11px', color: '#6B6B7E' }}>Optional — share what stood out</div>
              </div>
            </div>
            <textarea
              placeholder="e.g. Always clean, great soap dispensers. The hand dryer is a bit loud."
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="w-full outline-none resize-none"
              style={{
                borderRadius: 12, background: '#F7F5F1', border: '1.5px solid #ECEAE4',
                padding: '10px 14px', fontSize: '14px', color: '#1C1C2E', fontFamily: 'inherit', lineHeight: 1.5,
              }}
              onFocus={e => { e.target.style.borderColor = '#7B8CDE'; e.target.style.boxShadow = '0 0 0 3px #7B8CDE18' }}
              onBlur={e => { e.target.style.borderColor = '#ECEAE4'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          {/* Photo */}
          <button className="rounded-2xl p-4 w-full flex items-center gap-3 transition-all active:opacity-70"
            style={{ background: 'white', border: '1.5px dashed #C5CBEF' }}>
            <div className="flex items-center justify-center rounded-xl"
              style={{ width: 44, height: 44, background: '#EEF0FB' }}>
              <CameraIcon />
            </div>
            <div className="text-left">
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#7B8CDE' }}>Add a photo</div>
              <div style={{ fontSize: '11px', color: '#6B6B7E' }}>Optional — attach up to 2 photos</div>
            </div>
          </button>
        </div>
      </div>

      {/* Submit */}
      <div className="px-5 py-4" style={{ background: '#F7F5F1', borderTop: '1px solid #ECEAE4' }}>
        <button onClick={() => allRated && setScreen('compare')} className="w-full py-4 transition-all active:opacity-80"
          style={{
            borderRadius: 16, fontSize: '16px', fontWeight: 700,
            background: allRated ? 'linear-gradient(135deg, #7B8CDE 0%, #9B78D4 100%)' : '#ECEAE4',
            color: allRated ? 'white' : '#ADADBE',
            boxShadow: allRated ? '0 4px 20px #7B8CDE44' : 'none',
          }}>
          {allRated ? 'Submit & Compare →' : `Rate all 5 categories to continue`}
        </button>
      </div>
    </div>
  )
}

// ─── Screen 7: Compare ────────────────────────────────────────────────────────

const COMPARE_PAIRS = [
  { a: BATHROOMS[0], b: BATHROOMS[4], index: 1, total: 3 },  // E5 F1 vs E7 F1
  { a: BATHROOMS[2], b: BATHROOMS[5], index: 2, total: 3 },  // E5 F3 vs E7 F2
  { a: BATHROOMS[7], b: BATHROOMS[1], index: 3, total: 3 },  // E7 F4 vs E5 F2
]

function CompareScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [pairIdx, setPairIdx] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const pair = COMPARE_PAIRS[pairIdx]

  function handleChoose(id: string) {
    if (chosen || loading) return
    setChosen(id)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setChosen(null)
        if (pairIdx < COMPARE_PAIRS.length - 1) {
          setPairIdx(i => i + 1)
        } else {
          setScreen('compare-result')
        }
      }, 800)
    }, 700)
  }

  const highlight = (bathroom: Bathroom) => [
    { icon: '🧹', label: 'Cleanliness', val: bathroom.categories?.cleanliness ?? null },
    { icon: '🔒', label: 'Privacy', val: bathroom.categories?.privacy ?? null },
    { icon: '🌿', label: 'Smell', val: bathroom.categories?.smell ?? null },
  ].filter(h => h.val !== null).slice(0, 2)

  return (
    <div className="flex flex-col h-full" style={{ background: '#F7F5F1' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setScreen('home')} className="flex items-center justify-center"
            style={{ width: 38, height: 38, borderRadius: 12, background: 'white', border: '1.5px solid #ECEAE4' }}>
            <BackIcon />
          </button>
          <div className="text-center">
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B6B7E', letterSpacing: '0.08em' }}>COMPARISON</p>
            <p style={{ fontSize: '17px', fontWeight: 800, color: '#1C1C2E' }}>{pair.index} of {pair.total}</p>
          </div>
          <div style={{ width: 38 }} /> {/* spacer */}
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-1">
          {COMPARE_PAIRS.map((_, i) => (
            <div key={i} style={{
              width: i === pairIdx ? 24 : 8, height: 8, borderRadius: 999,
              background: i < pairIdx ? '#3DBF82' : i === pairIdx ? '#7B8CDE' : '#ECEAE4',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>
      </div>

      {/* Question */}
      <div className="px-5 mb-4">
        <div className="text-center py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #EEF0FB, #F0EBF9)' }}>
          <p style={{ fontSize: '20px', fontWeight: 800, color: '#1C1C2E' }}>Which was better?</p>
          <p style={{ fontSize: '13px', color: '#6B6B7E', marginTop: 2 }}>Tap the one you preferred</p>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 px-5 flex flex-col gap-3 justify-center pb-4">
        {[pair.a, pair.b].map((bathroom, idx) => {
          const isChosen = chosen === bathroom.id
          const isOther = chosen !== null && chosen !== bathroom.id
          const highlights = highlight(bathroom)

          return (
            <button key={bathroom.id} onClick={() => handleChoose(bathroom.id)}
              disabled={!!chosen}
              className="w-full text-left transition-all"
              style={{
                borderRadius: 24,
                transform: isChosen ? 'scale(1.02)' : isOther ? 'scale(0.97)' : 'scale(1)',
                opacity: isOther ? 0.45 : 1,
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              }}>
              <div style={{
                borderRadius: 24,
                background: isChosen
                  ? 'linear-gradient(135deg, #EEF0FB 0%, #F0EBF9 100%)'
                  : 'white',
                border: isChosen ? '2.5px solid #7B8CDE' : '2.5px solid transparent',
                boxShadow: isChosen
                  ? '0 8px 32px #7B8CDE33'
                  : '0 2px 16px #0000000D',
                overflow: 'hidden',
                padding: 0,
              }}>
                {/* Card top strip */}
                <div style={{
                  height: 6,
                  background: isChosen
                    ? 'linear-gradient(90deg, #7B8CDE, #9B78D4)'
                    : getBuildingColor(bathroom.building) + '40',
                }} />

                <div className="p-5">
                  {/* Building + badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center justify-center rounded-xl"
                      style={{ width: 40, height: 40, background: getBuildingColor(bathroom.building) + '20', color: getBuildingColor(bathroom.building), fontSize: '13px', fontWeight: 800 }}>
                      {bathroom.building}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B6B7E' }}>Floor {bathroom.floor}</span>
                        <GenderBadge gender={bathroom.gender} />
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1C1C2E', lineHeight: 1.2, marginTop: 2 }}>
                        {bathroom.location.replace(/^E[57] \d[a-z]+ Floor — /, '')}
                      </div>
                    </div>
                  </div>

                  {/* Category highlights */}
                  <div className="flex gap-2">
                    {highlights.map(h => (
                      <div key={h.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-1"
                        style={{ background: '#F7F5F1' }}>
                        <span style={{ fontSize: 13 }}>{h.icon}</span>
                        <div>
                          <div style={{ fontSize: '9px', fontWeight: 600, color: '#ADADBE', letterSpacing: '0.05em' }}>{h.label.toUpperCase()}</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: scoreColor(h.val!) }}>{h.val!.toFixed(1)}</div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-center px-3 py-1.5 rounded-xl"
                      style={{ background: '#F7F5F1', minWidth: 56 }}>
                      <ScoreChip score={bathroom.score} />
                    </div>
                  </div>

                  {/* Winner checkmark */}
                  {isChosen && (
                    <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #ECEAE4' }}>
                      <div className="flex items-center justify-center rounded-full"
                        style={{ width: 22, height: 22, background: loading ? '#F5A623' : success ? '#3DBF82' : '#7B8CDE' }}>
                        {loading ? (
                          <div style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent', animation: 'spin 0.6s linear infinite' }} />
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: loading ? '#F5A623' : success ? '#3DBF82' : '#7B8CDE' }}>
                        {loading ? 'Updating ELO…' : success ? 'Recorded!' : 'Your pick'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}

        {/* VS divider */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ zIndex: 10 }}>
        </div>

        {/* Skip */}
        <button onClick={() => setScreen('compare-result')}
          style={{ fontSize: '13px', fontWeight: 600, color: '#ADADBE', textAlign: 'center', padding: '4px 0' }}>
          Skip this comparison
        </button>
      </div>
    </div>
  )
}

// ─── Loading micro-state (used in compare) ───────────────────────────────────
// (Inline above — the spinner and "Updating ELO…" state inside the card)

// ─── Screen 8: Compare Result ─────────────────────────────────────────────────

function CompareResultScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [revealed, setRevealed] = useState(false)
  const [rankVisible, setRankVisible] = useState(false)
  const newScore = 8.7
  const newRank = 3

  const contextRanking = [
    { rank: 1, bathroom: RANKED_BATHROOMS[0], isNew: false },
    { rank: 2, bathroom: RANKED_BATHROOMS[1], isNew: false },
    { rank: newRank, bathroom: { ...BATHROOMS[0], score: newScore }, isNew: true },
    { rank: 4, bathroom: RANKED_BATHROOMS[2], isNew: false },
    { rank: 5, bathroom: RANKED_BATHROOMS[3], isNew: false },
  ]

  useEffect(() => {
    const t1 = setTimeout(() => setRevealed(true), 300)
    const t2 = setTimeout(() => setRankVisible(true), 900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div className="flex flex-col h-full" style={{ background: '#F7F5F1' }}>
      {/* Hero score reveal */}
      <div className="px-5 pt-14 pb-6"
        style={{ background: 'linear-gradient(160deg, #EEF0FB 0%, #E6F7F3 100%)', borderRadius: '0 0 32px 32px' }}>
        {/* Confetti dots */}
        <div className="flex justify-center gap-2 mb-4">
          {['#7B8CDE', '#5EC4A8', '#9B78D4', '#F5A623', '#3DBF82'].map((c, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%', background: c,
              transform: revealed ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0)',
              opacity: revealed ? 1 : 0,
              transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 60}ms`,
            }} />
          ))}
        </div>

        <div className="text-center">
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#6B6B7E', letterSpacing: '0.1em', marginBottom: 8 }}>
            NEW SCORE
          </p>

          {/* Score number — big animated reveal */}
          <div className="relative flex items-center justify-center" style={{ height: 100 }}>
            <div style={{
              fontSize: 84, fontWeight: 800, lineHeight: 1,
              color: scoreColor(newScore),
              transform: revealed ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(20px)',
              opacity: revealed ? 1 : 0,
              transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
              letterSpacing: '-3px',
            }}>
              {newScore.toFixed(1)}
            </div>
            <div style={{
              position: 'absolute', right: 48, bottom: 12,
              fontSize: 22, fontWeight: 600, color: '#ADADBE',
              transform: revealed ? 'translateY(0)' : 'translateY(8px)',
              opacity: revealed ? 1 : 0,
              transition: 'all 0.4s ease 0.4s',
            }}>/10</div>
          </div>

          {/* Label + badge */}
          <div className="flex items-center justify-center gap-3 mt-1"
            style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(8px)', transition: 'all 0.4s ease 0.5s' }}>
            <span style={{ fontSize: '18px', fontWeight: 800, color: scoreColor(newScore) }}>
              {scoreLabel(newScore)}
            </span>
            <span className="px-3 py-1 rounded-full" style={{ background: '#3DBF8222', color: '#3DBF82', fontSize: '13px', fontWeight: 700 }}>
              ↑ +0.4
            </span>
          </div>

          {/* Bathroom name */}
          <p style={{ fontSize: '13px', color: '#6B6B7E', marginTop: 8, fontWeight: 500, opacity: revealed ? 1 : 0, transition: 'opacity 0.4s ease 0.6s' }}>
            E5 1st Floor — Main Entrance
          </p>
        </div>
      </div>

      {/* Ranked list in context */}
      <div className="flex-1 overflow-y-auto phone-scroll px-5 py-5">
        <div className="flex items-center justify-between mb-3"
          style={{ opacity: rankVisible ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1C1C2E' }}>Your Rankings</h3>
          <span style={{ fontSize: '12px', color: '#7B8CDE', fontWeight: 600 }}>Updated</span>
        </div>

        <div className="flex flex-col gap-2" style={{ opacity: rankVisible ? 1 : 0, transition: 'opacity 0.5s ease 0.1s' }}>
          {contextRanking.map((item, i) => {
            const rankColors = ['#F5A623', '#ADADBE', '#CD7F32']
            const isTop3 = item.rank <= 3
            return (
              <div key={item.rank} className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                style={{
                  background: item.isNew
                    ? 'linear-gradient(135deg, #EEF0FB, #F0EBF9)'
                    : 'white',
                  border: item.isNew ? '2px solid #7B8CDE' : '2px solid transparent',
                  transform: rankVisible ? 'translateX(0)' : 'translateX(-16px)',
                  opacity: rankVisible ? 1 : 0,
                  transition: `all 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 70}ms`,
                  boxShadow: item.isNew ? '0 4px 20px #7B8CDE22' : '0 1px 4px #0000000A',
                }}>
                {/* Rank number */}
                <div className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 28, height: 28, borderRadius: 10,
                    background: isTop3 ? rankColors[item.rank - 1] + '22' : '#F5F4F0',
                    color: isTop3 ? rankColors[item.rank - 1] : '#ADADBE',
                    fontSize: '13px', fontWeight: 800,
                  }}>
                  {isTop3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : item.rank}
                </div>
                {/* Building */}
                <div className="flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ width: 32, height: 32, background: getBuildingColor(item.bathroom.building) + '20', color: getBuildingColor(item.bathroom.building), fontSize: '11px', fontWeight: 800 }}>
                  {item.bathroom.building}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: '13px', fontWeight: 600, color: '#1C1C2E' }}>
                    {item.bathroom.location.replace(/^E[57] \d[a-z]+ Floor — /, '')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B6B7E' }}>F{item.bathroom.floor} · {genderMeta[item.bathroom.gender].label}</div>
                </div>
                {/* Score */}
                <ScoreChip score={item.bathroom.score} />
                {/* New badge */}
                {item.isNew && (
                  <div className="flex-shrink-0 px-1.5 py-0.5 rounded-full"
                    style={{ background: '#7B8CDE', fontSize: '9px', fontWeight: 700, color: 'white', letterSpacing: '0.05em' }}>
                    NEW
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid #ECEAE4', background: '#F7F5F1' }}>
        <button onClick={() => setScreen('home')} className="w-full py-4 transition-opacity active:opacity-80"
          style={{
            borderRadius: 16, fontSize: '16px', fontWeight: 700, color: 'white',
            background: 'linear-gradient(135deg, #7B8CDE 0%, #9B78D4 100%)',
            boxShadow: '0 4px 20px #7B8CDE44',
          }}>
          Done
        </button>
        <button onClick={() => setScreen('rankings')} className="w-full py-3 mt-2"
          style={{ fontSize: '14px', fontWeight: 600, color: '#7B8CDE' }}>
          See full rankings →
        </button>
      </div>
    </div>
  )
}

// ─── Screen 9: Rankings ───────────────────────────────────────────────────────

type SortCategory = 'score' | 'cleanliness' | 'accessibility' | 'hygiene' | 'privacy' | 'smell'

const SORT_OPTIONS: { key: SortCategory; label: string; icon: string }[] = [
  { key: 'score',         label: 'Overall Score', icon: '⭐' },
  { key: 'cleanliness',   label: 'Cleanliness',   icon: '🧹' },
  { key: 'accessibility', label: 'Accessibility',  icon: '♿' },
  { key: 'hygiene',       label: 'Hygiene',        icon: '🧴' },
  { key: 'privacy',       label: 'Privacy',        icon: '🔒' },
  { key: 'smell',         label: 'Smell',          icon: '🌿' },
]

function RankingsScreen({ setScreen }: { setScreen: (s: Screen) => void }) {
  const [sortBy, setSortBy] = useState<SortCategory>('score')
  const [showSortMenu, setShowSortMenu] = useState(false)

  const getSortVal = (b: Bathroom) => {
    if (sortBy === 'score') return b.score ?? 0
    return b.categories?.[sortBy] ?? 0
  }

  const ranked = [...BATHROOMS]
    .filter(b => b.score !== null)
    .sort((a, b) => getSortVal(b) - getSortVal(a))

  const sortLabel = SORT_OPTIONS.find(o => o.key === sortBy)!
  const podiumColors = ['#F5A623', '#ADADBE', '#CD7F32']
  const podiumLabels = ['🥇', '🥈', '🥉']

  return (
    <div className="flex flex-col h-full" style={{ background: '#F7F5F1' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1C1C2E' }}>My Rankings</h1>
          {/* Sort dropdown trigger */}
          <button onClick={() => setShowSortMenu(s => !s)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:opacity-70"
            style={{ background: showSortMenu ? '#EEF0FB' : 'white', border: `1.5px solid ${showSortMenu ? '#7B8CDE' : '#ECEAE4'}` }}>
            <span style={{ fontSize: '14px' }}>{sortLabel.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1C1C2E' }}>{sortLabel.label}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showSortMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <path d="M2 4l4 4 4-4" stroke="#6B6B7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p style={{ fontSize: '13px', color: '#6B6B7E' }}>{ranked.length} bathrooms rated</p>

        {/* Sort dropdown menu */}
        {showSortMenu && (
          <div className="mt-2 rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 8px 32px #00000015', border: '1px solid #ECEAE4' }}>
            {SORT_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => { setSortBy(opt.key); setShowSortMenu(false) }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-colors"
                style={{ background: sortBy === opt.key ? '#EEF0FB' : 'transparent', borderBottom: '1px solid #ECEAE4' }}>
                <span style={{ fontSize: '16px', width: 20, textAlign: 'center' }}>{opt.icon}</span>
                <span style={{ fontSize: '14px', fontWeight: sortBy === opt.key ? 700 : 500, color: sortBy === opt.key ? '#7B8CDE' : '#1C1C2E' }}>
                  {opt.label}
                </span>
                {sortBy === opt.key && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="ml-auto">
                    <path d="M2 7l3.5 3.5L12 4" stroke="#7B8CDE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto phone-scroll px-5 pb-4">
        {/* Podium — top 3 */}
        {ranked.length >= 3 && (
          <div className="mb-5">
            <div className="flex items-end gap-3 mb-1">
              {/* 2nd place */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-2xl p-3 text-center"
                  style={{ background: 'white', border: `2px solid ${podiumColors[1]}33`, boxShadow: '0 2px 12px #0000000A' }}>
                  <div style={{ fontSize: 22 }}>🥈</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1C1C2E', marginTop: 4 }}>
                    {ranked[1].building} F{ranked[1].floor}
                  </div>
                  <GenderBadge gender={ranked[1].gender} />
                  <div className="mt-2" style={{ fontSize: 20, fontWeight: 800, color: podiumColors[1] }}>
                    {getSortVal(ranked[1]).toFixed(1)}
                  </div>
                </div>
                <div style={{ height: 40, width: '70%', borderRadius: '8px 8px 0 0', background: podiumColors[1] + '44' }} />
              </div>

              {/* 1st place — tallest */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-2xl p-3 text-center"
                  style={{
                    background: 'linear-gradient(135deg, #FFF8ED, #FFFBF0)',
                    border: `2px solid ${podiumColors[0]}66`,
                    boxShadow: `0 4px 20px ${podiumColors[0]}33`,
                  }}>
                  <div style={{ fontSize: 26 }}>🥇</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1C1C2E', marginTop: 4 }}>
                    {ranked[0].building} F{ranked[0].floor}
                  </div>
                  <GenderBadge gender={ranked[0].gender} />
                  <div className="mt-2" style={{ fontSize: 24, fontWeight: 800, color: podiumColors[0] }}>
                    {getSortVal(ranked[0]).toFixed(1)}
                  </div>
                </div>
                <div style={{ height: 60, width: '70%', borderRadius: '8px 8px 0 0', background: podiumColors[0] + '55' }} />
              </div>

              {/* 3rd place */}
              <div className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-2xl p-3 text-center"
                  style={{ background: 'white', border: `2px solid ${podiumColors[2]}33`, boxShadow: '0 2px 12px #0000000A' }}>
                  <div style={{ fontSize: 22 }}>🥉</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1C1C2E', marginTop: 4 }}>
                    {ranked[2].building} F{ranked[2].floor}
                  </div>
                  <GenderBadge gender={ranked[2].gender} />
                  <div className="mt-2" style={{ fontSize: 20, fontWeight: 800, color: podiumColors[2] }}>
                    {getSortVal(ranked[2]).toFixed(1)}
                  </div>
                </div>
                <div style={{ height: 28, width: '70%', borderRadius: '8px 8px 0 0', background: podiumColors[2] + '44' }} />
              </div>
            </div>
            {/* Podium base */}
            <div style={{ height: 4, background: '#ECEAE4', borderRadius: 2 }} />
          </div>
        )}

        {/* Full ranked list */}
        <div className="flex flex-col gap-2">
          {ranked.map((bathroom, i) => {
            const rank = i + 1
            const isTop3 = rank <= 3
            const catVal = sortBy !== 'score' ? bathroom.categories?.[sortBy] : null
            return (
              <div key={bathroom.id} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                style={{
                  background: 'white',
                  border: isTop3 ? `1.5px solid ${podiumColors[rank - 1]}33` : '1.5px solid transparent',
                  boxShadow: '0 1px 4px #0000000A',
                }}>
                {/* Rank */}
                <div className="flex-shrink-0 flex items-center justify-center"
                  style={{
                    width: 30, height: 30, borderRadius: 10,
                    background: isTop3 ? podiumColors[rank - 1] + '22' : '#F5F4F0',
                    fontSize: isTop3 ? '16px' : '13px',
                    fontWeight: 800,
                    color: isTop3 ? podiumColors[rank - 1] : '#6B6B7E',
                  }}>
                  {isTop3 ? podiumLabels[rank - 1] : rank}
                </div>
                {/* Building */}
                <div className="flex-shrink-0 flex items-center justify-center rounded-lg"
                  style={{ width: 34, height: 34, background: getBuildingColor(bathroom.building) + '20', color: getBuildingColor(bathroom.building), fontSize: '12px', fontWeight: 800 }}>
                  {bathroom.building}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="truncate" style={{ fontSize: '13px', fontWeight: 600, color: '#1C1C2E' }}>
                    {bathroom.location.replace(/^E[57] \d[a-z]+ Floor — /, '')}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span style={{ fontSize: '11px', color: '#6B6B7E' }}>F{bathroom.floor}</span>
                    <GenderBadge gender={bathroom.gender} />
                  </div>
                </div>
                {/* Score + category highlight */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <ScoreChip score={bathroom.score} />
                  {catVal !== null && sortBy !== 'score' && (
                    <span style={{ fontSize: '10px', fontWeight: 600, color: scoreColor(catVal) }}>
                      {sortLabel.icon} {catVal.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── App Shell ────────────────────────────────────────────────────────────────

const ALL_SCREENS: { id: Screen; label: string }[] = [
  { id: 'splash', label: 'Splash' },
  { id: 'register', label: 'Register' },
  { id: 'login', label: 'Login' },
  { id: 'home', label: 'Home' },
  { id: 'detail', label: 'Detail' },
  { id: 'rate-select', label: 'Rate 1' },
  { id: 'rate-score', label: 'Rate 2' },
  { id: 'compare', label: 'Compare' },
  { id: 'compare-result', label: 'Result' },
  { id: 'rankings', label: 'Rankings' },
]

const TAB_SCREENS = new Set<Screen>(['home', 'detail', 'rankings'])

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [selected, setSelected] = useState<Bathroom>(BATHROOMS[0])
  const [ratingTarget, setRatingTarget] = useState<Bathroom>(BATHROOMS[3])
  const [activeTab, setActiveTab] = useState<string>('home')

  function handleSetScreen(s: Screen) {
    setScreen(s)
    if (s === 'home') setActiveTab('home')
    if (s === 'rankings') setActiveTab('rankings')
    if (s === 'rate-select') setActiveTab('rate')
  }

  const showTab = TAB_SCREENS.has(screen)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8 gap-6"
      style={{ background: '#E8E5DE' }}>
      {/* Phone frame */}
      <div style={{
        width: 390, height: 844, borderRadius: 52,
        background: '#F7F5F1',
        boxShadow: '0 32px 80px #00000030, 0 0 0 1px #00000015, inset 0 0 0 1px #ffffff40',
        overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column',
      }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-8 pt-4 pb-1 flex-shrink-0"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, pointerEvents: 'none' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1C1C2E' }}>9:41</span>
          <div style={{ width: 120, height: 28, borderRadius: 16, background: '#1C1C2E', marginTop: -4 }} />
          <div className="flex gap-1 items-center">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="#1C1C2E">
              <rect x="0" y="5" width="3" height="7" rx="1" />
              <rect x="4.5" y="3" width="3" height="9" rx="1" />
              <rect x="9" y="1" width="3" height="11" rx="1" />
              <rect x="13.5" y="0" width="2.5" height="12" rx="1" opacity="0.3" />
            </svg>
          </div>
        </div>

        {/* Screen content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {screen === 'splash'          && <SplashScreen setScreen={handleSetScreen} />}
          {screen === 'register'        && <RegisterScreen setScreen={handleSetScreen} />}
          {screen === 'login'           && <LoginScreen setScreen={handleSetScreen} />}
          {screen === 'home'            && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-hidden">
                <HomeScreen setScreen={handleSetScreen} setSelected={b => { setSelected(b) }} />
              </div>
              <TabBar active={activeTab} setScreen={handleSetScreen} />
            </div>
          )}
          {screen === 'detail'          && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-hidden">
                <DetailScreen bathroom={selected} setScreen={handleSetScreen} />
              </div>
              <TabBar active={activeTab} setScreen={handleSetScreen} />
            </div>
          )}
          {screen === 'rate-select'     && <RateSelectScreen setScreen={handleSetScreen} setRatingTarget={setRatingTarget} />}
          {screen === 'rate-score'      && <RateScoreScreen bathroom={ratingTarget} setScreen={handleSetScreen} />}
          {screen === 'compare'         && <CompareScreen setScreen={handleSetScreen} />}
          {screen === 'compare-result'  && <CompareResultScreen setScreen={handleSetScreen} />}
          {screen === 'rankings'        && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-hidden">
                <RankingsScreen setScreen={handleSetScreen} />
              </div>
              <TabBar active={activeTab} setScreen={handleSetScreen} />
            </div>
          )}
        </div>
      </div>

      {/* Screen nav */}
      <div className="flex flex-wrap gap-1.5 justify-center max-w-sm px-4 pb-2"
        style={{ background: 'white', borderRadius: 20, padding: '10px 14px', boxShadow: '0 4px 20px #00000015' }}>
        {ALL_SCREENS.map(s => (
          <button key={s.id} onClick={() => handleSetScreen(s.id)}
            className="px-3 py-1.5 rounded-full transition-all"
            style={{
              background: screen === s.id ? '#7B8CDE' : '#F5F4F0',
              color: screen === s.id ? 'white' : '#6B6B7E',
              fontSize: '11px', fontWeight: 600,
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Keyframe for spinner */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
