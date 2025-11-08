import AnimatedBackground from "@/components/AnimatedBackground";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import DemoSection from "@/components/DemoSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      <HeroSection />
      <FeaturesSection />
      <DemoSection />
      <CTASection />
      <Footer />
    </main>
  );
}
