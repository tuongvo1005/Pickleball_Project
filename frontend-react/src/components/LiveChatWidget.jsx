import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthContext } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const LiveChatWidget = () => {
  const { user, token } = useAuthContext();
  const toast = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [adminDetails, setAdminDetails] = useState({ name: 'Admin Hỗ Trợ', avatar: null });
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const backgroundPollingRef = useRef(null);

  // Handle external open chat trigger (e.g. from Footer)
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener('openLiveChat', handleOpen);
    return () => {
      window.removeEventListener('openLiveChat', handleOpen);
    };
  }, []);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages thread
  const fetchMessages = async (silent = false) => {
    if (!token || !user) return;
    // Admins do not use the customer chat widget
    if (user.role === 'admin') return;

    try {
      const response = await axios.get('http://127.0.0.1:8000/api/messages/thread/admin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        const newMsgs = response.data.data;
        
        // Detect if there is a new message from Admin to play a subtle notification sound or show toast
        if (messages.length > 0 && newMsgs.length > messages.length) {
          const lastMsg = newMsgs[newMsgs.length - 1];
          if (lastMsg.sender_id !== user.id && !silent) {
            // Play notification
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
              audio.volume = 0.4;
              audio.play();
            } catch (e) {
              console.log('Audio autoplay blocked by browser.');
            }
            toast.info(`Tin nhắn mới từ Hỗ Trợ: "${lastMsg.message.substring(0, 30)}${lastMsg.message.length > 30 ? '...' : ''}"`);
          }
        }
        
        setMessages(newMsgs);
        if (response.data.admin) {
          setAdminDetails(response.data.admin);
        }
        setUnreadCount(0); // Reset unread when checking active thread
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
  };

  // Background check for unread messages (when chat widget is closed)
  const fetchUnreadCount = async () => {
    if (!token || !user || isOpen || user.role === 'admin') return;

    try {
      const response = await axios.get('http://127.0.0.1:8000/api/messages/thread/admin', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        const newMsgs = response.data.data;
        const incomingUnread = newMsgs.filter(m => m.sender_id !== user.id && !m.is_read).length;
        setUnreadCount(incomingUnread);
      }
    } catch (err) {
      console.error('Error checking background messages:', err);
    }
  };

  // Setup/Teardown intervals
  useEffect(() => {
    if (isOpen) {
      fetchMessages(true);
      // Active polling every 3 seconds when chat popup is open
      pollingIntervalRef.current = setInterval(() => fetchMessages(true), 3000);
      if (backgroundPollingRef.current) clearInterval(backgroundPollingRef.current);
    } else {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      // Background polling every 10 seconds to check for new messages when closed
      backgroundPollingRef.current = setInterval(fetchUnreadCount, 10000);
      fetchUnreadCount();
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (backgroundPollingRef.current) clearInterval(backgroundPollingRef.current);
    };
  }, [isOpen, token, user]);

  // Scroll on message length change
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Send message handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !token) return;

    setIsSending(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/messages', {
        message: newMessage.trim(),
        receiver_id: adminDetails.id || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        setMessages(prev => [...prev, response.data.data]);
        setNewMessage('');
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Không thể gửi tin nhắn. Vui lòng thử lại!');
    } finally {
      setIsSending(false);
    }
  };

  // Admins do not see the customer support floating widget
  if (user && user.role === 'admin') {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end">
      
      {/* CHAT POPUP DRAWER */}
      {isOpen && (
        <div className="w-[360px] h-[480px] bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-gray-150 flex flex-col mb-4 overflow-hidden transition-all duration-300 transform scale-100 origin-bottom-right">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                {adminDetails.avatar ? (
                  <img src={adminDetails.avatar} alt="Admin Avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center font-bold text-white text-base">
                    A
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-blue-600"></span>
              </div>
              <div>
                <h4 className="font-extrabold text-sm tracking-tight">{adminDetails.name || 'Ban Quản Trị CLB'}</h4>
                <p className="text-[10px] text-blue-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-ping"></span>
                  Hỗ trợ trực tuyến 24/7
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors flex items-center justify-center border-0 cursor-pointer bg-transparent"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-grow p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            
            {!token ? (
              /* Block for guests */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
                <span className="material-symbols-outlined text-5xl text-gray-300">chat_bubble_outline</span>
                <p className="text-gray-500 font-semibold text-sm">Vui lòng đăng nhập để gửi tin nhắn hỗ trợ trực tiếp đến CLB.</p>
                <a href="/login" className="bg-blue-600 text-white font-bold px-6 py-2 rounded-xl text-xs hover:bg-blue-700 transition shadow-sm decoration-none">
                  Đăng Nhập Ngay
                </a>
              </div>
            ) : messages.length === 0 ? (
              /* Empty state */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 gap-2">
                <span className="material-symbols-outlined text-4xl text-gray-300">forum</span>
                <p className="text-sm font-bold">Bắt đầu cuộc trò chuyện!</p>
                <p className="text-[11px] max-w-[200px]">Hãy gửi tin nhắn để nhận tư vấn về đặt lịch sân, thuê vợt, huấn luyện viên hay giải đấu.</p>
              </div>
            ) : (
              /* Thread rendering */
              <>
                <div className="text-[10px] text-gray-400 font-bold tracking-wide uppercase text-center my-1">
                  Hệ thống kết nối trực tiếp
                </div>
                
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                      <div className={`p-3 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-tr-none' 
                          : 'bg-white text-gray-800 rounded-tl-none border border-gray-150'
                      }`}>
                        {msg.message}
                      </div>
                      <span className="text-[9px] text-gray-400 mt-1 px-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}

          </div>

          {/* Chat Input Area */}
          {token && (
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-150 bg-white flex gap-2 items-center">
              <input 
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Nhập nội dung hỗ trợ..."
                disabled={isSending}
                className="flex-grow border border-gray-200 rounded-2xl px-4 py-2 text-xs font-medium outline-none focus:border-blue-500 disabled:bg-gray-50"
              />
              <button 
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition disabled:bg-gray-200 disabled:cursor-not-allowed border-0 cursor-pointer"
              >
                {isSending ? (
                  <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[16px]">send</span>
                )}
              </button>
            </form>
          )}

        </div>
      )}

      {/* FLOATING BUBBLE BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all relative border-0 cursor-pointer"
      >
        {isOpen ? (
          <span className="material-symbols-outlined text-3xl">close</span>
        ) : (
          <span className="material-symbols-outlined text-3xl animate-pulse">chat</span>
        )}
        
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

    </div>
  );
};

export default LiveChatWidget;
