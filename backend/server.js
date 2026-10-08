const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: true,
  credentials: true
}));
app.options('*', cors());
app.use(express.json());

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/loans',         require('./routes/loans'));
app.use('/api/expenses',      require('./routes/expenses'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/ai',            require('./routes/ai'));   // ← AI chatbot route

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Loan Tracker API is running' });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../frontend/dist');
  app.use(express.static(frontendDist));

  app.get('*', (req, res) => {
    const indexPath = path.resolve(frontendDist, 'index.html');
    if (require('fs').existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.json({ status: 'OK', message: 'Loan Tracker API is running' });
    }
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🤖 AI Chatbot enabled at /api/ai/chat`);
});

// Connect to MongoDB
const connectDB = async () => {
  let uri = process.env.MONGO_URI;
  if (uri) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`✅ MongoDB connected successfully to ${uri}`);
      return;
    } catch (err) {
      console.error(`⚠️ Cloud MONGO_URI connection failed: ${err.message}. Falling back to in-memory DB...`);
    }
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log(`✅ MongoDB Memory Server connected successfully at ${uri}`);

    const seed = require('./seed');
    await seed();
  } catch (err) {
    console.error('❌ Failed to start MongoDB database:', err.message);
  }
};

connectDB().then(() => {
  cron.schedule('0 9 * * *', async () => {
    const { checkEmiReminders } = require('./controllers/notificationController');
    await checkEmiReminders();
  });
});

module.exports = app;

