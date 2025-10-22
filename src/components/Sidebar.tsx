import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Settings, 
  Video,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Instagram,
  LogOut,
  Archive,
  Calendar,
  FileText,
  Library,
  Bell
} from 'lucide-react';
import { useStore } from '../store';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useStore();
  const { signOut } = useAuth();

  const menuItems = [
    { path: '/', icon: Video, label: 'Videos', exact: true },
    { path: '/ad-creatives', icon: Instagram, label: 'Ad Creatives', exact: false },
    { path: '/content-plan', icon: Calendar, label: 'Content Plan', exact: false },
    { path: '/release-sheets', icon: FileText, label: 'Release Sheets', exact: false },
    { path: '/library', icon: Library, label: 'Video Library', exact: false },
    { path: '/artists', icon: Users, label: 'Artist Management', exact: false },
    { path: '/whatsapp', icon: MessageSquare, label: 'WhatsApp Logs', exact: false },
    { path: '/archive', icon: Archive, label: 'Archive', exact: false },
    { path: '/notifications', icon: Bell, label: 'Notifications', exact: false },
    { path: '/settings', icon: Settings, label: 'Settings', exact: false }
  ];

  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const sidebarVariants = {
    open: { width: '16rem' },
    closed: { width: '4rem' }
  };

  const textVariants = {
    open: { opacity: 1, x: 0, display: 'block' },
    closed: { opacity: 0, x: -10, transitionEnd: { display: 'none' } }
  };

  return (
    <motion.aside 
      className="h-full bg-white dark:bg-[#060a11] shadow-lg flex flex-col flex-shrink-0"
      animate={sidebarOpen ? 'open' : 'closed'}
      variants={sidebarVariants}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="flex-1">
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-white" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span 
                  className="text-lg font-semibold text-gray-900 dark:text-white truncate"
                  variants={textVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  VideoFeedback
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </motion.button>
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-2 text-sm ${
                    isActive(item.path, item.exact)
                      ? 'text-white bg-[#0000fe]'
                      : 'text-gray-300 hover:bg-dark-700/50 hover:text-white'
                  } cursor-pointer`}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                  </motion.div>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span 
                        className="ml-3 truncate"
                        variants={textVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Logout Button */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-dark-700">
        <motion.button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-dark-700/50 hover:text-red-300 rounded-md transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span 
                className="ml-3"
                variants={textVariants}
                initial="closed"
                animate="open"
                exit="closed"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
}