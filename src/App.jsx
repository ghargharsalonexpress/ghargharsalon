// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./routes/ProtectedRoute";
import Cart from "./pages/Cart";
import JoinFreelancer from "./pages/JoinFreelancer";
import ServicesPage from "./pages/ServicesPage";
import MainLayout from "./layout/MainLayout";
import ContactPage from "./pages/FreelancerForm";
import Checkout from "./pages/BookingCheckout";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/all-services" element={<ServicesPage />} />
          <Route path="/register-as-professional" element={<JoinFreelancer />} />
          <Route path="/about-us" element={<AboutUs />} />

          <Route path="/book-service" element={<Checkout />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;
