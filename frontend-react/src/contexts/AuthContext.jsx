import { createContext, useContext, useState } from 'react';

const AuthContext = createContext({
  user: null,
  token: null,
  setUser: () => {},
  setToken: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, _setUser] = useState(() => {
    // Thử lấy thông tin user từ localStorage nếu có
    const savedUser = localStorage.getItem('user_info');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [token, _setToken] = useState(localStorage.getItem('ACCESS_TOKEN'));

  const setUser = (userObj) => {
    _setUser(userObj);
    if (userObj) {
      localStorage.setItem('user_info', JSON.stringify(userObj));
    } else {
      localStorage.removeItem('user_info');
    }
  };

  const setToken = (newToken) => {
    _setToken(newToken);
    if (newToken) {
      localStorage.setItem('ACCESS_TOKEN', newToken);
    } else {
      localStorage.removeItem('ACCESS_TOKEN');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, setUser, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);
