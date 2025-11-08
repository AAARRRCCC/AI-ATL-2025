"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';
import ThemeToggle from "@/components/ThemeToggle";

interface SubjectStrength {
  subject: string;
  needsMoreTime: boolean;
}

interface PreferredStudyTime {
  start: string;
  end: string;
}

interface Preferences {
  studySettings?: {
    defaultWorkDuration?: number;
    defaultBreakDuration?: number;
    preferredStudyTimes?: PreferredStudyTime[];
    daysAvailable?: number[];
    subjectStrengths?: SubjectStrength[];
    productivityPattern?: 'morning' | 'midday' | 'evening';
    assignmentDeadlineBuffer?: number;
  };
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Preferences state
  const [daysAvailable, setDaysAvailable] = useState<number[]>([1, 2, 3, 4, 5]);
  const [preferredStudyTimes, setPreferredStudyTimes] = useState<PreferredStudyTime[]>([]);
  const [defaultWorkDuration, setDefaultWorkDuration] = useState(50);
  const [subjectStrengths, setSubjectStrengths] = useState<SubjectStrength[]>([]);
  const [productivityPattern, setProductivityPattern] = useState<'morning' | 'midday' | 'evening'>('midday');
  const [assignmentDeadlineBuffer, setAssignmentDeadlineBuffer] = useState(2);

  // New subject/time inputs
  const [newSubject, setNewSubject] = useState('');
  const [newTimeStart, setNewTimeStart] = useState('09:00');
  const [newTimeEnd, setNewTimeEnd] = useState('17:00');

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }

    fetchPreferences(token);
  }, [router]);

  const fetchPreferences = async (token: string) => {
    try {
      const response = await fetch('/api/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: Preferences = await response.json();
        // Use fallback values for potentially missing fields
        setDaysAvailable(data.studySettings?.daysAvailable || [1, 2, 3, 4, 5]);
        setPreferredStudyTimes(data.studySettings?.preferredStudyTimes || []);
        setDefaultWorkDuration(data.studySettings?.defaultWorkDuration || 50);
        setSubjectStrengths(data.studySettings?.subjectStrengths || []);
        setProductivityPattern(data.studySettings?.productivityPattern || 'midday');
        setAssignmentDeadlineBuffer(data.studySettings?.assignmentDeadlineBuffer || 2);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to load preferences:', response.status, errorData);
        toast.error(`Failed to load preferences: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences: Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studySettings: {
            daysAvailable,
            preferredStudyTimes,
            defaultWorkDuration,
            subjectStrengths,
            productivityPattern,
            assignmentDeadlineBuffer,
          },
        }),
      });

      if (response.ok) {
        toast.success('Preferences saved successfully!');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save preferences:', response.status, errorData);
        toast.error(`Failed to save preferences: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences: Network error');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    if (daysAvailable.includes(day)) {
      setDaysAvailable(daysAvailable.filter(d => d !== day));
    } else {
      setDaysAvailable([...daysAvailable, day].sort());
    }
  };

  const addTimeBlock = () => {
    if (newTimeStart && newTimeEnd) {
      if (newTimeStart >= newTimeEnd) {
        toast.error('End time must be after start time');
        return;
      }
      setPreferredStudyTimes([...preferredStudyTimes, { start: newTimeStart, end: newTimeEnd }]);
      setNewTimeStart('09:00');
      setNewTimeEnd('17:00');
    }
  };

  const removeTimeBlock = (index: number) => {
    setPreferredStudyTimes(preferredStudyTimes.filter((_, i) => i !== index));
  };

  const addSubject = () => {
    if (newSubject.trim()) {
      if (subjectStrengths.some(s => s.subject.toLowerCase() === newSubject.toLowerCase())) {
        toast.error('Subject already exists');
        return;
      }
      setSubjectStrengths([...subjectStrengths, { subject: newSubject, needsMoreTime: false }]);
      setNewSubject('');
    }
  };

  const removeSubject = (index: number) => {
    setSubjectStrengths(subjectStrengths.filter((_, i) => i !== index));
  };

  const toggleSubjectNeedsMoreTime = (index: number) => {
    const updated = [...subjectStrengths];
    updated[index].needsMoreTime = !updated[index].needsMoreTime;
    setSubjectStrengths(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  Study Autopilot
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Preferences
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customize your study schedule and work preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Days of Week */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Available Days
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the days you're available to schedule work
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    daysAvailable.includes(day.value)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Blocks */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Preferred Time Blocks
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Add time ranges when you prefer to work
            </p>

            <div className="space-y-3 mb-4">
              {preferredStudyTimes.map((time, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    {time.start} - {time.end}
                  </span>
                  <button
                    onClick={() => removeTimeBlock(index)}
                    className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                type="time"
                value={newTimeStart}
                onChange={(e) => setNewTimeStart(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-gray-500 dark:text-gray-400 flex items-center">to</span>
              <input
                type="time"
                value={newTimeEnd}
                onChange={(e) => setNewTimeEnd(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addTimeBlock}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Work Session Length */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Work Session Length
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Preferred duration for each work session (in minutes)
            </p>
            <input
              type="number"
              value={defaultWorkDuration}
              onChange={(e) => setDefaultWorkDuration(parseInt(e.target.value) || 50)}
              min="15"
              max="180"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Productivity Pattern */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Productivity Pattern
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              When do you work best?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(['morning', 'midday', 'evening'] as const).map((pattern) => (
                <button
                  key={pattern}
                  onClick={() => setProductivityPattern(pattern)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    productivityPattern === pattern
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Assignment Deadline Buffer */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Assignment Deadline Buffer
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              How many days before the deadline should work be scheduled?
            </p>
            <input
              type="number"
              value={assignmentDeadlineBuffer}
              onChange={(e) => setAssignmentDeadlineBuffer(parseInt(e.target.value) || 2)}
              min="0"
              max="14"
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Subject Strengths */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Subject Strengths
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Mark subjects that need more time or are more challenging
            </p>

            <div className="space-y-3 mb-4">
              {subjectStrengths.map((subject, index) => (
                <div key={index} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                  <span className="text-gray-900 dark:text-gray-100 font-medium flex-grow">
                    {subject.subject}
                  </span>
                  <button
                    onClick={() => toggleSubjectNeedsMoreTime(index)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      subject.needsMoreTime
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {subject.needsMoreTime ? 'Needs More Time' : 'Normal'}
                  </button>
                  <button
                    onClick={() => removeSubject(index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                placeholder="e.g., Mathematics, History"
                className="flex-grow px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addSubject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
