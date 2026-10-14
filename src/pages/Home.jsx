// src/pages/Home.jsx
import React from "react";
import TabbedServices from "../components/TabbedServices";
import HeroSection from "../components/HeroComponent";
import CategoriesSection from "../components/CategoriesSection";
import WhyChooseUsSection from "../components/WhyChooseUs";
import ExperienceAssuranceSection from "../components/FAQ";
const Home = () => {
  return (
    <>
      <HeroSection />
      <WhyChooseUsSection />
      <CategoriesSection />
      <ExperienceAssuranceSection />

    </>
  );
};

export default Home;
