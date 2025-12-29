import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sayfa yüklendiğinde localStorage'dan kullanıcı bilgilerini kontrol et
    const checkAuth = () => {
      try {
        const customerId = localStorage.getItem("customerId");
        const userData = localStorage.getItem("userData");
        const token = localStorage.getItem("token");

        if (customerId && userData) {
          const parsedUserData = JSON.parse(userData);
          // Token'ı userData'ya senkronize et
          if (token && parsedUserData.token !== token) {
            parsedUserData.token = token;
            localStorage.setItem("userData", JSON.stringify(parsedUserData));
          }
          setUser(parsedUserData);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Hatalı veri varsa temizle
        localStorage.removeItem("customerId");
        localStorage.removeItem("userData");
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData) => {
    const customerId = userData.id || Date.now().toString();
    localStorage.setItem("customerId", customerId);
    localStorage.setItem("userData", JSON.stringify(userData));

    // Token'ı ayrı olarak localStorage'a kaydet (her girişte güncellenir)
    if (userData.token) {
      localStorage.setItem("token", userData.token);
    }

    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("customerId");
    localStorage.removeItem("userData");
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateUser = (updatedUserData) => {
    const userData = JSON.parse(localStorage.getItem("userData")) || {};
    const mergedData = { ...userData, ...updatedUserData };
    localStorage.setItem("userData", JSON.stringify(mergedData));

    // Token güncellenirse localStorage'a da kaydet
    if (updatedUserData.token) {
      localStorage.setItem("token", updatedUserData.token);
    }

    setUser(mergedData);
  };

  const isAuthenticated = () => {
    return !!user && !!localStorage.getItem("customerId");
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    isAuthenticated,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
