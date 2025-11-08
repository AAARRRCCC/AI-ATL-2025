import { GraduationCap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Study Autopilot
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              AI-powered study planning that helps students break down
              assignments and build momentum. No more procrastination, no more
              all-nighters.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Product</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © 2024 Study Autopilot. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
