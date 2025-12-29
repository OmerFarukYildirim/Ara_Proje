import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

function Navigation() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { path: "/", label: "Ana Sayfa" },
    { path: "/profile", label: "Profil" },
    { path: "/news", label: "Haberler" },
    { path: "/about", label: "Hakkımızda" },
    { path: "/contact", label: "İletişim" },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-white shadow-lg relative border-b border-red-100 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link 
                to="/" 
                className="flex items-center space-x-3"
                onClick={closeMenu}
              >
                <img 
                  src="/logo.png" 
                  alt="Lokum Haber" 
                  className="h-10 w-10 object-contain"
                />
                <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                  Lokum Haber
                </span>
              </Link>
            </div>

            {/* Desktop Menu - md ve üzeri */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === item.path
                      ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md"
                      : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              
              {isAuthenticated() ? (
                <button
                  onClick={logout}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  Çıkış Yap
                </button>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/login"
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 transition-all shadow-md hover:shadow-lg"
                  >
                    Kayıt Ol
                  </Link>
                </div>
              )}
            </div>

            {/* Hamburger Button - md altı */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleMenu}
                className="p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all focus:outline-none focus:ring-2 focus:ring-red-500 z-50"
                aria-label="Menüyü aç/kapat"
              >
                {isMenuOpen ? (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Overlay - md altı */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar Menu - md altı, yandan kayarak */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-red-100">
            <Link 
              to="/" 
              className="flex items-center space-x-3"
              onClick={closeMenu}
            >
              <img 
                src="/logo.png" 
                alt="Lokum Haber" 
                className="h-10 w-10 object-contain"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                Lokum Haber
              </span>
            </Link>
            <button
              onClick={closeMenu}
              className="p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all"
              aria-label="Menüyü kapat"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-2 px-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeMenu}
                  className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === item.path
                      ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md"
                      : "text-gray-600 hover:text-red-600 hover:bg-red-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            <div className="pt-6 mt-6 border-t border-red-100 px-4">
              {isAuthenticated() ? (
                <button
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all"
                >
                  Çıkış Yap
                </button>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all text-center"
                  >
                    Giriş Yap
                  </Link>
                  <Link
                    to="/register"
                    onClick={closeMenu}
                    className="block px-4 py-3 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 transition-all shadow-md text-center"
                  >
                    Kayıt Ol
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Navigation;
