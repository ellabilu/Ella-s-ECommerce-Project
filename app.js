import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import bcrypt from 'bcrypt';
import flash from 'connect-flash';
import configurePassport from './config/passport.js';

import Customer from './models/Customer.js';
import Product from './models/Product.js';

import dotenv from 'dotenv'; 
dotenv.config({ path: 'process.env' });

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

configurePassport(passport); // Configuring passport

// Session setup
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URL })
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Connect-flash setup
app.use(flash());

// Middleware to make flash messages available to all views
app.use((req, res, next) => {
    res.locals.flashMessages = req.flash();
    next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

// Define routes
import routes from './routes/routes.js'; 
app.use('/', routes);

const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});



// Function to get the sorting query based on sortType
function getSortQuery(sortType) {
  switch (sortType) {
    case 'priceAsc':
      return { price: 1 };
    case 'priceDesc':
      return { price: -1 };
    case 'stockAsc':
      return { stock: 1 };
    case 'stockDesc':
      return { stock: -1 };
    case 'nameAsc':
      return { name: 1 };
    case 'nameDesc':
      return { name: -1 };
    default:
      return {}; // Default to no sorting
  }
}

app.post('/api/products', async (req, res) => {
  const { name, sortType, minPrice, maxPrice } = req.body;

  // Log the received values to check if they are correct
  console.log('Received request with parameters:', { name, sortType, minPrice, maxPrice });

  let query = {};

  if (name) {
    query.name = { $regex: name, $options: 'i' }; // Case-insensitive search
  }

  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) {
      query.price.$gte = parseInt(minPrice);
    }
    if (maxPrice) {
      query.price.$lte = parseInt(maxPrice);
    }
  }

  try {
    const sortQuery = getSortQuery(sortType);
    console.log('Sorting query:', sortQuery); // Add this line to log the sort query
    const products = await Product.find(query).sort(sortQuery);
    console.log('Fetched products:', products); // Add this line to log the fetched products
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send(error);
  }
});

