/* === AfroGO — Icon Map (Lucide) ===
   Centralized icon registry — all SVG icons in one place */

import {
  // Navigation
  Home, Radio, Disc3, User, Search, Bell, BellRing, Check, ChevronRight, ChevronUp, ChevronDown, ArrowLeft, ArrowDown, MoreHorizontal, MapPin, X,
  // Media
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Heart, Volume2,
  // Social
  MessageCircle, Share2, Gift, ThumbsUp, Plus, Send,
  // Tools
  Camera, Upload, Sparkles, Scissors, Palette, Type, Gauge,   // Library
  Download, BookOpen, Crown, Music, FolderOpen, Clock, ListMusic,
  // Profile
  Settings, LogOut, HelpCircle, UserCog, ShoppingBag, Wifi, Smartphone, Globe, CreditCard, Shield, Info,
  // Voice
  Mic, MicOff,
} from 'lucide-react'

/* Map icon name → Lucide component */
export const Icon = {
  // Tab bar
  home: Home, radio: Radio, library: Disc3, profile: User,

  // Header
  search: Search, bell: Bell, chevronRight: ChevronRight, arrowLeft: ArrowLeft,
  arrowDown: ArrowDown, more: MoreHorizontal,

  // Player
  play: Play, pause: Pause, prev: SkipBack, next: SkipForward,
  shuffle: Shuffle, repeat: Repeat, heart: Heart, volume: Volume2,

  // Social actions
  comment: MessageCircle, share: Share2, gift: Gift, like: ThumbsUp,
  plus: Plus, send: Send,

  // Create tools
  camera: Camera, upload: Upload, sparkles: Sparkles, scissors: Scissors,
  palette: Palette, type: Type, gauge: Gauge,

  // Library
  download: Download, book: BookOpen, crown: Crown, music: Music,
  folder: FolderOpen, clock: Clock, list: ListMusic,

  // Profile
  settings: Settings, logout: LogOut, help: HelpCircle, userCog: UserCog,
  shop: ShoppingBag, wifi: Wifi, smartphone: Smartphone,

  // Voice
  mic: Mic, micOff: MicOff,
}

/* Re-export individual icons for direct import */
export {
  Home, Radio, Disc3, User, Search, Bell, BellRing, Check, ChevronRight, ChevronUp, ChevronDown, ArrowLeft, ArrowDown, MoreHorizontal, MapPin, X,
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Heart,
  MessageCircle, Share2, Gift, ThumbsUp, Plus, Send,
  Camera, Upload, Sparkles, Scissors, Palette, Type, Gauge,
  Download, BookOpen, Crown, Music, FolderOpen, Clock, ListMusic,
  Settings, LogOut, HelpCircle, UserCog, ShoppingBag, Wifi, Smartphone, Globe, CreditCard, Shield, Info,
  Mic, MicOff,
}
