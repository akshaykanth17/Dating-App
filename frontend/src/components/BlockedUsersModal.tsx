import { useEffect, useState } from 'react';
import { ShieldAlert, X, Unlock, UserX } from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface BlockedUser {
  id: string;
  name: string;
  photoUrl: string | null;
  blockedAt: string;
}

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BlockedUsersModal({ isOpen, onClose }: BlockedUsersModalProps) {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBlockedUsers();
    }
  }, [isOpen]);

  const fetchBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<{ blockedUsers: BlockedUser[] }>('/safety/blocked');
      setBlockedUsers(response.blockedUsers || []);
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    setUnblockingId(blockedId);
    try {
      await api.delete(`/safety/block/${blockedId}`);
      setBlockedUsers(prev => prev.filter(user => user.id !== blockedId));
    } catch (error) {
      console.error('Failed to unblock user:', error);
      alert('Failed to unblock user. Please try again.');
    } finally {
      setUnblockingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm sm:overflow-y-auto">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-slate-900 sm:rounded-2xl border-t sm:border border-slate-800 w-full sm:max-w-md flex flex-col max-h-[90vh] sm:max-h-[85vh] shadow-2xl relative"
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Blocked Users</h2>
              <p className="text-xs text-slate-400 font-medium">Manage blocked profiles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400 font-medium">Loading blocked users...</p>
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-2">
                <UserX className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-300 font-bold">No blocked users</p>
              <p className="text-xs text-slate-500 max-w-[200px]">You haven't blocked anyone yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {blockedUsers.map(user => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 group"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-slate-700" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center">
                          <span className="text-slate-400 font-bold text-lg">{user.name.charAt(0)}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 truncate">{user.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          Blocked on {new Date(user.blockedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleUnblock(user.id)}
                      disabled={unblockingId === user.id}
                      className="ml-3 px-3.5 py-1.5 rounded-lg bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center space-x-1 disabled:opacity-50 flex-shrink-0"
                    >
                      {unblockingId === user.id ? (
                        <span className="animate-pulse">Unblocking...</span>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 mr-1" />
                          <span>Unblock</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
