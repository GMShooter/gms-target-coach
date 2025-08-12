import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Shooting Analysis | Precision Training";
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full border-b">
        <div className="container mx-auto p-6 flex items-center gap-4">
          <img
            src="/lovable-uploads/2750118e-9b56-4942-9823-e93543b074cd.png"
            alt="Halevi Partner Advanced Security Training logo"
            className="h-10 w-auto object-contain"
            loading="lazy"
          />
          <h1 className="text-xl font-semibold">Shooting Analysis</h1>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-6 py-16 grid gap-8 text-center">
          <div className="mx-auto max-w-2xl space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">Train smarter. Aim truer.</h2>
            <p className="text-muted-foreground text-lg">
              Real-time shot detection, performance insights, and coach-grade analysis.
            </p>
          </div>

          <div className="mx-auto">
            <Button size="lg" onClick={() => navigate("/auth")}>Continue</Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto p-6 text-sm text-muted-foreground">
          Halevi Partner Advanced Security Training
        </div>
      </footer>
    </div>
  );
};

export default Landing;
