/* === AfroGo — Complete Dance App Mock Data === */

// ========================
// Tab1: Social Square — Videos
// ========================
export const videos = [
  {
    id: 'v1',
    user: { name: 'Amina Diallo', avatar: '👩🏾‍🦱', verified: true, followers: '24.5K' },
    desc: 'Azonto vibes tonight! Practicing my favorite moves 🔥 #Azonto #AfroDance',
    song: 'Essence — Wizkid ft. Tems',
    likes: '12.8K', comments: '842', shares: '3.2K', tips: '1.2K',
    color: '#1EABBE',
    dance: 'Azonto',
    region: 'Accra, Ghana',
  },
  {
    id: 'v2',
    user: { name: 'Chioma Okafor', avatar: '👩🏾', verified: true, followers: '56.2K' },
    desc: 'Amapiano step breakdown — save & practice! 🕺 #Amapiano',
    song: 'Water — Tyla',
    likes: '28.4K', comments: '1.5K', shares: '8.1K', tips: '3.6K',
    color: '#40C4D8',
    dance: 'Amapiano',
    region: 'Lagos, Nigeria',
  },
  {
    id: 'v3',
    user: { name: 'Kwame Mensah', avatar: '👨🏾‍🦱', verified: false, followers: '8.9K' },
    desc: 'Traditional meets modern — Afro fusion 💃 #Highlife',
    song: 'Calm Down — Rema',
    likes: '6.7K', comments: '324', shares: '1.8K', tips: '480',
    color: '#158A9C',
    dance: 'Highlife',
    region: 'Kumasi, Ghana',
  },
  {
    id: 'v4',
    user: { name: 'Zuri Uzoma', avatar: '👩🏾‍🦳', verified: true, followers: '142K' },
    desc: 'Freestyle to this banger 🔊 #Afrobeat',
    song: 'Unavailable — Davido ft. Musa Keys',
    likes: '89.2K', comments: '4.8K', shares: '22K', tips: '9.1K',
    color: '#1EABBE',
    dance: 'Afrobeat',
    region: 'Nairobi, Kenya',
  },
  {
    id: 'v5',
    user: { name: 'Fatima Sow', avatar: '👩🏾', verified: false, followers: '3.4K' },
    desc: 'Day 1 vs Day 30 Kizomba — progress is everything ✨ #Kizomba',
    song: 'Bo Tem Mel — Nelson Freitas',
    likes: '1.8K', comments: '156', shares: '420', tips: '120',
    color: '#40C4D8',
    dance: 'Kizomba',
    region: 'Dakar, Senegal',
  },
  {
    id: 'v6',
    user: { name: 'Tendai Moyo', avatar: '👨🏾', verified: true, followers: '33.1K' },
    desc: 'Gwara Gwara challenge — can you do it? 🤔 #GwaraGwara',
    song: 'Kulala — DJ Maphorisa',
    likes: '15.3K', comments: '920', shares: '5.4K', tips: '2.1K',
    color: '#158A9C',
    dance: 'Gwara Gwara',
    region: 'Harare, Zimbabwe',
  },
  {
    id: 'v7',
    user: { name: 'Oluwaseun Bello', avatar: '👨🏾‍🦱', verified: true, followers: '78.3K' },
    desc: '10 styles in 60 seconds — how many can you name? 🏆',
    song: 'Afro Medley 2026',
    likes: '110K', comments: '6.3K', shares: '35K', tips: '14K',
    color: '#1EABBE',
    dance: 'Multi-Style',
    region: 'Johannesburg, SA',
  },
]

// ========================
// Tab1: Topics & Rankings
// ========================
export const topics = [
  { name: '#AzontoChallenge', posts: '15.2K' },
  { name: '#AmapianoMoves', posts: '28.7K' },
  { name: '#AfroDance2026', posts: '42.1K' },
  { name: '#DanceTutorial', posts: '18.9K' },
  { name: '#GwaraGwara', posts: '9.3K' },
]

export const rankings = [
  { rank: 1, name: 'Amina Diallo', score: '24.5K', type: 'Top Dancer' },
  { rank: 2, name: 'Chioma Okafor', score: '18.2K', type: 'Rising Star' },
  { rank: 3, name: 'Kwame Mensah', score: '15.1K', type: 'Best Tutorial' },
]

// ========================
// Tab2: Creation Center — Tools & Templates
// ========================
export const aiTools = [
  { icon: '✨', label: 'AI Beautify', key: 'tool_ai_beautify' },
  { icon: '🖼️', label: 'Smart Cutout', key: 'tool_cutout' },
  { icon: '🔧', label: 'Quality Fix', key: 'tool_quality' },
  { icon: '🎨', label: 'Smart Palette', key: 'tool_palette' },
]

export const templates = [
  { name: 'Azonto Basic', difficulty: 'Beginner', icon: '💃' },
  { name: 'Amapiano Groove', difficulty: 'Intermediate', icon: '🕺' },
  { name: 'Viral Challenge', difficulty: 'Any Level', icon: '🔥' },
  { name: 'Dance Battle', difficulty: 'Advanced', icon: '⚡' },
  { name: 'Duet Creator', difficulty: 'Any Level', icon: '👥' },
  { name: 'Slow Motion', difficulty: 'Any Level', icon: '🎬' },
]

export const drafts = [
  { title: 'Untitled Draft', date: '3 hours ago', color: '#B388FF' },
  { title: 'Azonto Practice', date: 'Yesterday', color: '#1EABBE' },
]

// ========================
// Tab3: Library — Playlists & Resources
// ========================
export const libraryTabs = ['All', 'Offline', 'Online', 'AI Teaching', 'VIP']

