import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const cleanupAuthState = () => {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
        localStorage.removeItem(key);
      }
    });
    if (typeof sessionStorage !== "undefined") {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith("supabase.auth.") || key.includes("sb-")) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch {}
};

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  useEffect(() => {
    document.title = mode === "login" ? "Login | Shooting Analysis" : "Sign up | Shooting Analysis";

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        navigate("/app", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/app", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, mode]);

  const handleGoogle = async () => {
    try {
      setLoading(true);
      cleanupAuthState();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/app` },
      });
    } catch (error: any) {
      const msg = (error?.message && /Unsupported provider|provider is not enabled/i.test(error.message))
        ? "Google provider is not enabled in Supabase. Enable it in Auth > Providers."
        : (error?.message || "Google sign-in error");
      toast({ title: "Login failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      cleanupAuthState();
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/app"; // full refresh for clean state
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        });
        if (error) throw error;
        toast({ title: "Check your email", description: "Confirm your account to continue." });
      }
    } catch (error: any) {
      toast({ title: "Auth error", description: error?.message || "Please try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">
            {mode === "login" ? "Login to your account" : "Create your account"}
          </CardTitle>
          <CardDescription className="text-center">
            {mode === "login" ? "Enter your email below to login to your account" : "Sign up with your email below"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGoogle} className="w-full" size="lg" disabled={loading}>
            Continue with Google
          </Button>
          <div className="text-center text-sm text-muted-foreground">or</div>
          <form onSubmit={handleEmail} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {mode === "login" ? "Log In" : "Sign Up"}
            </Button>
          </form>
          <div className="text-center text-sm">
            {mode === "login" ? (
              <button type="button" onClick={() => setMode("signup")} className="underline">
                Don't have an account? Sign up
              </button>
            ) : (
              <button type="button" onClick={() => setMode("login")} className="underline">
                Already have an account? Log in
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
