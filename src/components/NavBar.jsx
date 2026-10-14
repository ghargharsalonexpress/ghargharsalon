// src/components/Navbar.jsx
import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Badge,
  useTheme,
} from "@mui/material";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const Navbar = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { label: "Home", path: "/" },
    { label: "About Us", path: "/about-us" },
    { label: "Register as a Professional", path: "/register-as-professional" },
    { label: "Contact Us", path: "/contact" },
  ];

  const handleClick = () => {
    console.log("Navigating to /all-services");
    navigate("/all-services");
  };

  const cartCount = useSelector((state) =>
    state.cart.items.reduce((acc, item) => acc + item.qty, 0)
  );

  return (
    <AppBar
    position="sticky"
    elevation={0}
    sx={{
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      borderBottom: `1px solid ${theme.palette.divider}`,
    }}
  >
    <Toolbar
      sx={{
        justifyContent: "space-between",
        px: { xs: 2, sm: 4, md: 6 },
        minHeight: 80,
      }}
    >
      {/* Logo */}
      <Typography
        component={Link}
        to="/"
        variant="h5"
        sx={{
          fontWeight: 700,
          textDecoration: "none",
          letterSpacing: 0.5,
          display: "flex",
          alignItems: "center",
          color: theme.palette.text.primary,
          "& img": { height: 32, mr: 1 },
        }}
      >
        <img src="/logo192.png" alt="Logo" />
        <Box component="span" sx={{ color: theme.palette.primary.main }}>
           Madam
        </Box>
      </Typography>

      {/* Desktop Menu */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          gap: 2.5,
        }}
      >
        {menuItems.map(({ label, path }) => (
          <Button
            key={label}
            component={Link}
            to={path}
            sx={{
              borderRadius: "30px",
              textTransform: "none",
              color: theme.palette.text.primary,
              fontWeight: 600,
              px: 2.5,
              py: 0.8,
              border: `1px solid ${theme.palette.divider}`,
              fontSize: "0.95rem",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: theme.palette.action.hover,
                borderColor: theme.palette.primary.light,
                color: theme.palette.primary.main,
              },
            }}
          >
            {label}
          </Button>
        ))}

        {/* CTA Button */}
        <Button
          variant="contained"
          onClick={handleClick}
          sx={{
            borderRadius: "30px",
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            fontWeight: 700,
            textTransform: "uppercase",
            px: 3.5,
            py: 1,
            boxShadow: theme.shadows[2],
            display: "flex",
            alignItems: "center",
            gap: 1.2,
            "&:hover": {
              backgroundColor: theme.palette.primary.dark,
              boxShadow: theme.shadows[4],
            },
          }}
        >
          Book a Service
          <Box
            sx={{
              backgroundColor: theme.palette.secondary.main,
              color: theme.palette.secondary.contrastText,
              borderRadius: "50%",
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowOutwardIcon sx={{ fontSize: 16 }} />
          </Box>
        </Button>

        {/* Cart Icon */}
        <IconButton onClick={() => navigate("/cart")} sx={{ color: theme.palette.text.primary }}>
          <Badge
            badgeContent={cartCount}
            color="error"
            invisible={cartCount === 0}
            sx={{
              "& .MuiBadge-badge": {
                fontSize: "0.75rem",
                height: 18,
                minWidth: 18,
              },
            }}
          >
            <ShoppingCartOutlinedIcon />
          </Badge>
        </IconButton>
      </Box>

      {/* Mobile Menu */}
      <IconButton
        sx={{ display: { xs: "flex", md: "none" }, color: theme.palette.text.primary }}
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </IconButton>
    </Toolbar>

    {/* Drawer for Mobile */}
    <Drawer
      anchor="right"
      open={open}
      onClose={() => setOpen(false)}
      PaperProps={{
        sx: {
          backgroundColor: theme.palette.background.paper,
          width: 260,
          borderLeft: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box display="flex" justifyContent="flex-end">
          <IconButton onClick={() => setOpen(false)} sx={{ color: theme.palette.text.primary }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <List>
          {menuItems.map(({ label, path }) => (
            <ListItem
              key={label}
              button
              component={Link}
              to={path}
              onClick={() => setOpen(false)}
            >
              <ListItemText
                primary={label}
                slotProps={{
                  primary: {
                    sx: {
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                    },
                  },
                }}
              />
            </ListItem>
          ))}

          <ListItem>
            <Button
              fullWidth
              variant="contained"
              onClick={handleClick}
              sx={{
                mt: 2,
                borderRadius: "30px",
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                fontWeight: 700,
                textTransform: "uppercase",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              Book a Service
            </Button>
          </ListItem>
        </List>
      </Box>
    </Drawer>
  </AppBar>
  );
};

export default Navbar;