export const playlists = [
  { id: 'pl1', name: 'Afrobeats 2026', icon: '🎵', color: '#1EABBE', songs: 48, type: 'online', desc: 'Hottest Afrobeats tracks' },
  { id: 'pl2', name: 'Amapiano Essentials', icon: '🎹', color: '#40C4D8', songs: 36, type: 'online', desc: 'Deep log drums & soulful vibes' },
  { id: 'pl3', name: 'Azonto Classics', icon: '💃', color: '#FF8C3D', songs: 24, type: 'offline', size: '128 MB', downloaded: true },
  { id: 'pl4', name: 'AI Dance Level 1', icon: '🤖', color: '#B388FF', lessons: 12, type: 'teaching', duration: '2h 30m' },
  { id: 'pl5', name: 'Highlife Fusion', icon: '🎷', color: '#00E676', songs: 32, type: 'online', desc: 'Tradition meets modern' },
  { id: 'pl6', name: 'Master Class', icon: '👑', color: '#FFB703', songs: 20, type: 'vip', locked: true },
  { id: 'pl7', name: 'Kizomba Nights', icon: '🌙', color: '#448AFF', songs: 28, type: 'online', desc: 'Smooth rhythms' },
  { id: 'pl8', name: 'SA Dance Pack', icon: '🇿🇦', color: '#FF5C8A', songs: 22, type: 'offline', size: '96 MB' },
]

export const songs = [
  { id: 's1', title: 'Funky Lagos', artist: 'AfroGroove Collective', duration: '3:42', genre: 'Afrobeat', dance: 'Azonto',
    color: '#1EABBE', file: '/api/stream/Funky_Lagos.mp3',
    aliases: ['Funky Lagos', 'Lagos', 'funky', 'AfroGroove'] },
  { id: 's2', title: 'Nadeya', artist: 'Sona Jobarteh', duration: '4:15', genre: 'Afro-Fusion', dance: 'Kizomba',
    color: '#B388FF', file: '/api/stream/Nadeya.mp3',
    aliases: ['Nadeya', 'Sona', 'Jobarteh'] },
  { id: 's3', title: 'Take Some Time', artist: 'The Cooltrane Quartet', duration: '5:28', genre: 'Jazz', dance: 'Slow Dance',
    color: '#FF8C3D', file: '/api/stream/Take_Some_Time.mp3',
    aliases: ['Take Some Time', 'Cooltrane', 'take time'] },
  { id: 's4', title: 'Dance In The Rain', artist: 'JP Cooper', duration: '3:10', genre: 'Afro-Pop', dance: 'Contemporary',
    color: '#40C4D8', file: '/api/stream/Dance_In_The_Rain.mp3',
    aliases: ['Dance In The Rain', 'dance rain', 'JP Cooper', 'Cooper'] },
  { id: 's5', title: 'For You I\'ll Go There', artist: 'The Smooth Jazz Allstars', duration: '4:02', genre: 'Jazz', dance: 'Slow Dance',
    color: '#158A9C', file: '/api/stream/For_You_I_ll_Go_There.mp3',
    aliases: ['For You', 'go there', 'Smooth Jazz', 'Allstars'] },
  { id: 's6', title: 'Bootlickers House Remix', artist: 'The Bootlickers', duration: '3:22', genre: 'House', dance: 'Amapiano',
    color: '#00E676', file: '/api/stream/Bootlickers_House_Remix.mp3',
    aliases: ['Bootlickers', 'house remix', 'bootlicker', 'house'] },
  { id: 's7', title: 'Gas and Gravity', artist: 'The Crystal Method', duration: '4:48', genre: 'Electronic', dance: 'Freestyle',
    color: '#448AFF', file: '/api/stream/Gas_and_Gravity.mp3',
    aliases: ['Gas and Gravity', 'gas gravity', 'Crystal Method', 'crystal'] },
  { id: 's8', title: 'Around the Corner', artist: 'The Smooth Jazz Allstars', duration: '3:35', genre: 'Jazz', dance: 'Slow Dance',
    color: '#FFB703', file: '/api/stream/Around_The_Corner.mp3',
    aliases: ['Around the Corner', 'around corner', 'Smooth Jazz', 'corner'] },
  { id: 's9', title: 'World Fusion Music', artist: 'Global Beats Ensemble', duration: '4:55', genre: 'World', dance: 'Highlife',
    color: '#FF5C8A', file: '/api/stream/World_Fusion_Music.mp3',
    aliases: ['World Fusion', 'world music', 'fusion', 'Global Beats', 'global'] },
]

// ========================
// Tab4: Profile
// ========================
export const userProfile = {
  name: 'Amina Diallo',
  id: '@amina_dances',
  avatar: '👩🏾‍🦱',
  bio: 'Dancer · Choreographer · Afrobeat lover\nBased in Accra, Ghana 🇬🇭',
  memberLevel: 'gold',
  points: '12,450',
  followers: '24.5K',
  following: '1,280',
  likes: '142K',
  posts: 86,
  drafts: 3,
  favorites: 152,
  tipsReceived: '8,920',
  device: { name: 'Transsion Smart Speaker', model: 'TS-200', connected: true },
}

export const menuItems = [
  { icon: '👑', label: 'Member Center', badge: 'GOLD', accent: true },
  { icon: '🎁', label: 'Points Mall', badge: '12,450 pts' },
  { icon: '🔊', label: 'Device Manager', badge: 'Connected', online: true },
  { icon: '🔔', label: 'Notifications' },
  { icon: '⚙️', label: 'Settings' },
  { icon: '❓', label: 'Help Center' },
]
