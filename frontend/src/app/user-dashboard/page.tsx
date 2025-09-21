"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Typography, AppBar, Toolbar, Button } from "@mui/material";
import Image from "next/image";

interface User {
  email: string;
  name: string;
  role: string;
}

export default function UserDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error('Session check error:', error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push("/");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          height: "100vh",
          backgroundColor: "black",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "commander":
        return "Commander";
      case "responder":
        return "Responder";
      case "user":
      default:
        return "User";
    }
  };

  return (
    <Box sx={{ height: "100vh", backgroundColor: "black" }}>
      {/* Black navbar with logo */}
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: "black",
          boxShadow: "none",
          borderBottom: "1px solid #333"
        }}
      >
        <Toolbar>
          <Image
            src="/logo.png"
            alt="ROSHNI Logo"
            width={40}
            height={40}
            style={{ objectFit: "contain" }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button
            color="inherit"
            onClick={handleLogout}
            sx={{ color: "white" }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      {/* Centered greeting */}
      <Box
        sx={{
          height: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="h2"
          sx={{
            color: "white",
            textAlign: "center",
            fontWeight: 300,
          }}
        >
          Hello, {getRoleDisplayName(user.role)}
        </Typography>
      </Box>
    </Box>
  );
}