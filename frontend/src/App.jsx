import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import NewsPage from "./pages/NewsPage";
import NewsDetail from "./pages/NewsDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import InterestsSelection from "./pages/InterestsSelection";
import ReadHistory from "./pages/ReadHistory";
import HistoryNewsDetail from "./pages/HistoryNewsDetail";
import ContactForms from "./pages/ContactForms";

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <Routes>
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/news" element={<ProtectedRoute><NewsPage /></ProtectedRoute>} />
          <Route path="/news/:id" element={<ProtectedRoute><NewsDetail /></ProtectedRoute>} />
          <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />
          <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/interests" element={<ProtectedRoute><InterestsSelection /></ProtectedRoute>} />
          <Route path="/read-history" element={<ProtectedRoute><ReadHistory /></ProtectedRoute>} />
          <Route path="/read-history/:id" element={<ProtectedRoute><HistoryNewsDetail /></ProtectedRoute>} />
          <Route path="/contact-forms" element={<ProtectedRoute><ContactForms /></ProtectedRoute>} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

export default App;
