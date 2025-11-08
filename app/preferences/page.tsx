"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Calendar,
  Clock,
  Timer,
  Sun,
  Sunset,
  Moon,
  BookOpen,
  Flag,
  Star
} from "lucide-react";
import toast from 'react-hot-toast';
import ThemeToggle from "@/components/ThemeToggle";

interface PrioritySubject {
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
    subjectStrengths?: PrioritySubject[];
    productivityPattern?: 'morning' | 'midday' | 'evening';
    assignmentDeadlineBuffer?: number;
  };
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon', full: 'Monday' },
  { value: 2, label: 'Tue', full: 'Tuesday' },
  { value: 3, label: 'Wed', full: 'Wednesday' },
  { value: 4, label: 'Thu', full: 'Thursday' },
  { value: 5, label: 'Fri', full: 'Friday' },
  { value: 6, label: 'Sat', full: 'Saturday' },
  { value: 0, label: 'Sun', full: 'Sunday' },
];

const PRODUCTIVITY_PATTERNS = [
  {
    value: 'morning' as const,
    label: 'Morning Person',
    icon: Sun,
    description: 'Most productive in early hours',
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    value: 'midday' as const,
    label: 'Midday Flow',
    icon: Sunset,
    description: 'Peak performance during afternoon',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    value: 'evening' as const,
    label: 'Night Owl',
    icon: Moon,
    description: 'Best work happens after sunset',
    gradient: 'from-indigo-500 to-purple-500'
  }
];

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Preferences state
  const [daysAvailable, setDaysAvailable] = useState<number[]>([1, 2, 3, 4, 5]);
  const [preferredStudyTimes, setPreferredStudyTimes] = useState<PreferredStudyTime[]>([]);
  const [defaultWorkDuration, setDefaultWorkDuration] = useState(50);
  const [prioritySubjects, setPrioritySubjects] = useState<PrioritySubject[]>([]);
  const [productivityPattern, setProductivityPattern] = useState<'morning' | 'midday' | 'evening'>('midday');
  const [assignmentDeadlineBuffer, setAssignmentDeadlineBuffer] = useState(2);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        setPrioritySubjects(data.studySettings?.subjectStrengths || []);
        setProductivityPattern(data.studySettings?.productivityPattern || 'midday');
        setAssignmentDeadlineBuffer(data.studySettings?.assignmentDeadlineBuffer || 2);
        setHasUnsavedChanges(false);
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
            subjectStrengths: prioritySubjects,
            productivityPattern,
            assignmentDeadlineBuffer,
          },
        }),
      });

      if (response.ok) {
        toast.success('Preferences saved successfully!');
        setHasUnsavedChanges(false);
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
    setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
    }
  };

  const removeTimeBlock = (index: number) => {
    setPreferredStudyTimes(preferredStudyTimes.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const addSubject = () => {
    if (newSubject.trim()) {
      if (prioritySubjects.some(s => s.subject.toLowerCase() === newSubject.toLowerCase())) {
        toast.error('Subject already exists');
        return;
      }
      setPrioritySubjects([...prioritySubjects, { subject: newSubject, needsMoreTime: false }]);
      setNewSubject('');
      setHasUnsavedChanges(true);
    }
  };

  const removeSubject = (index: number) => {
    setPrioritySubjects(prioritySubjects.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const toggleSubjectPriority = (index: number) => {
    const updated = [...prioritySubjects];
    updated[index].needsMoreTime = !updated[index].needsMoreTime;
    setPrioritySubjects(updated);
    setHasUnsavedChanges(true);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours} hr`;
    return `${hours} hr ${mins} min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-900 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Study Preferences
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Customize your study schedule and preferences
          </p>
          {hasUnsavedChanges && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <div className="w-2 h-2 bg-amber-600 dark:bg-amber-400 rounded-full animate-pulse" />
              You have unsaved changes
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Available Days */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Available Days
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Select the days you're available to schedule work
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-between">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value)}
                  title={day.full}
                  className={`flex-1 px-3 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 ${daysAvailable.includes(day.value)
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </section>

          {/* Preferred Time Blocks */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Preferred Time Blocks
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add time ranges when you prefer to work
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {preferredStudyTimes.map((time, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-gray-700/50 dark:to-gray-700/30 p-3 rounded-lg border border-cyan-200 dark:border-gray-600 group hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors"
                >
                  <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="text-gray-900 dark:text-gray-100 font-medium flex-grow">
                    {time.start} - {time.end}
                  </span>
                  <button
                    onClick={() => removeTimeBlock(index)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove time block"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 items-center bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
              <input
                type="time"
                value={newTimeStart}
                onChange={(e) => setNewTimeStart(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <span className="text-gray-500 dark:text-gray-400 font-medium">to</span>
              <input
                type="time"
                value={newTimeEnd}
                onChange={(e) => setNewTimeEnd(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <button
                onClick={addTimeBlock}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </section>

          {/* Work Session Length */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Timer className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Work Session Length
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Preferred duration for each work session
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {formatDuration(defaultWorkDuration)}
                </span>
                <input
                  type="number"
                  value={defaultWorkDuration}
                  onChange={(e) => {
                    setDefaultWorkDuration(parseInt(e.target.value) || 50);
                    setHasUnsavedChanges(true);
                  }}
                  min="15"
                  max="180"
                  step="5"
                  className="w-24 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-center font-semibold focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <input
                type="range"
                value={defaultWorkDuration}
                onChange={(e) => {
                  setDefaultWorkDuration(parseInt(e.target.value));
                  setHasUnsavedChanges(true);
                }}
                min="15"
                max="180"
                step="5"
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(
                    to right,
                    rgb(37 99 235) 0%,
                    rgb(147 51 234) ${((defaultWorkDuration - 15) / (180 - 15)) * 100}%,
                    rgb(229 231 235) ${((defaultWorkDuration - 15) / (180 - 15)) * 100}%,
                    rgb(229 231 235) 100%
                  )`
                }}

              />
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>15 min</span>
                <span>3 hr</span>
              </div>
            </div>
          </section>

          {/* Productivity Pattern */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                <Sun className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Productivity Pattern
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  When do you work best?
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PRODUCTIVITY_PATTERNS.map((pattern) => {
                const Icon = pattern.icon;
                const isSelected = productivityPattern === pattern.value;
                return (
                  <button
                    key={pattern.value}
                    onClick={() => {
                      setProductivityPattern(pattern.value);
                      setHasUnsavedChanges(true);
                    }}
                    className={`group relative p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${isSelected
                      ? `border-transparent bg-gradient-to-br ${pattern.gradient} text-white shadow-lg`
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`p-3 rounded-lg ${isSelected ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-600'}`}>
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />
                      </div>
                      <div className="text-center">
                        <div className={`font-semibold ${isSelected ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                          {pattern.label}
                        </div>
                        <div className={`text-xs mt-1 ${isSelected ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                          {pattern.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Assignment Deadline Buffer */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg">
                <Flag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Assignment Deadline Buffer
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  How many days before the deadline should work be scheduled?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={assignmentDeadlineBuffer}
                onChange={(e) => {
                  setAssignmentDeadlineBuffer(parseInt(e.target.value) || 2);
                  setHasUnsavedChanges(true);
                }}
                min="0"
                max="14"
                className="w-24 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-center text-2xl font-bold focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <div className="flex-grow">
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {assignmentDeadlineBuffer} {assignmentDeadlineBuffer === 1 ? 'day' : 'days'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Complete work before deadline
                </div>
              </div>
            </div>
          </section>

          {/* Priority Subjects */}
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Priority Subjects
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Subjects that require more focus and study time
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4 min-h-[60px] p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              {prioritySubjects.length === 0 ? (
                <div className="w-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                  No subjects added yet
                </div>
              ) : (
                prioritySubjects.map((subject, index) => (
                  <div
                    key={index}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all transform hover:scale-105 shadow-sm ${subject.needsMoreTime
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                      }`}
                  >
                    {subject.needsMoreTime && <Star className="w-4 h-4" />}
                    <span>{subject.subject}</span>
                    <button
                      onClick={() => toggleSubjectPriority(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 text-xs"
                      title={subject.needsMoreTime ? 'Mark as normal' : 'Mark as high priority'}
                    >
                      {subject.needsMoreTime ? 'High' : 'Normal'}
                    </button>
                    <button
                      onClick={() => removeSubject(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20 rounded p-1"
                      aria-label="Remove subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSubject()}
                placeholder="e.g., Mathematics, History, Physics"
                className="flex-grow px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={addSubject}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Save className={`w-5 h-5 ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
