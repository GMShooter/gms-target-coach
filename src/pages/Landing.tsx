import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Target, BarChart3, Zap, Shield } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Shooting Analysis | Precision Training";
  }, []);

  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0.0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: "easeInOut",
        }}
        className="relative flex flex-col gap-8 items-center justify-center px-4 text-center"
      >
        {/* Logo and Title */}
        <div className="flex items-center gap-4 mb-4">
          <img
            src="/lovable-uploads/2750118e-9b56-4942-9823-e93543b074cd.png"
            alt="Halevi Partner Advanced Security Training logo"
            className="h-12 w-auto object-contain"
            loading="lazy"
          />
          <div className="text-left">
            <h1 className="text-2xl font-bold">Shooting Analysis</h1>
            <p className="text-sm text-muted-foreground">Advanced Security Training</p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary-glow to-primary bg-clip-text text-transparent">
            Train Smarter. Aim Truer.
          </h2>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Professional shooting analysis with real-time detection, performance insights, and AI-powered coaching.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto my-8">
          {[
            {
              icon: Target,
              title: "Precision Tracking",
              description: "Real-time shot detection and accuracy analysis"
            },
            {
              icon: BarChart3,
              title: "Performance Analytics",
              description: "Detailed statistics and progress tracking"
            },
            {
              icon: Zap,
              title: "Instant Feedback",
              description: "Live coaching and improvement suggestions"
            },
            {
              icon: Shield,
              title: "Professional Grade",
              description: "Used by security professionals worldwide"
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg p-6 hover:bg-card/70 transition-all duration-300"
            >
              <feature.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => navigate("/auth")}
          >
            Start Training Now
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="mt-16 text-sm text-muted-foreground"
        >
          © 2025 Halevi Partner Advanced Security Training
        </motion.div>
      </motion.div>
    </AuroraBackground>
  );
};

export default Landing;
