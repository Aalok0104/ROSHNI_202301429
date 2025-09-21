"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Box, Typography, Button } from "@mui/material";
import Image from "next/image";

// interface User {
//   email: string;
//   name: string;
//   role: string;
// }

export default function LoginPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.user) {
        if (data.user.role === "commander") {
          router.push("/admin-dashboard");
        } else {
          router.push("/user-dashboard");
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google';
  };

  if (loading) {
    return (
      <Box
        sx={{
          height: "100vh",
          backgroundColor: "#1a1a1a",
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

  return (
    <Box
      sx={{
        height: "100vh",
        backgroundColor: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 40px",
      }}
    >
      {/* Left side - Logo */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          src="/logo.png"
          alt="ROSHNI Logo"
          width={200}
          height={200}
          style={{ objectFit: "contain" }}
        />
      </Box>

      {/* Middle - Vertical bar */}
      <Box
        sx={{
          width: "2px",
          height: "60%",
          backgroundColor: "#333",
          margin: "0 60px",
        }}
      />

      {/* Right side - Google Sign In */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            color: "white",
            marginBottom: "40px",
            fontWeight: 300,
            textAlign: "center",
          }}
        >
          Sign in to continue
        </Typography>
        
        <Button
          onClick={handleGoogleSignIn}
          sx={{
            backgroundColor: "white",
            color: "black",
            padding: "12px 24px",
            borderRadius: "8px",
            textTransform: "none",
            fontSize: "16px",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
            minWidth: "200px",
            "&:hover": {
              backgroundColor: "#f5f5f5",
              boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
            },
          }}
        >
          <Image
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google Logo"
            width={20}
            height={20}
          />
          Sign in with Google
        </Button>
      </Box>
    </Box>
  );
}