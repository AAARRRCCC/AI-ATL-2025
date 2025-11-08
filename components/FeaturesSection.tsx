"use client";

import { motion } from "framer-motion";
import {
  FileText,
  Zap,
  Calendar,
  BarChart3,
  Clock,
  CheckCircle,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Upload or Enter Assignments",
    description:
      "Simply paste your assignment details or upload a PDF. Our AI extracts the key requirements and due dates automatically.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Zap,
    title: "AI-Powered Breakdown",
    description:
      "Claude AI analyzes your assignment and breaks it into phases: research, drafting, revision. Each with specific tasks and realistic time estimates.",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Calendar,
    title: "Smart Calendar Integration",
    description:
      "Syncs with Google Calendar to find optimal study slots. Avoids conflicts, considers your productivity hours, and schedules around your life.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: BarChart3,
    title: "Visual Progress Tracking",
    description:
      "See exactly how much you've accomplished with beautiful progress bars. Watch your hours add up and assignments get completed.",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Clock,
    title: "Auto-Rescheduling",
    description:
      "Missed a study session? No problem. The app automatically finds the next available slot and keeps you on track for your deadline.",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    icon: CheckCircle,
    title: "Build Momentum",
    description:
      "Complete tasks, build streaks, and develop consistent study habits. Small wins lead to big achievements.",
    gradient: "from-pink-500 to-rose-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function FeaturesSection() {
  return (
    <section className="relative py-20 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {" "}
              Succeed
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            From overwhelming assignments to achievable daily tasks in seconds
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                className="group relative p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 shadow-lg hover:shadow-2xl"
              >
                {/* Icon */}
                <div
                  className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Effect Border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-blue-500/10 group-hover:via-purple-500/10 group-hover:to-pink-500/10 transition-all duration-300 pointer-events-none" />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
