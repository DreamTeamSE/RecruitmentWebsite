import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './api/routes/routes';

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: '.env.local' });
} else if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced CORS configuration for mixed content scenarios
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3000', 
    'https://main.d1d64zijwu2pjz.amplifyapp.com',
    'https://djv0v2xedq0s9.cloudfront.net',
    'https://d2oc9fk5wyihzt.cloudfront.net',
    /\.amplifyapp\.com$/,
    /\.cloudfront\.net$/
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security headers to help with mixed content
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api', router);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
