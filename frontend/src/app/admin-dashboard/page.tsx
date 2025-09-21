"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { 
  Button, 
  Typography, 
  Box, 
  AppBar, 
  Toolbar
} from "@mui/material";
import Image from "next/image";

interface User {
  email: string;
  name: string;
  role: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.user) {
        if (data.user.role === "commander") {
          setUser(data.user);
        } else {
          router.push("/user-dashboard");
        }
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error('Session check error:', error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

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

  if (!user || user.role !== "commander") {
    return null;
  }

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
          Hello, Commander
        </Typography>
      </Box>
    </Box>
  );
}