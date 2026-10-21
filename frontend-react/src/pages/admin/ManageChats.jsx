import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthContext } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

const ManageChats = () => {
  const { token, user } = useAuthContext();
  const toast = useToast();

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const messagesEndRef = useRef(null);
  const pollContactsRef = useRef(null);
  const pollMessagesRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch all chat contacts
  const fetchContacts = async (silent = false) => {
    if (!token) return;
    if (!silent) setIsLoadingContacts(true);
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/messages/contacts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        const prevContacts = contacts;
        const nextContacts = response.data.data;
        setContacts(nextContacts);

        // Detect new unread messages globally to play a sound
        if (prevContacts.length > 0) {
          const totalUnreadPrev = prevContacts.reduce((sum, c) => sum + c.unread_count, 0);
          const totalUnreadNext = nextContacts.reduce((sum, c) => sum + c.unread_count, 0);
          if (totalUnreadNext > totalUnreadPrev) {
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
              audio.volume = 0.4;
              audio.play();
            } catch (e) {
              console.log('Audio autoplay blocked by browser.');
            }
            toast.info('Bạn có tin nhắn hỗ trợ mới từ khách hàng!');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching chat contacts:', err);
    } finally {
      if (!silent) setIsLoadingContacts(false);
    }
  };

  // Fetch messages thread for the selected contact
  const fetchMessages = async (contactId, silent = false) => {
    if (!token || !contactId) return;
    if (!silent) setIsLoadingMessages(true);
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/messages/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        setMessages(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  // Setup periodic polling for contacts list
  useEffect(() => {
    fetchContacts();
    pollContactsRef.current = setInterval(() => fetchContacts(true), 4000);

    return () => {
      if (pollContactsRef.current) clearInterval(pollContactsRef.current);
    };
  }, [token]);

  // Setup/teardown message thread polling when selected contact changes
  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact.id);
      
      // Clear any existing message polling
      if (pollMessagesRef.current) clearInterval(pollMessagesRef.current);
      
      // Poll active thread every 2.5 seconds
      pollMessagesRef.current = setInterval(() => fetchMessages(selectedContact.id, true), 2500);
      
      // Also silently reset unread count locally for responsive UX
      setContacts(prev => prev.map(c => c.id === selectedContact.id ? { ...c, unread_count: 0 } : c));
    } else {
      setMessages([]);
      if (pollMessagesRef.current) clearInterval(pollMessagesRef.current);
    }

    return () => {
      if (pollMessagesRef.current) clearInterval(pollMessagesRef.current);
    };
  }, [selectedContact, token]);

  // Scroll to bottom on messages update
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Send reply handler
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !selectedContact) return;

    setIsSending(true);
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/messages', {
        message: newMessage.trim(),
        receiver_id: selectedContact.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        setMessages(prev => [...prev, response.data.data]);
        setNewMessage('');
        
        // Update contact last message preview instantly
        setContacts(prev => prev.map(c => c.id === selectedContact.id 
          ? { ...c, last_message: response.data.data.message, last_message_time: response.data.data.created_at } 
          : c
        ));

        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Không thể gửi tin nhắn phản hồi.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      
      {/* Page Title */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl text-blue-600">chat</span>
            Hộp Thư Hỗ Trợ Trực Tuyến
          </h1>
          <p className="text-gray-500 text-xs mt-1">Phản hồi và chăm sóc khách hàng trong thời gian thực.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-150 overflow-hidden flex h-[620px]">
        
        {/* COLUMN LEFT: CONTACTS/USERS LIST */}
        <div className="w-1/3 border-r border-gray-150 flex flex-col bg-gray-50/50">
          <div className="p-4 border-b border-gray-150 bg-white">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400 text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Tìm kiếm khách hàng..." 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-grow overflow-y-auto divide-y divide-gray-100">
            {isLoadingContacts ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
                <span className="text-xs font-bold">Đang tải danh sách...</span>
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-gray-300">chat_bubble_outline</span>
                <span className="text-xs font-semibold">Chưa có cuộc hội thoại nào.</span>
              </div>
            ) : (
              contacts.map((contact) => {
                const isSelected = selectedContact && selectedContact.id === contact.id;
                return (
                  <div 
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`p-4 flex items-center gap-3.5 cursor-pointer transition-all hover:bg-gray-100/50 relative ${
                      isSelected ? 'bg-blue-50/50 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="relative shrink-0">
                      {contact.avatar ? (
                        <img src={contact.avatar} alt={contact.name} className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-sm" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                          {contact.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span>
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-extrabold text-gray-900 text-xs truncate">{contact.name}</h4>
                        {contact.last_message_time && (
                          <span className="text-[10px] text-gray-400 font-bold shrink-0">
                            {new Date(contact.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate pr-4">
                        {contact.last_message || 'Chưa gửi tin nhắn'}
                      </p>
                    </div>

                    {contact.unread_count > 0 && (
                      <span className="shrink-0 bg-red-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                        {contact.unread_count}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN RIGHT: CHAT PANEL */}
        <div className="w-2/3 flex flex-col bg-white">
          
          {selectedContact ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-150 flex items-center justify-between bg-slate-50/50 shadow-sm">
                <div className="flex items-center gap-3">
                  {selectedContact.avatar ? (
                    <img src={selectedContact.avatar} alt={selectedContact.name} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                      {selectedContact.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="font-extrabold text-xs text-gray-900">{selectedContact.name}</h4>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      Khách hàng đang online
                    </span>
                  </div>
                </div>

                {/* 2 Nút gọi điện thoại & Video call đã được ẩn theo yêu cầu */}
              </div>

              {/* Messages Body */}
              <div className="flex-grow p-5 overflow-y-auto bg-gray-50/50 flex flex-col gap-4">
                {isLoadingMessages && messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-400 flex-col gap-2">
                    <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
                    <span className="text-xs font-bold">Đang tải lịch sử...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-[10px] text-gray-400 font-bold text-center tracking-wider uppercase bg-gray-100 py-1 px-3 rounded-full w-max mx-auto mb-2 border border-gray-200">
                      Bắt đầu cuộc trò chuyện hỗ trợ
                    </div>

                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user.id;
                      return (
                        <div key={msg.id} className={`flex flex-col max-w-[70%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                          <div className={`p-3.5 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                            isMe 
                              ? 'bg-blue-600 text-white rounded-tr-none' 
                              : 'bg-white text-gray-800 rounded-tl-none border border-gray-150'
                          }`}>
                            {msg.message}
                          </div>
                          <span className="text-[9px] text-gray-400 mt-1 px-1 font-semibold">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Reply Input Area */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-gray-150 bg-white flex gap-3 items-center">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Nhập câu trả lời cho khách hàng..."
                  disabled={isSending}
                  className="flex-grow border border-gray-200 rounded-2xl px-4 py-3 text-xs font-medium outline-none focus:border-blue-500 disabled:bg-gray-50"
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim() || isSending}
                  className="px-5 py-3 rounded-2xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-md border-0 cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                      Đang gửi
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                      Gửi
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 text-gray-400 gap-3">
              <span className="material-symbols-outlined text-6xl text-gray-200">forum</span>
              <h3 className="font-extrabold text-gray-700 text-sm">Chưa Chọn Cuộc Trò Chuyện nào</h3>
              <p className="text-xs max-w-sm leading-relaxed">Chọn một khách hàng ở cột bên trái để bắt đầu tư vấn, giải đáp thắc mắc và hỗ trợ trực tiếp.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default ManageChats;
