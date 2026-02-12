import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  FileText,
  Upload,
  History,
  User,
  Settings,
  LogOut,
  BarChart3,
  BookOpen,
  FileSearch,
  FileStack,
  Sparkles,
  Network,
  MessageSquare,
  StickyNote,
  FolderKanban,
  Download,
  MessageCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiGetMe } from '../../api/auth.api';
import { useI18n } from '../../i18n';
import Logo from '../common/Logo';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

type NavSection = {
  title: string;
  items: NavItem[];
};

interface SideNavProps {
  onLogout: () => void;
  onNavigate?: () => void;
}

type Me = {
  id: string;
  name: string;
  email: string;
};

function initials(email?: string) {
  if (!email) return 'U';
  return email.slice(0, 2).toUpperCase();
}

export default function SideNav({ onLogout, onNavigate }: SideNavProps) {
  const { t } = useI18n();
  const [me, setMe] = useState<Me | null>(null);
  const navSections: NavSection[] = [
    {
      title: t('Core'),
      items: [
        { to: '/dashboard', label: t('Home'), icon: <Home className="w-4 h-4" /> },
        { to: '/dashboard/query-text', label: t('Query Text'), icon: <FileText className="w-4 h-4" /> },
        { to: '/dashboard/query-file', label: t('Query File'), icon: <Upload className="w-4 h-4" /> },
        { to: '/dashboard/query-result', label: t('Query Result'), icon: <Sparkles className="w-4 h-4" /> },
        { to: '/dashboard/history', label: t('History'), icon: <History className="w-4 h-4" /> },
        { to: '/dashboard/paper-explorer', label: t('Paper Explorer'), icon: <FileSearch className="w-4 h-4" /> },
        { to: '/dashboard/paper-detail', label: t('Paper Detail'), icon: <BookOpen className="w-4 h-4" /> },
        { to: '/dashboard/paper-summary', label: t('Paper Summary'), icon: <FileStack className="w-4 h-4" /> },
      ],
    },
    {
      title: t('Intelligence'),
      items: [
        { to: '/dashboard/analytics', label: t('Analytics'), icon: <BarChart3 className="w-4 h-4" /> },
        { to: '/dashboard/connected-graph', label: t('Connected Graph'), icon: <Network className="w-4 h-4" /> },
        { to: '/dashboard/chatbot', label: t('AI Chatbot'), icon: <MessageSquare className="w-4 h-4" /> },
        { to: '/dashboard/notes', label: t('Notes'), icon: <StickyNote className="w-4 h-4" /> },
      ],
    },
    {
      title: t('Productivity'),
      items: [
        { to: '/dashboard/collections', label: t('Collections'), icon: <FolderKanban className="w-4 h-4" /> },
        { to: '/dashboard/downloads', label: t('Downloads'), icon: <Download className="w-4 h-4" /> },
        { to: '/dashboard/feedback', label: t('Feedback'), icon: <MessageCircle className="w-4 h-4" /> },
      ],
    },
    {
      title: t('Account'),
      items: [
        { to: '/dashboard/profile', label: t('Profile'), icon: <User className="w-4 h-4" /> },
        { to: '/dashboard/settings', label: t('Settings'), icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  /* ---------------- Fetch real user ---------------- */
  useEffect(() => {
    apiGetMe()
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="h-full flex flex-col bg-[var(--bg-secondary)] border-r border-white/10"
    >
      {/* Brand */}
      <div className="h-20 flex items-center px-6 border-b border-white/10">
        <Logo size={40} title="Research Paper Assistant" subtitle={t('AI-Powered')} />
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-custom">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="px-3 mb-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) =>
                    isActive ? 'nav-item active' : 'nav-item'
                  }
                  onClick={() => onNavigate?.()}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer user */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="glass-soft rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center font-bold">
            {initials(me?.email)}
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {me?.name || t('User')}
            </div>
            <div className="text-xs text-white/50 truncate">
              {me?.email || ''}
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="nav-item w-full text-red-300 hover:bg-red-500/10"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('Logout')}</span>
        </button>
      </div>
    </motion.aside>
  );
}
