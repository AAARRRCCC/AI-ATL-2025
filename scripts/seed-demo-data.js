/**
 * Demo Data Seeding Script
 *
 * Populates database with impressive sample data for hackathon demo
 *
 * Usage:
 *   node scripts/seed-demo-data.js <user_email>
 *
 * Example:
 *   node scripts/seed-demo-data.js demo@studyautopilot.com
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'study-autopilot';

// Sample data
const SAMPLE_ASSIGNMENTS = [
  {
    title: 'Machine Learning Final Project',
    type: 'project',
    subject: 'Computer Science',
    description: 'Build and train a neural network for image classification. Must include data preprocessing, model architecture, training, and evaluation.',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
    estimatedHours: 20,
    status: 'active',
    phases: [
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'research',
        estimatedMinutes: 240,
        completedMinutes: 120,
        status: 'in_progress'
      },
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'implementation',
        estimatedMinutes: 600,
        completedMinutes: 0,
        status: 'pending'
      },
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'testing',
        estimatedMinutes: 180,
        completedMinutes: 0,
        status: 'pending'
      },
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'presentation',
        estimatedMinutes: 180,
        completedMinutes: 0,
        status: 'pending'
      }
    ]
  },
  {
    title: 'Shakespeare Comparative Essay',
    type: 'essay',
    subject: 'English Literature',
    description: 'Compare and contrast themes in Hamlet and Macbeth. 5 pages, MLA format, minimum 6 scholarly sources.',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    estimatedHours: 8,
    status: 'active',
    phases: [
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'research',
        estimatedMinutes: 180,
        completedMinutes: 180,
        status: 'completed'
      },
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'drafting',
        estimatedMinutes: 240,
        completedMinutes: 60,
        status: 'in_progress'
      },
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'revision',
        estimatedMinutes: 60,
        completedMinutes: 0,
        status: 'pending'
      }
    ]
  },
  {
    title: 'Organic Chemistry Exam Prep',
    type: 'exam',
    subject: 'Chemistry',
    description: 'Comprehensive exam covering chapters 8-12: reactions, mechanisms, synthesis.',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    estimatedHours: 12,
    status: 'active',
    phases: [
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'review',
        estimatedMinutes: 360,
        completedMinutes: 0,
        status: 'pending'
      },
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'practice',
        estimatedMinutes: 300,
        completedMinutes: 0,
        status: 'pending'
      },
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'memorization',
        estimatedMinutes: 60,
        completedMinutes: 0,
        status: 'pending'
      }
    ]
  },
  {
    title: 'Data Structures Problem Set',
    type: 'other',
    subject: 'Computer Science',
    description: 'Binary trees, heaps, and graph algorithms. 8 problems with time complexity analysis.',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    estimatedHours: 6,
    status: 'active',
    phases: [
      {
        phaseId: new ObjectId().toString(),
        phaseName: 'practice',
        estimatedMinutes: 360,
        completedMinutes: 240,
        status: 'in_progress'
      }
    ]
  }
];

const SAMPLE_TASKS = (assignmentId, phases) => {
  const tasks = [];

  // Generate tasks based on assignment type
  phases.forEach((phase, phaseIdx) => {
    const taskCount = Math.ceil(phase.estimatedMinutes / 60); // 1 task per hour

    for (let i = 0; i < taskCount; i++) {
      tasks.push({
        assignmentId,
        phaseId: phase.phaseId,
        title: `${phase.phaseName.charAt(0).toUpperCase() + phase.phaseName.slice(1)} Session ${i + 1}`,
        description: `Work on ${phase.phaseName} phase`,
        estimatedMinutes: 60,
        status: i === 0 && phase.completedMinutes > 0 ? 'completed' :
                i === 1 && phase.status === 'in_progress' ? 'in_progress' : 'pending',
        scheduledStart: null,
        scheduledEnd: null,
        completedAt: i === 0 && phase.completedMinutes > 0 ? new Date() : null,
        calendarEventId: null,
        dependencies: [],
        order: i
      });
    }
  });

  return tasks;
};

const SAMPLE_CHAT_HISTORY = (userId) => [
  {
    userId,
    role: 'user',
    content: 'Hi! I need help organizing my study schedule.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  {
    userId,
    role: 'assistant',
    content: 'Hi! I\'m SteadyStudy, your AI study planning assistant. I can help you break down assignments, find time in your calendar, and create a realistic study schedule. What assignments do you have coming up?',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5000)
  },
  {
    userId,
    role: 'user',
    content: 'I have a machine learning final project due in 2 weeks. It\'s a big one.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30000)
  },
  {
    userId,
    role: 'assistant',
    content: 'Great! I\'ve created your Machine Learning Final Project assignment. I\'ve broken it down into 4 phases:\n\n1. **Research** (4 hours) - Understanding requirements and gathering resources\n2. **Implementation** (10 hours) - Building and training your model\n3. **Testing** (3 hours) - Evaluating model performance\n4. **Presentation** (3 hours) - Preparing your final presentation\n\nI\'ve scheduled study sessions in your calendar based on your available times. You can drag them around if you need to reschedule!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 35000)
  },
  {
    userId,
    role: 'user',
    content: 'That looks great! I also have a Shakespeare essay due next week.',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
  },
  {
    userId,
    role: 'assistant',
    content: 'Perfect! I\'ve added your Shakespeare Comparative Essay. This one I\'ve broken into:\n\n1. **Research** (3 hours) - Reading and finding sources\n2. **Drafting** (4 hours) - Writing your essay\n3. **Revision** (1 hour) - Editing and proofreading\n\nI\'ve found time slots that don\'t conflict with your ML project sessions. Your schedule is looking manageable!',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000 + 5000)
  }
];

const SAMPLE_PREFERENCES = {
  studyTimes: {
    morning: true,    // 8am-12pm
    midday: true,     // 12pm-5pm
    evening: false    // 5pm-10pm
  },
  availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
  deadlineBuffer: 2, // Days before deadline to finish
  subjectDifficulty: {
    'computer_science': 4,
    'english_literature': 2,
    'chemistry': 3,
    'mathematics': 4
  },
  maxSessionLength: 120,
  minSessionLength: 30
};

async function seedDatabase(userEmail) {
  console.log('🌱 Starting demo data seeding...\n');

  let client;

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    console.log('✅ Connected!\n');

    // Find user
    console.log(`🔍 Finding user: ${userEmail}`);
    const user = await db.collection('users').findOne({ email: userEmail });

    if (!user) {
      console.error(`❌ User not found: ${userEmail}`);
      console.log('\n💡 Tip: Create the user account first by signing up in the app.');
      process.exit(1);
    }

    const userId = user._id;
    console.log(`✅ Found user: ${user.name} (${userId})\n`);

    // Clear existing demo data
    console.log('🧹 Clearing existing demo data...');
    await db.collection('assignments').deleteMany({ userId });
    await db.collection('tasks').deleteMany({ userId });
    await db.collection('chat_history').deleteMany({ userId });
    await db.collection('user_preferences').deleteMany({ userId });
    console.log('✅ Cleared!\n');

    // Seed assignments
    console.log('📚 Seeding assignments...');
    const assignmentResults = [];

    for (const assignment of SAMPLE_ASSIGNMENTS) {
      const assignmentData = {
        ...assignment,
        userId,
        createdAt: new Date()
      };

      const result = await db.collection('assignments').insertOne(assignmentData);
      assignmentResults.push({
        id: result.insertedId,
        title: assignment.title,
        phases: assignment.phases
      });

      console.log(`  ✅ ${assignment.title}`);
    }
    console.log(`✅ Created ${assignmentResults.length} assignments\n`);

    // Seed tasks
    console.log('📝 Seeding tasks...');
    let totalTasks = 0;

    for (const { id, title, phases } of assignmentResults) {
      const tasks = SAMPLE_TASKS(id, phases);

      // Add userId to each task
      const tasksWithUser = tasks.map(task => ({
        ...task,
        userId,
        createdAt: new Date()
      }));

      if (tasksWithUser.length > 0) {
        await db.collection('tasks').insertMany(tasksWithUser);
        totalTasks += tasksWithUser.length;
        console.log(`  ✅ ${title}: ${tasksWithUser.length} tasks`);
      }
    }
    console.log(`✅ Created ${totalTasks} tasks\n`);

    // Seed chat history
    console.log('💬 Seeding chat history...');
    const chatHistory = SAMPLE_CHAT_HISTORY(userId);

    if (chatHistory.length > 0) {
      await db.collection('chat_history').insertMany(chatHistory);
      console.log(`✅ Created ${chatHistory.length} chat messages\n`);
    }

    // Seed preferences
    console.log('⚙️  Seeding user preferences...');
    const preferences = {
      ...SAMPLE_PREFERENCES,
      userId,
      updatedAt: new Date()
    };

    await db.collection('user_preferences').insertOne(preferences);
    console.log('✅ Created user preferences\n');

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('🎉 Demo data seeded successfully!');
    console.log('═══════════════════════════════════════\n');

    console.log('📊 Summary:');
    console.log(`   👤 User: ${user.name} (${userEmail})`);
    console.log(`   📚 Assignments: ${assignmentResults.length}`);
    console.log(`   📝 Tasks: ${totalTasks}`);
    console.log(`   💬 Chat messages: ${chatHistory.length}`);
    console.log(`   ⚙️  Preferences: Set\n`);

    console.log('🚀 Ready for demo!');
    console.log('   1. Start your servers (frontend + backend)');
    console.log('   2. Log in with:', userEmail);
    console.log('   3. Show off your project!\n');

    console.log('💡 Pro tips:');
    console.log('   - Connect Google Calendar for full demo');
    console.log('   - Try asking the AI about assignments');
    console.log('   - Drag calendar events to show rescheduling');
    console.log('   - Point out the progress on assignments\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('👋 Disconnected from MongoDB');
    }
  }
}

// Run script
if (require.main === module) {
  const userEmail = process.argv[2];

  if (!userEmail) {
    console.error('❌ Error: User email required\n');
    console.log('Usage:');
    console.log('  node scripts/seed-demo-data.js <user_email>\n');
    console.log('Example:');
    console.log('  node scripts/seed-demo-data.js demo@studyautopilot.com\n');
    process.exit(1);
  }

  if (!MONGODB_URI) {
    console.error('❌ Error: MONGODB_URI not found in .env.local\n');
    console.log('Please set up your .env.local file with MongoDB connection string.');
    process.exit(1);
  }

  seedDatabase(userEmail);
}

module.exports = { seedDatabase };
