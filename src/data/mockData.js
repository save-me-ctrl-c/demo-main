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
  { name: 'Azonto Basic', difficulty: 'Beginner', icon: '💃', image: '/media/templates/template-azonto.png' },
  { name: 'Amapiano Groove', difficulty: 'Intermediate', icon: '🕺', image: '/media/templates/template-amapiano.png' },
  { name: 'Viral Challenge', difficulty: 'Any Level', icon: '🔥', image: '/media/templates/template-viral.png' },
  { name: 'Dance Battle', difficulty: 'Advanced', icon: '⚡', image: '/media/templates/template-dance-battle.png' },
  { name: 'Duet Creator', difficulty: 'Any Level', icon: '👥', image: '/media/templates/template-duet.png' },
  { name: 'Slow Motion', difficulty: 'Any Level', icon: '🎬', image: '/media/templates/template-slowmo.png' },
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

// ========================
// AI Dance Mentors — detailed instructor profiles
// ========================
export const mentors = [
  {
    id: 'm1',
    name: 'Zuri',
    avatar: '🤖💃',
    specialty: 'Afrobeat & Azonto',
    description: 'Zuri是加纳阿克拉走出的Afrobeat女王，拥有10年+教学经验。她深谙Azonto、Afrobeat及加纳传统舞蹈，动作刚柔并济，完美展现非洲女性的力量与优雅。从零基础到进阶，Zuri的课程让每位舞者都能找到自己的节奏。',
    descriptionEn: 'Zuri is the Afrobeat queen from Accra, Ghana, with 10+ years of teaching experience. She masters Azonto, Afrobeat, and traditional Ghanaian dance, blending power with grace. Her courses guide every dancer from beginner to advanced, finding their unique rhythm.',
    color: '#FF6B35',
    level: 'All Levels',
    students: '12.4K',
    styles: ['Azonto', 'Afrobeat', 'Ghanaian Traditional', 'Alkayida'],
    highlight: '加纳Afrobeat天后 · 10年教学经验',
    packs: [
      { name: 'Azonto入门基础包', desc: '10个Azonto核心动作 · 分步详解', icon: '💃', size: '48 MB', lessons: 10, duration: '1h 20m' },
      { name: 'Afrobeat精通课', desc: '高阶编舞与Freestyle技巧', icon: '🔥', size: '85 MB', lessons: 15, duration: '2h 45m' },
    ],
  },
  {
    id: 'm2',
    name: 'Amara',
    avatar: '🤖🕺',
    specialty: 'Amapiano & House',
    description: 'Amara是南非约翰内斯堡的Amapiano先锋导师。专精Log Drum节奏、病毒式挑战舞蹈和派对舞步，她的课程充满律动感与街头活力。无论你是想掌握最新Amapiano舞步还是House基础，Amara都能带你入门。',
    descriptionEn: 'Amara is the Amapiano pioneer from Johannesburg, South Africa. Specializing in log drum grooves, viral challenges, and party moves, her courses pulse with rhythm and street energy. From latest Amapiano steps to House foundations, Amara has you covered.',
    color: '#40C4D8',
    level: 'Beginner+',
    students: '18.9K',
    styles: ['Amapiano', 'House', 'Pouncing Cat', 'Dudula'],
    highlight: '南非Amapiano先锋 · 病毒舞蹈专家',
    packs: [
      { name: 'Amapiano律动课', desc: 'Log Drum基础与热门Amapiano套路', icon: '🎹', size: '62 MB', lessons: 12, duration: '2h 10m' },
      { name: 'House舞蹈精要', desc: '脚步基础、Jacking与南非House风格', icon: '🏠', size: '55 MB', lessons: 8, duration: '1h 30m' },
    ],
  },
  {
    id: 'm3',
    name: 'Kofi',
    avatar: '🤖🎯',
    specialty: 'Highlife & Fusion',
    description: 'Kofi擅长将传统非洲舞蹈与现代编舞融合。他以Highlife为基础，融入当代Afro-Fusion元素，创造出独一无二的舞蹈风格。适合有一定基础的舞者，探索非洲舞蹈的深厚文化底蕴与现代创新。',
    descriptionEn: 'Kofi blends traditional African dance with modern choreography. Using Highlife as his foundation with contemporary Afro-Fusion elements, he creates unique dance styles. Perfect for dancers with some experience seeking Africa\'s deep cultural roots with modern innovation.',
    color: '#FFB703',
    level: 'Intermediate',
    students: '8.2K',
    styles: ['Highlife', 'Afro-Fusion', 'Traditional', 'Contemporary'],
    highlight: '传统与现代融合大师 · 文化传承者',
    packs: [
      { name: 'Highlife基础课', desc: '传统Highlife舞步与现代融合技巧', icon: '🎷', size: '40 MB', lessons: 8, duration: '1h 10m' },
    ],
  },
  {
    id: 'm4',
    name: 'Nia',
    avatar: '🤖✨',
    specialty: 'Kizomba & Semba',
    description: 'Nia来自安哥拉罗安达，是Kizomba与Semba的权威导师。她的教学注重双人配合、身体律动与技术细节，从基础步伐到高级旋转，带你领略安哥拉最性感的舞蹈魅力。适合想深入学习Kizomba的舞者。',
    descriptionEn: 'Nia from Luanda, Angola, is the authority on Kizomba & Semba. Her teaching focuses on partner connection, body movement, and technical detail — from basic steps to advanced turns. Experience Angola\'s most sensual dance style.',
    color: '#FF5C8A',
    level: 'All Levels',
    students: '15.1K',
    styles: ['Kizomba', 'Semba', 'Tarraxinha', 'Partner Work'],
    highlight: '安哥拉Kizomba权威 · 双人舞专家',
    packs: [
      { name: 'Kizomba连接课', desc: '双人配合、引领跟随、性感Kizomba', icon: '💑', size: '70 MB', lessons: 14, duration: '3h 0m' },
    ],
  },
  {
    id: 'm5',
    name: 'Tunde',
    avatar: '🤖🔥',
    specialty: 'Street & Viral',
    description: 'Tunde是TikTok上的病毒舞蹈制造机！他精通短视频编舞、挑战赛套路和街头舞蹈融合，课程节奏快、趣味性强，每节课都能让你学会一支吸睛热舞。适合任何水平的舞者，随时随地开启舞蹈挑战。',
    descriptionEn: 'Tunde is the viral dance sensation from TikTok! Mastering short-form choreography, challenge routines, and street dance fusion — his courses are fast-paced and fun. Every lesson teaches you an eye-catching routine. Any level, anywhere, start your dance challenge.',
    color: '#00E676',
    level: 'Any Level',
    students: '28.3K',
    styles: ['Street Dance', 'Viral Challenges', 'Freestyle', 'TikTok Trends'],
    highlight: 'TikTok病毒舞蹈制造机 · 28000+学员',
    packs: [
      { name: '病毒挑战包', desc: '15个热门舞蹈挑战+教学视频', icon: '📱', size: '95 MB', lessons: 15, duration: '2h 30m' },
    ],
  },
  {
    id: 'm6',
    name: 'Sade',
    avatar: '🤖👑',
    specialty: 'Afro-Latin Fusion',
    description: 'Sade是跨界舞蹈女王，将Afrobeat的热力与拉丁节奏完美融合。她精通Salsa、Bachata与Afro-Caribbean风格，创造出独特的Afro-Latin舞蹈体系。适合中高级舞者，探索非洲与拉美舞蹈的奇妙交汇。',
    descriptionEn: 'Sade is the crossover dance queen, blending Afrobeat heat with Latin rhythms. She masters Salsa, Bachata, and Afro-Caribbean styles, creating a unique Afro-Latin dance system. For intermediate+ dancers exploring the fascinating intersection of African and Latin dance.',
    color: '#B388FF',
    level: 'Intermediate+',
    students: '6.7K',
    styles: ['Salsa', 'Bachata', 'Afro-Caribbean', 'Crossover'],
    highlight: '跨界舞蹈女王 · 非洲x拉丁融合',
    packs: [
      { name: 'Afro-Latin融合课', desc: 'Salsa遇见Afrobeat · 跨界编舞', icon: '💃🔥', size: '58 MB', lessons: 10, duration: '1h 50m' },
    ],
  },
]

export const menuItems = [
  { icon: '👑', label: 'Member Center', badge: 'GOLD', accent: true },
  { icon: '🎁', label: 'Points Mall', badge: '12,450 pts' },
  { icon: '🔊', label: 'Device Manager', badge: 'Connected', online: true },
  { icon: '🔔', label: 'Notifications' },
  { icon: '⚙️', label: 'Settings' },
  { icon: '❓', label: 'Help Center' },
]
