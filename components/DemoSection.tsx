"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function DemoSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "1. Add Your Assignment",
      description: "Enter assignment details: title, due date, and description",
      preview: (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Assignment Title
              </label>
              <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-md px-3 flex items-center text-gray-500 dark:text-gray-400">
                Climate Policy Research Paper
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Due Date
              </label>
              <div className="h-10 bg-gray-100 dark:bg-gray-700 rounded-md px-3 flex items-center text-gray-500 dark:text-gray-400">
                November 15, 2024
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Description
              </label>
              <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-md p-3 text-gray-500 dark:text-gray-400 text-sm">
                10-page research paper analyzing climate policy frameworks...
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "2. AI Analyzes & Breaks Down",
      description:
        "Claude AI creates a structured plan with phases and time estimates",
      preview: (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Phase 1: Research (4 hours)
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Find 5 credible sources (2 hrs)</li>
                <li>• Read and take notes (2 hrs)</li>
              </ul>
            </div>
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Phase 2: Drafting (6 hours)
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Create outline (1 hr)</li>
                <li>• Write introduction + body (5 hrs)</li>
              </ul>
            </div>
            <div className="border-l-4 border-pink-500 pl-4 py-2">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Phase 3: Revision (2 hours)
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li>• Edit and polish (2 hrs)</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "3. Smart Scheduling",
      description: "Automatically scheduled around your calendar availability",
      preview: (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[140px]">
                Thu Nov 9, 2-4pm
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Research & collect sources
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[140px]">
                Sat Nov 11, 10am-1pm
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Create outline & draft intro
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[140px]">
                Mon Nov 13, 3-5pm
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Complete body paragraphs
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[140px]">
                Wed Nov 15, 11am-12pm
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Final revision & formatting
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "4. Track Your Progress",
      description: "Watch your progress grow as you complete each task",
      preview: (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Climate Policy Paper
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 w-3/4 transition-all duration-500" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  75%
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                9 / 12 hours completed
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  4
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Tasks Completed
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  2
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Days Until Due
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="relative py-20 px-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            From assignment to achievement in four simple steps
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Steps Navigation */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => setActiveStep(index)}
                className={`w-full text-left p-6 rounded-xl transition-all duration-300 ${
                  activeStep === index
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl scale-105"
                    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:shadow-lg"
                }`}
              >
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p
                  className={
                    activeStep === index
                      ? "text-blue-100"
                      : "text-gray-600 dark:text-gray-400"
                  }
                >
                  {step.description}
                </p>
              </motion.button>
            ))}
          </div>

          {/* Preview Area */}
          <div className="lg:sticky lg:top-8">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {steps[activeStep].preview}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
