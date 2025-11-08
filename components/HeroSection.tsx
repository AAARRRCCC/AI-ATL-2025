"use client";

import { motion } from "framer-motion";
import { Sparkles, Calendar, Brain, TrendingUp } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
      <div className="max-w-7xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-purple-200 dark:border-purple-800 mb-8"
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            AI-Powered Study Planning
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight"
        >
          Stop Procrastinating.
          <br />
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Start Achieving.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto"
        >
          Study Autopilot uses AI to break down your assignments into achievable
          work sessions and automatically schedules them based on your calendar.{" "}
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            No more all-nighters. No more stress.
          </span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
        >
          <a
            href="/auth"
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-200 inline-block text-center"
          >
            Get Started Free
          </a>
        </motion.div>

        {/* Feature Icons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              AI Task Breakdown
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Intelligent analysis of your assignments
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Smart Scheduling
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Auto-schedules based on your availability
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <div className="p-3 bg-pink-100 dark:bg-pink-900/50 rounded-full">
              <TrendingUp className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Track Progress
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Build momentum with visual progress tracking
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
