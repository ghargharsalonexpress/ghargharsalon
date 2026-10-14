// src/components/TabbedServices.jsx
import React, { useState } from "react";
import { Box, Typography, Stack, Button, Grid, useTheme } from "@mui/material";
import ServiceCard from "./ServiceCard";


export const data = {
  female: [
    {
      id: "female-waxing",
      image:
        "https://images.pexels.com/photos/3997984/pexels-photo-3997984.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Waxing Special",
      subtitle: "Multiple services",
      price: "1555",
      oldPrice: "3298",
      discountPercent: "52",
      duration: "2 hrs 22 mins",
      bookings: "2K+ Bookings in Last 30 days",
      avatars: [
        "https://randomuser.me/api/portraits/women/65.jpg",
        "https://randomuser.me/api/portraits/women/66.jpg",
      ],
      features: [
        {
          label: "Waxing",
          value:
            "Full Arms, Full Legs & Underarms (Rica Gold Roll On)",
        },
        {
          label: "Intimate Waxing",
          value: "Bikini Wax (Korean Bean Peel-Off Wax)",
        },
      ],
    },
    {
      id: "female-facial",
      image:
        "https://images.pexels.com/photos/3764015/pexels-photo-3764015.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Hydra Facial Glow",
      subtitle: "Multiple services",
      price: "1899",
      oldPrice: "2599",
      discountPercent: "27",
      duration: "1 hr 45 mins",
      bookings: "1.5K+ Bookings in Last 30 days",
      avatars: [
        "https://randomuser.me/api/portraits/women/67.jpg",
        "https://randomuser.me/api/portraits/women/68.jpg",
      ],
      features: [
        { label: "Facial", value: "Hydra Glow + De-tan pack" },
      ],
    },
    {
      id: "female-hairspa",
      image:
        "https://images.pexels.com/photos/3997995/pexels-photo-3997995.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Hair Spa & Styling",
      subtitle: "Shine & Smoothness",
      price: "1299",
      oldPrice: "1899",
      discountPercent: "32",
      duration: "1 hr 30 mins",
      bookings: "3K+ Bookings in Last 30 days",
      avatars: [
        "https://randomuser.me/api/portraits/women/69.jpg",
        "https://randomuser.me/api/portraits/women/70.jpg",
      ],
      features: [
        { label: "Hair Spa", value: "Deep Nourishing Moroccan Treatment" },
        { label: "Blow Dry", value: "Volume & Style Finish" },
      ],
    },
  ],

  male: [
    {
      id: "male-massage",
      image:
        "https://images.pexels.com/photos/704558/pexels-photo-704558.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Men's Relaxing Massage",
      subtitle: "Full Body",
      price: "999",
      oldPrice: "1599",
      discountPercent: "38",
      duration: "1 hr 15 mins",
      bookings: "1.8K+ Bookings in Last 30 days",
      avatars: [
        "https://randomuser.me/api/portraits/men/52.jpg",
      ],
      features: [
        { label: "Massage", value: "Head, Neck, Back & Shoulder" },
      ],
    },
    {
      id: "male-haircut",
      image:
        "https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Men’s Haircut & Styling",
      subtitle: "Classic & Modern Looks",
      price: "499",
      oldPrice: "899",
      discountPercent: "44",
      duration: "45 mins",
      bookings: "2.3K+ Bookings in Last 30 days",
      avatars: [
        "https://randomuser.me/api/portraits/men/40.jpg",
        "https://randomuser.me/api/portraits/men/41.jpg",
      ],
      features: [
        { label: "Haircut", value: "Professional styling with wash & set" },
        { label: "Beard Trim", value: "Precision shaping & grooming" },
      ],
    },
    {
      id: "male-facial",
      image:
        "https://images.pexels.com/photos/3865792/pexels-photo-3865792.jpeg?auto=compress&cs=tinysrgb&w=800",
      title: "Men’s Brightening Facial",
      subtitle: "Instant Glow",
      price: "799",
      oldPrice: "1199",
      discountPercent: "33",
      duration: "1 hr",
      bookings: "1.2K+ Bookings in Last 30 days",
      avatars: [
        "https://randomuser.me/api/portraits/men/42.jpg",
      ],
      features: [
        { label: "Facial", value: "De-tan + Brightening Clean-up" },
      ],
    },
  ],
};


const TabbedServices = () => {
  const [activeTab, setActiveTab] = useState("female");
  const theme = useTheme();

  return (
    <Box sx={{ py: 8, px: { xs: 2, md: 8 }, textAlign: "center" }}>
      {/* Tabs */}
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          border: "1px solid black",
          borderRadius: "40px",
          overflow: "hidden",
          position: "relative",
          backgroundColor: "#fff",
          width: 280,
          height: 48,
        }}
      >
        {/* Sliding background for active tab */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: activeTab === "female" ? 0 : "50%",
            width: "50%",
            height: "100%",
            backgroundColor: "black",
            borderRadius: "40px",
            transition: "all 0.35s ease",
          }}
        />

        {/* For Women */}
        <Button
          disableRipple
          disableElevation
          onClick={() => setActiveTab("female")}
          sx={{
            flex: 1,
            zIndex: 1,
            fontWeight: 600,
            textTransform: "none",
            color: activeTab === "female" ? "#fff" : "#000",
            borderRadius: 0,
            backgroundColor: "transparent",
            transition: "color 0.3s ease",
            "&:hover": {
              backgroundColor: "transparent",
              color: activeTab === "female" ? "#fff" : "#555",
            },
          }}
        >
          For Women
        </Button>

        {/* For Men */}
        <Button
          disableRipple
          disableElevation
          onClick={() => setActiveTab("male")}
          sx={{
            flex: 1,
            zIndex: 1,
            fontWeight: 600,
            textTransform: "none",
            color: activeTab === "male" ? "#fff" : "#000",
            borderRadius: 0,
            backgroundColor: "transparent",
            transition: "color 0.3s ease",
            "&:hover": {
              backgroundColor: "transparent",
              color: activeTab === "male" ? "#fff" : "#555",
            },
          }}
        >
          For Men
        </Button>
      </Box>
      {/* Dynamic Cards */}
      <Grid
        container
        spacing={3}
        justifyContent="center"
        alignItems="stretch"
        sx={{
          maxWidth: "1300px",
          mx: "auto",
          mt: '2%'
        }}
      >
        {data[activeTab]?.map((item, i) => (
          <Grid
            item
            key={i}
            sm={4}
            md={4}
            sx={{
              display: "flex",
              justifyContent: "center",
              flexGrow: 1,
            }}
          >
            <Box
              sx={{
                width: "100%",
                maxWidth: { xs: "100%", sm: "400px", md: "380px" },
                height: "100%",
                display: "flex",
              }}
            >
              <ServiceCard data={item} />
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};


export default TabbedServices;
