const mediaUrl = (folder, file) => encodeURI(`/media/${folder}/${file}`)

export const HEAD_ICONS = [
  mediaUrl('head-icon', '豆包笑一个.png'),
  mediaUrl('head-icon', '豆包笑一个 (1).png'),
  mediaUrl('head-icon', '豆包笑一个 (2).png'),
]

export const MUSIC_COVERS = Array.from({ length: 9 }, (_, index) =>
  mediaUrl('music-cover', `豆包笑一个 (${index + 3}).png`)
)

const normalize = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const SONG_COVER_INDEX = {
  funkylagos: 0,
  nadeya: 1,
  takesometime: 2,
  danceintherain: 3,
  foryouillgothere: 4,
  foryouwillgo: 4,
  bootlickershouseremix: 5,
  gasandgravity: 6,
  aroundthecorner: 7,
  worldfusionmusic: 8,
}

const AVATAR_INDEX = {
  aminadiallo: 0,
  chiomaokafor: 1,
  oluwaseunbello: 2,
  kwamemensah: 2,
  zuriuzoma: 0,
  fatimasow: 1,
  tendaimoyo: 2,
}

export function songCoverFor(songOrTitle, fallbackIndex = 0) {
  const title = typeof songOrTitle === 'string' ? songOrTitle : songOrTitle?.title
  const mappedIndex = SONG_COVER_INDEX[normalize(title)]
  return MUSIC_COVERS[mappedIndex ?? (fallbackIndex % MUSIC_COVERS.length)]
}

export function avatarFor(userOrName, fallbackIndex = 0) {
  const name = typeof userOrName === 'string' ? userOrName : userOrName?.name
  const mappedIndex = AVATAR_INDEX[normalize(name)]
  return HEAD_ICONS[mappedIndex ?? (fallbackIndex % HEAD_ICONS.length)]
}

export function withSongArtwork(song, index = 0) {
  return { ...song, coverUrl: songCoverFor(song, index) }
}

